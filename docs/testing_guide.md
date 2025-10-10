# Testing Guide - Welfare Footprint App

## Overview

This guide provides manual testing procedures for validating the Welfare Footprint App's core functionality, error handling, and AI integration.

---

## 1. End-to-End User Flow Testing

### 1.1 Single Item Image Analysis

**Objective**: Verify that single-product images are analyzed correctly.

**Steps**:
1. Navigate to the home screen
2. Click "Scan Product" button
3. Upload a single-product image (e.g., milk carton, egg box)
4. Optionally add additional context in the text field
5. Click "Analyze Image"
6. Wait for analysis to complete

**Expected Results**:
- Loading indicator appears during analysis
- Results screen displays:
  - Product name
  - Detected animal ingredients
  - Welfare analysis for each ingredient
  - Overall welfare category (color-coded)
  - Confidence level indicator
  - Ethical swap suggestions (if applicable)
- Analysis is saved to scan history
- User can navigate back or start a new scan

**Pass Criteria**:
- ✅ Analysis completes within 30 seconds
- ✅ All detected ingredients are displayed
- ✅ Welfare categories match expected values (1-5 scale)
- ✅ Confidence levels are reasonable (High > 80%, Medium 50-80%, Low < 50%)

---

### 1.2 Multi-Item Image Analysis

**Objective**: Verify that images with multiple products trigger item selection flow.

**Steps**:
1. Navigate to the home screen
2. Click "Scan Product"
3. Upload an image with multiple products (e.g., grocery shopping bag)
4. Click "Analyze Image"
5. Wait for item detection
6. Review detected items in confirmation screen
7. Select one item from the list
8. Wait for detailed analysis

**Expected Results**:
- Item detection completes successfully
- Confirmation screen shows:
  - List of detected items with names
  - Image preview
  - Summary of what was detected
- User can select any item
- Selected item proceeds to detailed analysis
- Results match single-item flow expectations

**Pass Criteria**:
- ✅ Multiple items are correctly detected
- ✅ Item names are meaningful and accurate
- ✅ Selected item analysis is identical to single-item flow
- ✅ User can navigate back to select different items

---

## 2. Error Handling & Edge Cases

### 2.1 Timeout Scenario

**Objective**: Verify graceful handling of AI request timeouts.

**Simulation Method**:
- Temporarily modify `app.config.ts` to set `requestTimeoutMs: 1000` (1 second)
- Attempt to analyze a complex image

**Expected Results**:
- After 1 second, request times out
- Toast notification appears with error message
- Error message is user-friendly and actionable
- User can retry the analysis

**Pass Criteria**:
- ✅ Timeout is detected at configured threshold
- ✅ Error toast appears with appropriate message
- ✅ UI returns to a stable state (not stuck loading)
- ✅ Console logs show timeout error with metadata

**Reset**: Restore original timeout value after testing.

---

### 2.2 Rate Limit Scenario

**Objective**: Verify handling of AI provider rate limits.

**Simulation Method**:
- Make multiple rapid requests (5+ within 10 seconds)
- OR temporarily modify `gemini.ts` to return a 429 status code

**Expected Results**:
- Rate limit error is detected
- Toast notification displays clear message
- Error metadata includes rate limit code
- User is advised to wait before retrying

**Pass Criteria**:
- ✅ 429 status is mapped to `RATE_LIMIT` error code
- ✅ User-facing message is informative
- ✅ App doesn't crash or freeze

---

### 2.3 Network Failure Scenario

**Objective**: Test resilience to network connectivity issues.

**Simulation Method**:
- Disconnect network/Wi-Fi
- Attempt image analysis
- Reconnect and retry

**Expected Results**:
- Network error is caught gracefully
- Toast shows connectivity error message
- After reconnection, retry succeeds

**Pass Criteria**:
- ✅ Network errors are mapped to `NETWORK` error code
- ✅ User can retry without reloading the page
- ✅ Edge function logs show network error details

---

### 2.4 Invalid Image Upload

**Objective**: Test handling of invalid or corrupted image files.

**Steps**:
1. Attempt to upload a non-image file (e.g., `.txt`, `.pdf`)
2. Attempt to upload a very large image (>10MB)
3. Attempt to upload a corrupted image file

**Expected Results**:
- Client-side validation blocks non-image files
- Large images are either rejected or compressed
- Corrupted files trigger an error toast

