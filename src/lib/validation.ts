import { z } from 'zod';

/**
 * Validation schemas for database operations
 * These schemas ensure data integrity and prevent injection attacks
 */

// Maximum sizes for JSONB and text fields
const MAX_JSONB_SIZE = 50000; // 50KB for analysis results
const MAX_TEXT_LENGTH = 200;
const MAX_WELFARE_CATEGORY = 100;

export const scanInsertSchema = z.object({
  product_name: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
  welfare_category: z.string().trim().max(MAX_WELFARE_CATEGORY),
  analysis_result: z.object({}).passthrough().refine(
    (val) => JSON.stringify(val).length < MAX_JSONB_SIZE,
    'Analysis data too large'
  )
});

export const userPreferencesSchema = z.object({
  ethical_lens: z.enum(['strict', 'balanced', 'lenient']).optional(),
  preferred_language: z.string().trim().min(2).max(10).optional(),
  preferred_region: z.string().trim().max(100).optional(),
  anonymous_usage: z.boolean().optional(),
  notifications_enabled: z.boolean().optional(),
});

export type ScanInsert = z.infer<typeof scanInsertSchema>;
export type UserPreferencesUpdate = z.infer<typeof userPreferencesSchema>;
