#!/usr/bin/env -S deno run --allow-read

/**
 * Prompt Sync Validation Script
 * 
 * Compares .md prompt files with embedded strings in prompt-loader.ts
 * to detect desynchronization.
 * 
 * Usage: deno run --allow-read scripts/validate-prompts.ts
 */

const PROMPTS_DIR = "supabase/functions/_shared/prompts";
const PROMPT_LOADER_PATH = "supabase/functions/_shared/prompt-loader.ts";

interface ValidationResult {
  inSync: string[];
  differs: string[];
  onlyInMd: string[];
  onlyInLoader: string[];
}

/**
 * Normalize string for comparison (trim whitespace, normalize line endings)
 */
function normalizeContent(content: string): string {
  return content
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/\s+$/gm, ""); // Remove trailing whitespace from each line
}

/**
 * Extract content from a specific object definition in TypeScript file
 */
function extractObjectContent(
  fileContent: string,
  objectName: "PROMPTS" | "FRAGMENTS"
): Map<string, string> {
  const result = new Map<string, string>();

  // Find the object definition
  const objectPattern = new RegExp(
    `const\\s+${objectName}\\s*=\\s*\\{([^]*?)\\}\\s*as const;`,
    "s"
  );
  const match = fileContent.match(objectPattern);

  if (!match) {
    console.warn(`⚠️  Could not find ${objectName} object in prompt-loader.ts`);
    return result;
  }

  const objectBody = match[1];

  // Extract each key-value pair
  // Pattern to match: key: `content` or key: `content`,
  const entryPattern = /(\w+):\s*`([^`]*(?:`[^`]*)*)`/g;
  let entryMatch;

  while ((entryMatch = entryPattern.exec(objectBody)) !== null) {
    const key = entryMatch[1];
    const value = entryMatch[2];
    result.set(key, value);
  }

  return result;
}

/**
 * Read all .md files from prompts directory
 */
async function readMdFiles(): Promise<Map<string, string>> {
  const mdFiles = new Map<string, string>();

  try {
    for await (const entry of Deno.readDir(PROMPTS_DIR)) {
      if (entry.isFile && entry.name.endsWith(".md") && entry.name !== "README.md") {
        const filePath = `${PROMPTS_DIR}/${entry.name}`;
        const content = await Deno.readTextFile(filePath);
        const promptName = entry.name.replace(/\.md$/, "");
        mdFiles.set(promptName, content);
      }
    }
  } catch (error) {
    console.error(`❌ Error reading prompts directory: ${error.message}`);
    Deno.exit(1);
  }

  return mdFiles;
}

/**
 * Read and parse prompt-loader.ts
 */
async function readPromptLoader(): Promise<{
  prompts: Map<string, string>;
  fragments: Map<string, string>;
}> {
  try {
    const loaderContent = await Deno.readTextFile(PROMPT_LOADER_PATH);
    return {
      prompts: extractObjectContent(loaderContent, "PROMPTS"),
      fragments: extractObjectContent(loaderContent, "FRAGMENTS"),
    };
  } catch (error) {
    console.error(`❌ Error reading prompt-loader.ts: ${error.message}`);
    Deno.exit(1);
  }
}

/**
 * Compare prompts and generate validation report
 */
function validatePrompts(
  mdFiles: Map<string, string>,
  embeddedPrompts: Map<string, string>
): ValidationResult {
  const result: ValidationResult = {
    inSync: [],
    differs: [],
    onlyInMd: [],
    onlyInLoader: [],
  };

  // Check all .md files
  for (const [name, mdContent] of mdFiles.entries()) {
    const normalizedMd = normalizeContent(mdContent);
    const embeddedContent = embeddedPrompts.get(name);

    if (!embeddedContent) {
      result.onlyInMd.push(name);
    } else {
      const normalizedEmbedded = normalizeContent(embeddedContent);
      if (normalizedMd === normalizedEmbedded) {
        result.inSync.push(name);
      } else {
        result.differs.push(name);
      }
    }
  }

  // Check for prompts only in loader
  for (const name of embeddedPrompts.keys()) {
    if (!mdFiles.has(name)) {
      result.onlyInLoader.push(name);
    }
  }

  return result;
}

/**
 * Print validation report
 */
function printReport(result: ValidationResult): void {
  console.log("\n📋 Prompt Synchronization Report\n");
  console.log("=".repeat(50));

  if (result.inSync.length > 0) {
    console.log("\n✅ In Sync:");
    result.inSync.forEach((name) => console.log(`   ✔ ${name}`));
  }

  if (result.differs.length > 0) {
    console.log("\n❌ Content Differs:");
    result.differs.forEach((name) => 
      console.log(`   ✖ ${name}: .md and prompt-loader.ts do not match`)
    );
  }

  if (result.onlyInMd.length > 0) {
    console.log("\n⚠️  Only in .md files (not in prompt-loader.ts):");
    result.onlyInMd.forEach((name) => console.log(`   ! ${name}.md`));
  }

  if (result.onlyInLoader.length > 0) {
    console.log("\n⚠️  Only in prompt-loader.ts (no .md file):");
    result.onlyInLoader.forEach((name) => console.log(`   ! ${name}`));
  }

  console.log("\n" + "=".repeat(50));

  // Summary
  const total = result.inSync.length + result.differs.length + 
                result.onlyInMd.length + result.onlyInLoader.length;
  const issues = result.differs.length + result.onlyInMd.length + 
                 result.onlyInLoader.length;

  console.log(`\n📊 Summary: ${result.inSync.length}/${total} in sync, ${issues} issue(s) found\n`);

  // Exit with appropriate code
  if (issues > 0) {
    console.log("⚠️  Prompts are out of sync. Please review and update as needed.");
    console.log("📖 See docs/prompt_maintenance_guide.md for update workflow.\n");
    Deno.exit(1);
  } else {
    console.log("✨ All prompts are synchronized!\n");
    Deno.exit(0);
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log("🔍 Validating prompt synchronization...\n");

  // Read .md files
  const mdFiles = await readMdFiles();
  console.log(`📄 Found ${mdFiles.size} .md prompt file(s)`);

  // Read prompt-loader.ts
  const { prompts: embeddedPrompts, fragments: embeddedFragments } = 
    await readPromptLoader();
  console.log(`📦 Found ${embeddedPrompts.size} embedded prompt(s) in prompt-loader.ts`);
  console.log(`🧩 Found ${embeddedFragments.size} embedded fragment(s) in prompt-loader.ts`);

  // Validate and report
  const result = validatePrompts(mdFiles, embeddedPrompts);
  printReport(result);
}

// Run validation
if (import.meta.main) {
  main();
}