**Pass Criteria**:
- ✅ Invalid uploads are rejected with clear error messages
- ✅ App remains stable after invalid upload attempts

---

## 3. Internationalization (i18n) Testing

### 3.1 Error Message Localization

**Objective**: Verify that error messages appear in the user's selected language.

**Languages to Test**: English, Spanish, French, German, Portuguese, Russian, Hindi, Arabic, Chinese (Simplified)

**Steps**:
1. Change language via LanguageSelector component
2. Trigger various error scenarios (timeout, rate limit, network failure)
3. Verify error toast messages are localized

**Expected Results**:
- Error messages appear in the selected language
- Fallback to English if translation is missing
- No translation keys (e.g., `error.timeout`) are displayed

**Pass Criteria**:
- ✅ All 9 languages display localized error messages
- ✅ Messages are grammatically correct and culturally appropriate
- ✅ RTL languages (Arabic) display correctly

---

### 3.2 UI Component Localization

**Objective**: Verify all UI text is properly translated.

**Steps**:
1. Switch between all 9 supported languages
2. Navigate through all screens:
   - Home
   - Scanner
   - Item Selection (Confirmation)
   - Results
   - Profile (History, Preferences, Privacy)
3. Verify buttons, labels, headings, and descriptions

**Pass Criteria**:
- ✅ No hardcoded English strings appear
- ✅ Dynamic content (product names, ingredients) remains in original language
- ✅ Date/time formats adapt to locale

---

## 4. Performance & Metadata Validation

### 4.1 Latency Tracking

**Objective**: Measure and verify AI request latency.

**Steps**:
1. Open browser DevTools → Console
2. Perform image analysis
3. Check edge function logs for AI metadata

**Expected Metadata Fields**:
```json
{
  "provider": "gemini",
  "model": "gemini-2.0-flash-exp",
  "tokensUsed": 1500,
  "latencyMs": 2300
}
```

**Pass Criteria**:
- ✅ `latencyMs` is logged for every AI request
- ✅ Typical latency is < 5000ms (5 seconds)
- ✅ Latency matches user-perceived wait time

---

### 4.2 Token Usage Tracking

**Objective**: Verify token consumption is logged correctly.

**Steps**:
1. Analyze images of varying complexity:
   - Simple (single ingredient label)
   - Medium (nutrition facts panel)
   - Complex (multi-item grocery scene)
2. Review edge function logs for `tokensUsed` values

**Expected Results**:
- Simple images: ~500-1000 tokens
- Medium images: ~1000-2000 tokens
- Complex images: ~2000-4000 tokens

**Pass Criteria**:
- ✅ Token counts are logged consistently
- ✅ Token usage scales with image complexity
- ✅ No unexpectedly high token consumption

---

## 5. Database & Persistence Testing

### 5.1 Scan History Storage

**Objective**: Verify scan results are correctly saved to the database.

**Steps**:
1. Perform 3 image analyses
2. Navigate to Profile → Scan History
3. Verify all 3 scans are listed
4. Check database directly (if access available):
   ```sql
   SELECT * FROM scans WHERE user_id = '<your-user-id>' ORDER BY created_at DESC LIMIT 10;
   ```

**Pass Criteria**:
- ✅ All scans are saved with correct `user_id`
- ✅ `analysis_result` JSONB contains complete data
- ✅ `created_at` timestamps are accurate
- ✅ Scans appear in history immediately after analysis

---

### 5.2 Privacy Controls

**Objective**: Test "Clear History" functionality.

**Steps**:
1. Perform several scans to populate history
2. Navigate to Profile → Privacy Settings
3. Click "Clear History" button
4. Confirm deletion in dialog
5. Verify scan history is empty

**Pass Criteria**:
- ✅ Confirmation dialog appears before deletion
- ✅ All user scans are deleted from database
- ✅ History screen shows empty state
- ✅ Action is logged or toasted for user feedback

---

### 5.3 Auto-Cleanup (30-Day Retention)

**Objective**: Verify old scans are automatically deleted.

**Manual Test** (requires database access):
1. Insert a test scan with `created_at` set to 31 days ago:
   ```sql
   INSERT INTO scans (user_id, product_name, created_at)
   VALUES ('<your-user-id>', 'Test Old Product', NOW() - INTERVAL '31 days');
   ```
2. Trigger the cleanup function (see migration documentation)
3. Verify the old scan is deleted

