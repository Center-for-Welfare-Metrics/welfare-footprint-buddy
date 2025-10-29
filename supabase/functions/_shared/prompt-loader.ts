/**
 * Prompt Loader Utility
 * 
 * This utility provides functions to process AI prompt templates
 * by loading them from markdown files. It supports:
 * - Dynamic loading from /supabase/functions/_shared/prompts/
 * - Template variable substitution
 * - Model-agnostic prompt management
 * 
 * Usage:
 *   const prompt = await loadAndProcessPrompt('analyze_user_material', { 
 *     LANGUAGE: 'en',
 *     USER_CORRECTION: 'This is chicken, not tofu'
 *   });
 */

/**
 * Load a prompt fragment from markdown file
 * 
 * @param fragmentName - Name of the fragment (matches filename without .md extension)
 * @returns The raw fragment template as a string
 */
export async function loadFragment(fragmentName: string): Promise<string> {
  try {
    const path = new URL(`./prompts/fragments/${fragmentName}.md`, import.meta.url).pathname;
    const fragment = await Deno.readTextFile(path);
    
    if (!fragment) {
      console.error(`Fragment '${fragmentName}' is empty`);
      throw new Error(`Empty fragment: ${fragmentName}`);
    }
    
    return fragment;
  } catch (error) {
    console.error(`Failed to load fragment '${fragmentName}':`, error);
    throw new Error(`Failed to load fragment: ${fragmentName}`);
  }
}

/**
 * Load a prompt template from markdown file
 * 
 * @param promptName - Name of the prompt (matches filename without .md extension)
 * @returns The raw prompt template as a string
 */
export async function loadPromptTemplate(promptName: string): Promise<string> {
  try {
    const path = new URL(`./prompts/${promptName}.md`, import.meta.url).pathname;
    const template = await Deno.readTextFile(path);
    
    if (!template) {
      console.error(`Prompt template '${promptName}' is empty`);
      throw new Error(`Empty prompt template: ${promptName}`);
    }
    
    return template;
  } catch (error) {
    console.error(`Failed to load prompt template '${promptName}':`, error);
    throw new Error(`Failed to load prompt template: ${promptName}`);
  }
}

/**
 * Replace template variables in a prompt
 * 
 * Supports two syntaxes:
 * - Simple: {{VARIABLE_NAME}}
 * - Conditional: {{#if VARIABLE_NAME}}...{{/if}}
 * 
 * @param template - The prompt template string
 * @param variables - Object containing variable name-value pairs
 * @returns The processed prompt with variables replaced
 */
export function substituteVariables(
  template: string,
  variables: Record<string, string | boolean | undefined>
): string {
  let result = template;

  // Process conditional blocks first: {{#if VARIABLE}}...{{/if}}
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(conditionalRegex, (match, varName, content) => {
    const value = variables[varName];
    // Include the content if the variable exists and is truthy
    return value ? content : '';
  });

  // Process simple variable substitutions: {{VARIABLE}}
  const variableRegex = /\{\{(\w+)\}\}/g;
  result = result.replace(variableRegex, (match, varName) => {
    const value = variables[varName];
    return value !== undefined ? String(value) : match;
  });

  return result;
}

/**
 * Load a prompt template and substitute variables, including fragment inclusion
 * 
 * This is the main function you'll use to get a ready-to-use prompt.
 * Supports fragment inclusion via {{INCLUDE:fragment_name}} syntax.
 * 
 * @param promptName - Name of the prompt
 * @param variables - Object containing variable name-value pairs
 * @returns The processed prompt ready to send to the AI model
 * 
 * @example
 * const prompt = await loadAndProcessPrompt('analyze_user_material', {
 *   LANGUAGE: 'en',
 *   USER_CORRECTION: 'This is actually tofu, not chicken'
 * });
 */
export async function loadAndProcessPrompt(
  promptName: string,
  variables: Record<string, string | boolean | undefined> = {}
): Promise<string> {
  let template = await loadPromptTemplate(promptName);
  
  // Process fragment includes: {{INCLUDE:fragment_name}}
  const includeRegex = /\{\{INCLUDE:(\w+)\}\}/g;
  const includeMatches = template.matchAll(includeRegex);
  
  for (const match of includeMatches) {
    const fragmentName = match[1];
    try {
      const fragment = await loadFragment(fragmentName);
      template = template.replace(match[0], fragment);
    } catch (error) {
      console.error(`Failed to include fragment '${fragmentName}':`, error);
      // Leave the include directive in place if fragment can't be loaded
    }
  }
  
  return substituteVariables(template, variables);
}
