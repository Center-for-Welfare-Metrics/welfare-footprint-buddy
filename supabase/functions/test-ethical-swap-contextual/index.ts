import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createLogger, getRequestId, getClientIp, jsonSuccessResponse, jsonErrorResponse } from "../_shared/logger.ts";

const logger = createLogger({ functionName: 'test-ethical-swap-contextual' });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TestCase {
  name: string;
  input: {
    PRODUCT_NAME: string;
    ANIMAL_INGREDIENTS: string[];
    ETHICAL_LENS: number;
    OUTPUT_LANGUAGE: string;
    PRIMARY_WELFARE_CONCERN: string;
  };
  expected_behavior: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  issues: string[];
  response?: any;
  reasoning?: string;
}

serve(async (req) => {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);
  const reqLogger = logger.withRequest({ requestId, ip });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    reqLogger.info('Starting contextual focus test suite');

    // Load test cases (with fail-safe for missing file)
    let testCases: TestCase[] = [];
    try {
      const testCasesPath = new URL('../_shared/prompts/tests/suggest_ethical_swap_contextual_focus.test.json', import.meta.url);
      const testCasesText = await Deno.readTextFile(testCasesPath);
      testCases = JSON.parse(testCasesText);
      reqLogger.info('Test cases loaded', { count: testCases.length });
    } catch (err) {
      reqLogger.warn('No test file found, skipping file-based tests');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: TestResult[] = [];

    // Run each test case
    for (const testCase of testCases) {
      reqLogger.info('Running test case', { name: testCase.name });
      
      const result: TestResult = {
        name: testCase.name,
        passed: true,
        issues: [],
      };

      try {
        // Call suggest-ethical-swap function
        const { data, error } = await supabase.functions.invoke('suggest-ethical-swap', {
          body: {
            productName: testCase.input.PRODUCT_NAME,
            animalIngredients: testCase.input.ANIMAL_INGREDIENTS,
            ethicalLens: testCase.input.ETHICAL_LENS,
            outputLanguage: testCase.input.OUTPUT_LANGUAGE,
            primaryWelfareConcern: testCase.input.PRIMARY_WELFARE_CONCERN,
          },
        });

        if (error) {
          result.passed = false;
          result.issues.push(`Function invocation error: ${error.message}`);
          results.push(result);
          continue;
        }

        result.response = data;

        // Validate response structure
        if (!data || !data.suggestions || !Array.isArray(data.suggestions)) {
          result.passed = false;
          result.issues.push('Invalid response structure: missing suggestions array');
          results.push(result);
          continue;
        }

        // Extract reasoning from first suggestion for analysis
        const reasoning = data.suggestions[0]?.reasoning || '';
        result.reasoning = reasoning;

        // Validate based on expected behavior
        const concern = testCase.input.PRIMARY_WELFARE_CONCERN.toLowerCase();

        // Check for primary concern mention
        if (!reasoning.toLowerCase().includes(concern.split(' ')[0]) && 
            !reasoning.toLowerCase().includes(concern.split(' ')[1] || '')) {
          result.passed = false;
          result.issues.push(`Reasoning does not reference primary welfare concern: "${testCase.input.PRIMARY_WELFARE_CONCERN}"`);
        }

        // Lens-specific validation
        if (testCase.input.ETHICAL_LENS <= 2) {
          // Lens 1-2: Should stay within product type
          const forbiddenTerms = ['plant-based', 'vegan', 'vegetarian', 'environmental', 'sustainability', 'climate'];
          const foundForbidden = forbiddenTerms.filter(term => 
            reasoning.toLowerCase().includes(term) || 
            JSON.stringify(data.suggestions).toLowerCase().includes(term)
          );
          
          if (foundForbidden.length > 0) {
            result.passed = false;
            result.issues.push(`Lens ${testCase.input.ETHICAL_LENS} should not mention: ${foundForbidden.join(', ')}`);
          }

          // Check for concern-specific terms
          if (concern.includes('slaughter') || concern.includes('killing')) {
            const hasHumaneKilling = reasoning.toLowerCase().includes('humane') || 
                                    reasoning.toLowerCase().includes('stunning') ||
                                    reasoning.toLowerCase().includes('knife spiking') ||
                                    reasoning.toLowerCase().includes('freezing');
            if (!hasHumaneKilling) {
              result.passed = false;
              result.issues.push('Slaughter concern not addressed with humane killing methods');
            }
          }

          if (concern.includes('handling') || concern.includes('transport')) {
            const hasHandling = reasoning.toLowerCase().includes('handling') || 
                               reasoning.toLowerCase().includes('transport') ||
                               reasoning.toLowerCase().includes('stress');
            if (!hasHandling) {
              result.passed = false;
              result.issues.push('Handling/transport concern not explicitly addressed');
            }
          }

          if (concern.includes('confinement')) {
            const hasConfinement = reasoning.toLowerCase().includes('housing') || 
                                  reasoning.toLowerCase().includes('space') ||
                                  reasoning.toLowerCase().includes('enrichment') ||
                                  reasoning.toLowerCase().includes('natural behavior');
            if (!hasConfinement) {
              result.passed = false;
              result.issues.push('Confinement concern not addressed with housing improvements');
            }
          }

          if (concern.includes('mutilation') || concern.includes('docking') || concern.includes('castration')) {
            const hasMutilation = reasoning.toLowerCase().includes('mutilation') || 
                                 reasoning.toLowerCase().includes('docking') ||
                                 reasoning.toLowerCase().includes('castration') ||
                                 reasoning.toLowerCase().includes('intact');
            if (!hasMutilation) {
              result.passed = false;
              result.issues.push('Mutilation concern not explicitly addressed');
            }
          }
        }

        // Lens 4 (Vegan): Should have plant-based or cultured options
        if (testCase.input.ETHICAL_LENS === 4) {
          const hasAnimalFree = data.suggestions.some((s: any) => 
            s.name?.toLowerCase().includes('plant') ||
            s.name?.toLowerCase().includes('cultured') ||
            s.name?.toLowerCase().includes('vegan') ||
            s.reasoning?.toLowerCase().includes('animal-free')
          );
          
          if (!hasAnimalFree) {
            result.passed = false;
            result.issues.push('Lens 4 (Vegan) should include animal-free alternatives');
          }
        }

        // Validate JSON schema compliance
        for (const suggestion of data.suggestions) {
          if (!suggestion.name || !suggestion.reasoning) {
            result.passed = false;
            result.issues.push('Invalid suggestion structure: missing name or reasoning');
          }
        }

      } catch (error) {
        result.passed = false;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.issues.push(`Test execution error: ${errorMessage}`);
      }

      results.push(result);
      reqLogger.info('Test case completed', { name: testCase.name, passed: result.passed });
    }

    // Generate summary
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.filter(r => !r.passed).length;
    const summary = {
      total: testCases.length,
      passed: passedCount,
      failed: failedCount,
      passRate: `${((passedCount / testCases.length) * 100).toFixed(1)}%`,
    };

    reqLogger.info('Test suite completed', summary);

    return jsonSuccessResponse({
      summary,
      results: results.map(r => ({
        name: r.name,
        passed: r.passed,
        issues: r.issues,
        reasoning: r.reasoning,
      })),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    reqLogger.error('Fatal error in test runner', { error: errorMessage });
    return jsonErrorResponse(500, 'Test runner encountered an error. Please try again.');
  }
});