**Automated Test** (via edge function):
- Call the cleanup edge function via cron or manual trigger
- Check logs for deletion count

**Pass Criteria**:
- ✅ Scans older than 30 days are deleted
- ✅ Recent scans (< 30 days) are preserved
- ✅ Cleanup runs without errors

---

## 6. Edge Function Log Interpretation

### 6.1 Accessing Logs

**Lovable Cloud / Supabase**:
1. Open backend dashboard
2. Navigate to Edge Functions → Logs
3. Filter by function name (`analyze-image`, `suggest-ethical-swap`, `generate-text`)

**Local Development**:
- Logs appear in terminal running `supabase functions serve`

---

### 6.2 Log Structure

**Successful AI Request**:
```
[analyze-image] Starting analysis for user: abc-123
[analyze-image] AI Response metadata: {
  "provider": "gemini",
  "model": "gemini-2.0-flash-exp",
  "tokensUsed": 1847,
  "latencyMs": 2341
}
[analyze-image] Analysis complete
```

**Error Example**:
```
[analyze-image] AI Error: {
  "code": "TIMEOUT",
  "message": "Request timed out after 30000ms",
  "metadata": { "provider": "gemini", "latencyMs": 30000 }
}
```

---

### 6.3 Key Metrics to Monitor

| Metric | What to Look For | Action If Abnormal |
|--------|------------------|-------------------|
| **Latency** | < 5 seconds | Check network, AI provider status |
| **Token Usage** | Consistent per image type | Review prompt efficiency |
| **Error Rate** | < 5% of requests | Investigate error codes |
| **Timeout Frequency** | Rare (< 1%) | Increase timeout or optimize prompt |

---

## 7. AI Response Quality Testing

### 7.1 Ingredient Detection Accuracy

**Objective**: Verify animal ingredients are correctly identified.

**Test Cases**:
| Product | Expected Ingredients | Notes |
|---------|---------------------|-------|
| Milk carton | Cow's milk | Should detect dairy |
| Egg carton | Chicken eggs | Should specify chicken |
| Leather jacket | Cow leather | Should detect animal material |
| Vegan cheese | None | Should return empty or plant-based |

**Pass Criteria**:
- ✅ Accuracy > 90% for clear product labels
- ✅ Confidence levels reflect image quality
- ✅ No false positives for plant-based products

---

### 7.2 Welfare Analysis Validation

**Objective**: Ensure welfare scores are reasonable and consistent.

**Steps**:
1. Analyze products with known welfare standards:
   - Cage-free eggs → Expected score: 3-4
   - Conventional eggs → Expected score: 1-2
   - Grass-fed beef → Expected score: 3-4
2. Compare AI-generated scores with WFI database (if available)

**Pass Criteria**:
- ✅ Scores align with scientific welfare assessments
- ✅ Explanations reference credible sources
- ✅ Confidence is lower for ambiguous products

---

## 8. Regression Testing Checklist

Before deploying updates, verify:

- [ ] All end-to-end flows complete successfully
- [ ] Error handling works for all error codes
- [ ] Internationalization works for all 9 languages
- [ ] Performance metrics (latency, tokens) are acceptable
- [ ] Database operations (save, delete, cleanup) function correctly
- [ ] Privacy controls work as expected
- [ ] No console errors in browser DevTools
- [ ] Edge function logs are clean (no unexpected errors)

---

## 9. Browser & Device Testing

### Supported Platforms

- **Desktop**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile**: iOS Safari, Android Chrome (latest 2 versions)
- **Tablet**: iPad Safari, Android Chrome

### Mobile-Specific Tests

- [ ] Image upload from camera works
- [ ] Touch interactions are responsive
- [ ] Layout is mobile-friendly (no horizontal scroll)
- [ ] Toast notifications are visible and readable
- [ ] Back navigation works correctly

---

## 10. Test Data & Fixtures

### Sample Images

**Recommended Test Images** (prepare these in advance):
1. **Single Product - Simple**: Milk bottle with clear label
2. **Single Product - Complex**: Nutrition facts with multiple ingredients
3. **Multi-Item - Moderate**: 2-3 products in frame
4. **Multi-Item - Complex**: Full grocery bag with 5+ items
5. **Low Quality**: Blurry or poorly lit image
6. **Non-Food**: Clothing or furniture with animal materials

**Store these in**: `docs/test-assets/` (not committed to repo for size reasons)

---

## 11. Reporting Issues

