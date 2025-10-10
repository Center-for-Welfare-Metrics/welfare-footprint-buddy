/**
 * Prompt Loader Utility
 * 
 * This utility provides functions to load and process AI prompt templates
 * from the /prompts directory. It supports:
 * - Loading prompts by name
 * - Template variable substitution
 * - Model-agnostic prompt management
 * 
 * Usage:
 *   const prompt = await loadPrompt('detect_items', { 
 *     LANGUAGE: 'en',
 *     USER_CORRECTION: 'This is chicken, not tofu'
 *   });
 */

/**
 * Load a prompt template from the prompts directory
 * 
 * @param promptName - Name of the prompt file (without .txt extension)
 * @returns The raw prompt template as a string
 */
export async function loadPromptTemplate(promptName: string): Promise<string> {
  try {
    // Construct the path to the prompt file in the _shared/prompts directory
    const promptPath = `./prompts/${promptName}.txt`;
    
    // Read the prompt file
    const promptContent = await Deno.readTextFile(promptPath);
    
    return promptContent;
  } catch (error) {
    console.error(`Error loading prompt template '${promptName}':`, error);
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
 * Load a prompt template and substitute variables
 * 
 * This is the main function you'll use to get a ready-to-use prompt.
 * 
 * @param promptName - Name of the prompt file (without .txt extension)
 * @param variables - Object containing variable name-value pairs
 * @returns The processed prompt ready to send to the AI model
 * 
 * @example
 * const prompt = await loadPrompt('detect_items', {
 *   LANGUAGE: 'en',
 *   USER_CORRECTION: 'This is actually tofu, not chicken'
 * });
 */
export async function loadPrompt(
  promptName: string,
  variables: Record<string, string | boolean | undefined> = {}
): Promise<string> {
  const template = await loadPromptTemplate(promptName);
  return substituteVariables(template, variables);
}

/**
 * Extract the actual prompt text from a prompt file
 * 
 * Prompt files contain headers with metadata. This function extracts
 * only the actual prompt text that should be sent to the AI.
 * 
 * @param promptContent - The full content of a prompt file
 * @returns Only the prompt text portion (after the last separator)
 */
export function extractPromptText(promptContent: string): string {
  // Look for the "PROMPT TEXT BEGINS BELOW:" marker
  const marker = 'PROMPT TEXT BEGINS BELOW:';
  const markerIndex = promptContent.indexOf(marker);
  
  if (markerIndex === -1) {
    // If no marker found, assume the entire content is the prompt
    console.warn('No prompt text marker found, using entire file content');
    return promptContent;
  }
  
  // Extract everything after the marker and the following separator line
  const afterMarker = promptContent.substring(markerIndex + marker.length);
  
  // Skip the separator line (=========...)
  const lines = afterMarker.split('\n');
  const promptLines = lines.slice(2); // Skip marker line and separator
  
  return promptLines.join('\n').trim();
}

/**
 * Load a prompt with full processing
 * 
 * This combines loading, extracting the prompt text, and variable substitution.
 * Use this for production code.
 * 
 * @param promptName - Name of the prompt file (without .txt extension)
 * @param variables - Object containing variable name-value pairs
 * @returns The processed prompt ready to send to the AI model
 */
export async function loadAndProcessPrompt(
  promptName: string,
  variables: Record<string, string | boolean | undefined> = {}
): Promise<string> {
  const template = await loadPromptTemplate(promptName);
  const promptText = extractPromptText(template);
  return substituteVariables(promptText, variables);
}
