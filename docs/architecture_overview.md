# Welfare Footprint App - Architecture Overview

**Last Updated**: 2025-10-10  
**Version**: 1.0

## Table of Contents

1. [Application Purpose](#application-purpose)
2. [Technology Stack](#technology-stack)
3. [High-Level Architecture](#high-level-architecture)
4. [Core Data Flow](#core-data-flow)
5. [Key Components](#key-components)
6. [Backend Services](#backend-services)
7. [AI Integration](#ai-integration)
8. [Configuration & Constants](#configuration--constants)
9. [Internationalization](#internationalization)
10. [Data Models](#data-models)

---

## Application Purpose

The Welfare Footprint App is a React-based web application that enables users to:
- Scan product images using their camera or file upload
- Automatically detect and identify animal-based food products
- Receive detailed welfare analysis based on production systems
- Get ethical alternatives suggestions with configurable sensitivity
- Track scan history and insights (for authenticated users)

The app prioritizes **transparency**, **scientific accuracy**, and **user privacy** in delivering animal welfare information.

---

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system (HSL semantic tokens)
- **UI Components**: Radix UI primitives with shadcn/ui components
- **Routing**: React Router v6
- **State Management**: React hooks (useState, useEffect, useContext)
- **Internationalization**: i18next with 9 language support

### Backend (Lovable Cloud / Supabase)
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Edge Functions**: Deno runtime (for AI calls and backend logic)
- **Storage**: Supabase Storage (for user-uploaded images)

### AI Integration
- **Primary Model**: Google Gemini 2.0 Flash Experimental
- **API**: Gemini REST API (vision-capable)
- **Prompt System**: Model-agnostic text files in `/science_and_ai_prompts` directory

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │   Pages    │  │ Components │  │  Contexts & Hooks    │  │
│  │  - Index   │  │  - Scanner │  │  - AuthContext       │  │
│  │  - Auth    │  │  - Results │  │  - use-toast         │  │
│  │  - Profile │  │  - Home    │  │  - use-mobile        │  │
│  └────────────┘  └────────────┘  └──────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         i18n (9 languages) + Config System             │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Supabase Client
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              Backend (Lovable Cloud / Supabase)              │
│  ┌────────────────────┐  ┌─────────────────────────────┐   │
│  │   Edge Functions   │  │   PostgreSQL Database       │   │
│  │  - analyze-image   │  │  Tables:                    │   │
│  │  - suggest-swap    │  │   - scans                   │   │
│  │  - generate-text   │  │   - profiles (future)       │   │
│  └─────────┬──────────┘  └─────────────────────────────┘   │
│            │                                                  │
│            │ API calls                                       │
│            ▼                                                  │
│  ┌────────────────────┐                                     │
│  │  AI Services       │                                     │
│  │  - Gemini API      │                                     │
│  │  - Prompt Loader   │                                     │
│  └────────────────────┘                                     │
└──────────────────────────────────────────────────────────────┘
```

---

## Core Data Flow

### Image Analysis Pipeline

```
1. User uploads image
   ↓
2. ScannerScreen validates and converts to base64
   ↓
3. Call Edge Function: analyze-image (mode: 'detect')
   ↓
4. AI detects items in image
   ↓
5. ConfirmationScreen shows detected items
   ↓
6. User confirms or edits detection
   ↓
7. ItemSelectionScreen displays all items
   ↓
8. User selects specific item
   ↓
9. Call Edge Function: analyze-image (mode: 'analyze', focusItem)
   ↓
10. AI analyzes selected product
   ↓
11. ResultsScreen displays welfare analysis
   ↓
12. (Optional) User requests ethical alternatives
   ↓
13. Call Edge Function: suggest-ethical-swap
   ↓
14. Display alternative products
```

---

## Key Components

### Screen Components

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| `HomeScreen` | Landing page | Language selection, start scan CTA |
| `ScannerScreen` | Image upload | Camera/file input, preview, challenge box |
| `ConfirmationScreen` | Detection verification | Edit detected items, confirm selection |
| `ItemSelectionScreen` | Multi-item handling | Select specific product from image |
| `ResultsScreen` | Analysis display | Welfare data, confidence meters, alternatives |

### Utility Components

- **UI Components** (`src/components/ui/`): Shadcn/ui primitives (buttons, dialogs, cards, etc.)
- **Profile Components** (`src/components/profile/`): User preferences, history, insights
- **Language Selector**: Persistent language switching (9 languages)

---

## Backend Services

### Edge Functions

#### `analyze-image`
- **Purpose**: Multi-mode AI analysis (detection + analysis)
- **Modes**:
  - `detect`: Identify all food items in image
  - `analyze`: Full welfare analysis of specific item
- **Inputs**: Image data, language, mode, optional focusItem, userCorrection
- **Output**: JSON with product data, welfare concerns, confidence scores

#### `suggest-ethical-swap`
- **Purpose**: Generate ethical alternatives
- **Inputs**: Product name, ingredients, ethical lens level (1-5), language
- **Output**: Alternative products with rationale

#### `generate-text`
- **Purpose**: General-purpose text generation
- **Inputs**: Prompt, language
- **Output**: Generated text response

### Database Tables

#### `scans`
- Stores user scan history
- Fields: `id`, `user_id`, `product_name`, `welfare_category`, `analysis_result`, `image_url`, `created_at`
- RLS enabled (users can only see their own scans)

---

## AI Integration

The Welfare Footprint App uses a **model-agnostic AI Handler** to interact with AI providers. Currently implemented with **Google Gemini 2.0 Flash Experimental**, but designed for easy provider switching.

### AI Handler Architecture

The AI Handler provides a unified interface for all AI interactions:

**Core Components**:
- `supabase/functions/_shared/ai-handler.ts` - Main handler with provider management
- `supabase/functions/_shared/providers/gemini.ts` - Gemini provider implementation
- Type-safe request/response interfaces (`AIRequest`, `AIResponse`, `AIProvider`)
- Consistent error handling and timeout management

**Key Features**:
- ✅ **Provider Independence**: Switch AI providers without changing calling code
- ✅ **Error Handling**: Standardized error codes (`TIMEOUT`, `RATE_LIMIT`, `AUTHENTICATION`, `NETWORK`, etc.)
- ✅ **Timeout Protection**: Built-in 30-second timeout with fallback behavior
- ✅ **Metadata Tracking**: Latency, token usage, provider info for all requests
- ✅ **Type Safety**: Full TypeScript interfaces for requests and responses

**Usage Example**:
```typescript
import { callAI } from '../_shared/ai-handler.ts';

const response = await callAI({
  prompt: 'Analyze this product...',
  imageData: { base64: '...', mimeType: 'image/jpeg' },
  language: 'en',
  timeout: 30000,
});

if (response.success) {
  const text = response.data.text;
  console.log('Latency:', response.metadata.latencyMs);
} else {
  console.error('Error:', response.error.code, response.error.message);
}
```

### Prompt System

All AI prompts are stored in `/science_and_ai_prompts` as version-controlled text files:

- **`detect_items.txt`**: Multi-item detection prompt
- **`analyze_product.txt`**: Comprehensive welfare analysis prompt
- **`analyze_focused_item.txt`**: Focused single-item analysis prompt

### Prompt Loading

The `prompt-loader.ts` utility provides:
- Dynamic prompt loading from files
- Variable substitution (`{{LANGUAGE}}`, `{{FOCUS_ITEM}}`)
- Conditional blocks (`{{#if VARIABLE}}...{{/if}}`)
- Metadata extraction (headers, versioning)

### Adding New AI Providers

To add a new provider (e.g., OpenAI GPT, Claude):

1. Create a provider class implementing `AIProvider` interface in `/supabase/functions/_shared/providers/`
2. Implement the required `call(request: AIRequest)` method
3. Register the provider in edge functions:
   ```typescript
   const newProvider = new OpenAIProvider(apiKey);
   handler.registerProvider(newProvider);
   ```
4. Use by specifying provider name: `callAI(request, 'openai')`

---

## Configuration & Constants

### Centralized Config

All tunable parameters are in `src/config/app.config.ts`:

```typescript
appConfig = {
  ai: { confidenceThresholds, suggestionDebounceMs },
  ui: { imagePreviewHeight, textareaMinRows },
  ethicalLens: { defaultValue, colors (1-5), min/max/step },
  confidenceMeter: { levels (low/medium/high) },
  storage: { maxWelfareCategoryLength },
  api: { functions, modes, requestTimeoutMs }
}
```

**Migration Status** (Phase 1 Complete):
- ✅ All ethical lens colors migrated from hardcoded hex values to config
- ✅ API function names and modes centralized
- ✅ Components (`ResultsScreen`, `ScannerScreen`) now use `appConfig`
- ✅ Consistent color scheme across all UI elements

This eliminates "magic numbers" and provides type-safe configuration access.

---

## Internationalization

### Supported Languages
Arabic (ar), German (de), English (en), Spanish (es), French (fr), Hindi (hi), Portuguese (pt), Russian (ru), Chinese (zh)

### Implementation
- **Library**: i18next + react-i18next
- **Detection**: Browser language detection with fallback to English
- **Persistence**: Language selection stored in localStorage
- **Coverage**: All UI strings, AI responses (via `language` parameter)

### Structure
```
src/i18n/
├── config.ts           # i18n initialization
└── locales/
    ├── en.json
    ├── es.json
    ├── ...
    └── zh.json
```

---

## Data Models

### AnalysisData Interface
```typescript
interface AnalysisData {
  productName?: { value: string; confidence: string };
  hasAnimalIngredients: boolean;
  isFood?: boolean;
  animalIngredients?: { value: string; confidence: string };
  productionSystem?: { value: string; confidence: string; assumption?: string };
  welfareConcerns?: { value: string; confidence: string };
  disclaimer?: string;
}
```

### Confidence Levels
- **Low**: 0-33% certainty (red indicator)
- **Medium**: 34-66% certainty (yellow indicator)
- **High**: 67-100% certainty (green indicator)

### Ethical Lens Scale
1. **Welfare Concerns Only** (#FF6B9D)
2. **Reduced Harm** (#E677B8)
3. **Minimal Animal Suffering** (#C084FC) - Default
4. **High Welfare Standards** (#90B5FB)
5. **No Animal Products** (#60A5FA)

---

## Security & Privacy

- **Authentication**: Supabase Auth with email/password
- **Row-Level Security**: Users can only access their own data
- **Data Storage**: Minimal PII, GDPR/LGPD compliant design
- **Image Handling**: Images not stored server-side (only base64 in client)
- **API Keys**: Stored as environment variables, never exposed to client

---

## Future Enhancements

- **Caching System**: Reduce AI costs for frequently scanned products
- **Enhanced Privacy Controls**: User data export/deletion
- **Model-Agnostic Handler**: Unified interface for multiple AI providers
- **Offline Mode**: Local storage of scan history
- **Advanced Analytics**: Aggregate insights on user behavior

---

## Related Documentation

- **[AI Handler Proposal](./ai-handler-proposal.md)**: Planned abstraction for AI providers
- **[Prompt System Guide](../science_and_ai_prompts/README.md)**: How to use and update prompts
- **[Technical Guide](../Technical_Guide_Welfare_Footprint_App_Updated.md)**: Detailed implementation guide

---

**Maintained by**: Welfare Footprint Institute  
**Contact**: [Add contact info]  
**License**: [Add license]