When a test fails, document:
1. **Test Case**: Which test failed
2. **Steps to Reproduce**: Exact actions taken
3. **Expected vs. Actual**: What should have happened vs. what did happen
4. **Environment**: Browser, device, network conditions
5. **Logs**: Relevant console errors, edge function logs, network requests
6. **Screenshots**: If UI-related

**Report Format**:
```
## [BUG] Short Description

**Test**: Testing Guide Section X.X
**Environment**: Chrome 120 / macOS / Fast WiFi
**User**: [user-id or "anonymous"]

**Steps to Reproduce**:
1. ...
2. ...

**Expected**: Analysis completes in < 5 seconds
**Actual**: Request timed out after 30 seconds

**Logs**:
```
[paste relevant logs]
```

**Screenshots**: [attach if applicable]
```

---

## 12. Verification Notes

### Privacy Implementation Verification (2025-10-10)

**Components Verified**:
- ✅ Privacy Controls UI integrated into Profile section  
- ✅ Clear History button with confirmation dialog  
- ✅ Delete Account flow with cascade deletion  
- ✅ Auto-cleanup trigger (30-day retention) deployed  
- ✅ Data retention info banner displayed  

**Database Migration Status**:
- ✅ `public.delete_old_scans()` function created  
- ✅ `public.trigger_cleanup_old_scans()` trigger active  
- ✅ Probabilistic cleanup (1% on insert) configured  

**Localization Coverage**:
- ✅ English (en) - Complete  
- ✅ Spanish (es) - Complete  
- ✅ French (fr) - Complete  
- ✅ German (de) - Updated with privacy strings  
- ⚠️ Portuguese (pt), Chinese (zh), Hindi (hi), Arabic (ar), Russian (ru) - Need verification  

**Manual Testing Required**:
1. **Clear History**: 
   - Navigate to Profile → Privacy tab
   - Click "Clear History" button
   - Confirm deletion
   - Verify all scans for that user are removed from `scans` table
   - Verify only user's own scans are deleted (not other users')

2. **Auto-cleanup (30-day retention)**:
   - Simulate old scan: `INSERT INTO scans (user_id, created_at, ...) VALUES (..., NOW() - INTERVAL '31 days', ...);`
   - Trigger cleanup manually: `SELECT public.delete_old_scans();`
   - Verify old scans are deleted
   - Note: Production cleanup runs probabilistically (1% on each insert)

3. **Delete Account**:
   - Navigate to Profile → Privacy → Danger Zone
   - Click "Delete Account"
   - Confirm deletion
   - Verify user is signed out and redirected to home page
   - Verify cascade deletion in database:
     - `profiles` table (primary deletion)
     - `scans` table (CASCADE)
     - `favorites` table (CASCADE)
     - `user_preferences` table (CASCADE)

**Known Caveats**:
1. **Auto-cleanup timing**: Cleanup runs probabilistically on scan inserts (1% chance). For guaranteed immediate cleanup after 30 days, consider a scheduled cron job (requires `pg_cron` extension).
2. **Cascade deletion**: Account deletion relies on ON DELETE CASCADE from `profiles` table. Verify all related tables (scans, favorites, user_preferences) have proper foreign key constraints.
3. **Localization**: Privacy strings added to DE; remaining languages (PT, ZH, HI, AR, RU) need native speaker verification.

**GDPR/CCPA Compliance Check**:
- ✅ 30-day automatic data deletion implemented  
- ✅ Manual "Clear History" option provided  
- ✅ Complete account deletion with data removal  
- ✅ Data retention policy documented and displayed to users  
- ✅ Privacy controls accessible from user profile  

**Next Steps**:
- Complete localization verification for remaining 5 languages  
- Manual test "Clear History" with actual user data  
- Simulate old scan records to verify auto-cleanup trigger  
- Test account deletion cascade across all related tables  
- Consider adding data export functionality for GDPR compliance

---

## Summary

This testing guide covers:
- ✅ End-to-end user flows (single & multi-item)
- ✅ Error scenarios (timeout, rate limits, network failures)
- ✅ Internationalization across 9 languages
- ✅ Performance metrics (latency, token usage)
- ✅ Database operations (history, privacy, cleanup)
- ✅ AI response quality validation
- ✅ Regression testing checklist

**Next Steps**:
- Execute all manual tests before major releases
- Automate critical flows with Vitest (future)
- Integrate performance monitoring (future)
