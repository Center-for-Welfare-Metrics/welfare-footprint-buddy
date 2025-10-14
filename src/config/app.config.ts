/**
 * Welfare Footprint App Configuration
 * 
 * Centralized configuration for all tunable application parameters.
 * This file provides a single source of truth for constants used throughout the app.
 */

export const appConfig = {
  /**
   * AI-related configuration
   */
  ai: {
    /** Confidence level thresholds for data quality indicators */
    confidenceThresholds: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
    },
    
    /** Debounce delay for AI suggestion updates (in milliseconds) */
    suggestionDebounceMs: 500,
  },

  /**
   * User Interface configuration
   */
  ui: {
    /** Maximum image preview height (in pixels) */
    imagePreviewHeight: 240, // h-60 = 240px
    
    /** Minimum textarea rows for user input */
    textareaMinRows: 5,
    
    /** Challenge box textarea minimum rows */
    challengeTextareaRows: 100, // min-h-[100px]
  },

  /**
   * Ethical Lens slider configuration
   */
  ethicalLens: {
    /** Default slider position (1-5 scale) */
    defaultValue: 3, // "Minimal Animal Suffering"
    
    /** Slider range */
    min: 1,
    max: 5,
    step: 1,
    
    /** Color mapping for each ethical lens level */
    colors: {
      1: '#60A5FA', // Same Product, High Welfare (blue)
      2: '#90B5FB',
      3: '#C084FC', // Minimal Animal Suffering (default)
      4: '#E677B8',
      5: '#FF6B9D', // Plant-Based / Cultured Only (pink/red)
    },
  },

  /**
   * Confidence meter configuration
   */
  confidenceMeter: {
    /** Visual representation of confidence levels */
    levels: {
      low: {
        width: 'w-1/3' as string,
        color: 'bg-red-500' as string,
      },
      medium: {
        width: 'w-2/3' as string,
        color: 'bg-yellow-500' as string,
      },
      high: {
        width: 'w-full' as string,
        color: 'bg-emerald-500' as string,
      },
    },
  },

  /**
   * Storage and data management
   */
  storage: {
    /** Maximum length for welfare category field in database */
    maxWelfareCategoryLength: 100,
  },

  /**
   * API and network configuration
   */
  api: {
    /** Supabase function names */
    functions: {
      analyzeImage: 'analyze-image',
      suggestEthicalSwap: 'suggest-ethical-swap',
      generateText: 'generate-text',
    },
    
    /** Analysis modes */
    modes: {
      detect: 'detect',
      analyze: 'analyze',
    },
    
    /** Request timeout in milliseconds */
    requestTimeoutMs: 30000, // 30 seconds
  },
};

/**
 * Type-safe access to configuration values
 */
export type AppConfig = typeof appConfig;
