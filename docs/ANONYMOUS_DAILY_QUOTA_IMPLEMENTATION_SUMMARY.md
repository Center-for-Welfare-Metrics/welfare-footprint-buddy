# Anonymous Daily Quota Implementation Summary

**Implementation Date**: 2025-01-17  
**Status**: ✅ READY FOR DEVELOPER REVIEW  
**Deployment**: ⚠️ **DO NOT DEPLOY WITHOUT HUMAN REVIEW**

---

## Overview

This implementation adds **backend-enforced daily scan quotas for anonymous users** while keeping all existing monthly quota logic unchanged for authenticated users.

**Key Changes**:
- Anonymous users: 10 free scans per day (UTC) per IP address
- After limit: Must log in to continue
- Backend enforcement: No frontend bypass possible
- Authenticated users: Unchanged (monthly quotas still apply)

---

## Files Created

### 1. Database Migration

**File**: Database migration (auto-applied)

**Content**:
```sql
-- Create anonymous_daily_usage table
CREATE TABLE IF NOT EXISTS public.anonymous_daily_usage (
  ip_address TEXT NOT NULL,
  date TEXT NOT NULL,  -- Format: YYYY-MM-DD (UTC)
  scans_used INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (ip_address, date)
);

-- Add index for cleanup operations
CREATE INDEX IF NOT EXISTS idx_anonymous_daily_usage_date 
  ON public.anonymous_daily_usage(date);

-- RLS: Service role only
ALTER TABLE public.anonymous_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage anonymous usage"
  ON public.anonymous_daily_usage
  FOR ALL
  USING (auth.role() = 'service_role');
```

**Why**: Tracks daily scan usage per IP address for anonymous users.

---

### 2. Anonymous Quota Helper Module

**File**: `supabase/functions/_shared/anonymous-quota.ts`

**Key Functions**:
```typescript
// Get current UTC date in YYYY-MM-DD format
export function getTodayDateUTC(): string;

// Get current scan usage for an IP today
export async function getAnonymousUsage(
  ipAddress: string,
  supabaseClient: SupabaseClient
): Promise<number>;

// Increment scan usage for an IP
export async function incrementAnonymousUsage(
  ipAddress: string,
  supabaseClient: SupabaseClient
): Promise<void>;

// Check if IP has exceeded daily limit (10 scans)
export async function isAnonymousOverLimit(
  ipAddress: string,
  supabaseClient: SupabaseClient
): Promise<boolean>;

// Get remaining scans for an IP today
export async function getAnonymousRemaining(
  ipAddress: string,
  supabaseClient: SupabaseClient
): Promise<number>;
```

**Configuration**:
```typescript
const ANONYMOUS_DAILY_LIMIT = 10; // Change this to adjust the limit
```

**Why**: Provides reusable quota checking logic for all AI functions.

---

## Files Modified

### 3. `supabase/functions/analyze-image/index.ts`

**Changes**:
```typescript
// Added import
import { isAnonymousOverLimit, incrementAnonymousUsage } from '../_shared/anonymous-quota.ts';

// In serve() function, after rate limiter:

// Extract IP address
const ipAddress = req.headers.get("x-real-ip") ??
                  req.headers.get("x-forwarded-for")?.split(',')[0]?.trim() ??
                  "unknown";

// Check anonymous daily quota
if (userId === 'anonymous') {
  const overLimit = await isAnonymousOverLimit(ipAddress, supabaseClient);
  if (overLimit) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'DAILY_LIMIT_REACHED',
          message: "You've reached the free daily limit. Please log in to continue using the scanner.",
          requiresAuth: true
        }
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  await incrementAnonymousUsage(ipAddress, supabaseClient);
}
```

**Why**: Enforces 10 scans/day limit before expensive image analysis AI calls.

---

### 4. `supabase/functions/suggest-ethical-swap/index.ts`

**Changes**: Identical pattern to `analyze-image/index.ts`

**Location**: Lines 8-9 (import), Lines 345-398 (enforcement logic)

**Why**: Prevents anonymous users from bypassing quota by calling swap suggestions directly.

---

### 5. `supabase/functions/enrich-description/index.ts`

**Changes**: Identical pattern to `analyze-image/index.ts`

**Location**: Lines 4-5 (import), Lines 25-72 (enforcement logic)

**Why**: Prevents anonymous users from bypassing quota via text-only input.

---

### 6. `docs/quota_and_rate_limits.md`

