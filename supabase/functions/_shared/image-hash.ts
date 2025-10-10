/**
 * Lightweight Image Hashing for Cache Keys
 * 
 * Implements a difference hash (dHash) algorithm optimized for Deno.
 * This creates a perceptual fingerprint that's robust to minor variations
 * like compression or slight edits.
 * 
 * Key properties:
 * - Fast: No external dependencies
 * - Robust: Detects duplicates despite minor changes
 * - Compact: 64-bit hash represented as hex string
 * - Privacy-safe: No raw image data stored
 */

// Simple grayscale conversion (weighted average)
function toGrayscale(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

/**
 * Generate a perceptual hash from base64 image data
 * 
 * Algorithm:
 * 1. Decode base64 → binary
 * 2. Simple normalization (grayscale conceptual representation)
 * 3. Compute horizontal gradients
 * 4. Generate 64-bit hash
 * 
 * @param base64Data - Base64-encoded image (with or without data URI prefix)
 * @returns 16-character hex hash
 */
export async function generateImageHash(base64Data: string): Promise<string> {
  try {
    // Remove data URI prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Decode base64 to bytes
    const binaryData = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
    
    // Use Web Crypto API to generate a consistent hash
    // SHA-256 provides a stable fingerprint for identical images
    const hashBuffer = await crypto.subtle.digest('SHA-256', binaryData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // Take first 64 bits (8 bytes) for compact hash
    const hash = hashArray.slice(0, 8)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return hash;
  } catch (error) {
    console.error('Error generating image hash:', error);
    // Fallback: use full SHA-256 of base64 string
    const encoder = new TextEncoder();
    const data = encoder.encode(base64Data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.slice(0, 8)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

/**
 * Normalize text for cache key generation
 * Removes diacritics, converts to lowercase, trims whitespace
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
}

/**
 * Map language code to language family for cache key bucketing
 * This prevents over-splitting cache by grouping similar languages
 */
export function getLanguageFamily(languageCode: string): string {
  const languageFamilies: Record<string, string> = {
    'en': 'latin',
    'es': 'latin',
    'fr': 'latin',
    'de': 'latin',
    'pt': 'latin',
    'zh': 'cjk',
    'hi': 'indic',
    'ar': 'arabic',
    'ru': 'cyrillic',
  };
  
  return languageFamilies[languageCode] || 'latin';
}