**Changes**:
- Updated "Summary" section to reflect new protection level
- Added new section: "Anonymous Daily Quota Enforcement (NEW)"
- Documented database schema, IP extraction logic, error responses
- Explained interaction with existing monthly/hourly systems

**Why**: Comprehensive documentation for developers and maintainers.

---

## Code Change Summary

### Pattern Applied to All 3 AI Functions

**Step 1: Import Helper**
```typescript
import { isAnonymousOverLimit, incrementAnonymousUsage } from '../_shared/anonymous-quota.ts';
```

**Step 2: Extract IP Address**
```typescript
const ipAddress = req.headers.get("x-real-ip") ??
                  req.headers.get("x-forwarded-for")?.split(',')[0]?.trim() ??
                  "unknown";
```

**Step 3: Check & Enforce Quota (after rate limiter, before AI call)**
```typescript
if (userId === 'anonymous') {
  const overLimit = await isAnonymousOverLimit(ipAddress, supabaseClient);
  if (overLimit) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'DAILY_LIMIT_REACHED',
          message: "You've reached the free daily limit. Please log in to continue using the scanner.",
          requiresAuth: true
        }
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  await incrementAnonymousUsage(ipAddress, supabaseClient);
}
```

---

## Behavior Verification

### Test Scenarios

**Scenario 1: Anonymous User - First Scan**
- **Input**: No auth token, IP `192.168.1.100`
- **Expected**: Scan succeeds, `scans_used = 1` in database
- **Verify**: Check `anonymous_daily_usage` table

**Scenario 2: Anonymous User - 10th Scan**
- **Input**: No auth token, IP `192.168.1.100`, already used 9 scans
- **Expected**: Scan succeeds, `scans_used = 10`
- **Verify**: Response includes scan results

**Scenario 3: Anonymous User - 11th Scan**
- **Input**: No auth token, IP `192.168.1.100`, already used 10 scans
- **Expected**: HTTP 429 error with `DAILY_LIMIT_REACHED` code
- **Verify**: Error message prompts login

**Scenario 4: Logged-In Free User - Any Scan**
- **Input**: Valid auth token, any number of scans today
- **Expected**: No daily quota check, uses monthly quota (10/month)
- **Verify**: Scan succeeds regardless of anonymous quota

**Scenario 5: New Day - Reset**
- **Input**: No auth token, IP that hit limit yesterday
- **Expected**: New day = new quota, scan succeeds
- **Verify**: New row in database with today's date

---

## Testing Instructions

### Backend Testing

**1. Test Anonymous Quota Enforcement**

```bash
# Get the Supabase URL and anon key from your project
SUPABASE_URL="https://bnzhymtlxqtwcwwoirdl.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test 1: First anonymous scan (should succeed)
curl -X POST "${SUPABASE_URL}/functions/v1/analyze-image" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "detect",
    "imageData": {
      "base64": "...base64-image...",
      "mimeType": "image/jpeg"
    },
    "language": "en"
  }'

# Test 2: Repeat 10 times to hit limit

# Test 3: 11th scan (should fail with DAILY_LIMIT_REACHED)
```

**2. Check Database State**

```sql
-- View current anonymous usage
SELECT * FROM public.anonymous_daily_usage
ORDER BY last_updated DESC;

-- Check specific IP
SELECT * FROM public.anonymous_daily_usage
WHERE ip_address = '192.168.1.100'
  AND date = '2025-01-17';
```

**3. Test Logged-In User (Should Bypass Anonymous Quota)**

```bash
# Get JWT token from authenticated session
JWT_TOKEN="..."

curl -X POST "${SUPABASE_URL}/functions/v1/analyze-image" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{...}'
# Should succeed even if same IP hit anonymous limit
```

### Frontend Testing

**1. Test Anonymous User Flow**
- Open app in incognito/private window
- Perform 10 scans without logging in
- On 11th scan, verify dialog appears prompting login
- Click "Log in" button → should redirect to `/auth`

**2. Test Logged-In User Flow**
- Log in to app
- Perform multiple scans (should work regardless of anonymous quota)
- Verify monthly quota still applies (10 scans/month for Free tier)

---

## Security Considerations

### ✅ What This Fixes

- **Backend Enforcement**: Anonymous users cannot bypass quota via direct API calls
- **IP-Based Tracking**: Each IP gets independent daily quota
- **Automatic Reset**: Daily limits refresh at midnight UTC
- **Clear Messaging**: Users know they need to log in to continue

### ⚠️ Known Limitations

- **Shared IPs**: Users behind corporate NAT or VPNs share quota
- **VPN Bypass**: Sophisticated users can rotate IPs to reset quota
- **"unknown" Fallback**: Misconfigured proxies create single shared pool
- **Monthly Quotas Still Bypass-able**: Logged-in users can still call API directly to bypass frontend monthly checks

### 🔒 Recommended Future Enhancements

1. **Device Fingerprinting**: Supplement IP tracking with browser fingerprints
2. **CAPTCHA**: Add after repeated limit violations
3. **Progressive Rate Limiting**: Stricter limits after abuse patterns
4. **Backend Monthly Quota Enforcement**: Add checks in AI functions for logged-in users

---

## Rollback Plan

If issues arise, rollback is straightforward:

**1. Revert Edge Function Changes**

```bash
# Remove anonymous quota imports and logic from:
# - supabase/functions/analyze-image/index.ts
# - supabase/functions/suggest-ethical-swap/index.ts
# - supabase/functions/enrich-description/index.ts
```

**2. Remove Helper Module**

```bash
rm supabase/functions/_shared/anonymous-quota.ts
```

**3. Drop Database Table**

```sql
DROP TABLE IF EXISTS public.anonymous_daily_usage;
```

**4. Revert Documentation**

```bash
git checkout docs/quota_and_rate_limits.md
```

---

## Deployment Checklist

⚠️ **WAIT FOR HUMAN REVIEW BEFORE DEPLOYING**

**Pre-Deployment**:
- [ ] Review all code changes
- [ ] Verify test scenarios pass
- [ ] Check database migration applied correctly
- [ ] Confirm frontend error handling works
- [ ] Test with real IP addresses (not localhost)

**Deployment**:
- [ ] Deploy edge functions (automatic on code push)
- [ ] Verify logs show IP extraction working
- [ ] Monitor error rates for new `DAILY_LIMIT_REACHED` errors
- [ ] Check `anonymous_daily_usage` table is populating

**Post-Deployment**:
- [ ] Test anonymous user flow in production
- [ ] Test logged-in user flow in production
- [ ] Monitor database table size (set up cleanup cron job)
- [ ] Watch for unexpected behavior (shared IPs, VPN users)

---

## Configuration

**To Change Anonymous Daily Limit**:

Edit `supabase/functions/_shared/anonymous-quota.ts`:
```typescript
const ANONYMOUS_DAILY_LIMIT = 10; // Change this value
```

Redeploy edge functions (automatic on code push).

---

## Monitoring

**Key Metrics to Track**:
1. Daily anonymous quota hits (how many users hit the limit)
2. Conversion rate (anonymous → signup after hitting limit)
3. Database table size (rows in `anonymous_daily_usage`)
4. Error rate for `DAILY_LIMIT_REACHED` responses

**Recommended Queries**:

```sql
-- Daily stats
SELECT 
  date,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(*) as total_records,
  SUM(scans_used) as total_scans,
  COUNT(CASE WHEN scans_used >= 10 THEN 1 END) as ips_at_limit
FROM public.anonymous_daily_usage
GROUP BY date
ORDER BY date DESC;

-- Today's active IPs
SELECT ip_address, scans_used, last_updated
FROM public.anonymous_daily_usage
WHERE date = CURRENT_DATE
ORDER BY scans_used DESC;
```

---

## Final Notes

**What Was NOT Changed**:
- ✅ Monthly quota system for authenticated users (unchanged)
- ✅ Hourly rate limiter (unchanged)
- ✅ Subscription tiers and Stripe integration (unchanged)
- ✅ Frontend UI components (error handling needs update)
- ✅ Database `scan_usage` table (unchanged)
- ✅ `check-scan-quota` and `increment-scan-usage` functions (unchanged)

**What IS New**:
- ✅ `anonymous_daily_usage` database table
- ✅ `anonymous-quota.ts` helper module
- ✅ Backend quota enforcement in 3 AI functions
- ✅ IP-based tracking for anonymous users
- ✅ `DAILY_LIMIT_REACHED` error code

**Security Linter Warning** (Pre-Existing):
- ⚠️ "Leaked Password Protection Disabled" warning exists
- This is NOT related to this implementation
- Should be addressed separately by security team

---

## Questions or Issues?

Contact the development team before deploying. Review all changes carefully.

**DO NOT DEPLOY WITHOUT HUMAN REVIEW.**
