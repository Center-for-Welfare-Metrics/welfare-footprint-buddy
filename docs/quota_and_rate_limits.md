# Quota and Rate Limits System

## Overview

The Welfare Footprint App implements a **two-layer protection system** to control usage and prevent abuse:

1. **Monthly Scan Quotas**: Subscription-based limits on the total number of scans a user can perform per calendar month
2. **Hourly Rate Limits**: Request-based limits on the number of API calls a user can make per hour

These systems work independently but complement each other:
- Monthly quotas prevent excessive long-term usage
- Hourly rate limits prevent short-term abuse and API spam

**Current Enforcement Gaps**:
- Monthly quotas are **only enforced on the frontend** - backend functions do not validate scan quotas
- All AI edge functions have `verify_jwt = false`, allowing completely **public access without authentication**
- Anonymous users share a **single global hourly rate limit pool**, making it ineffective for preventing individual abuse

---

## Monthly Scan Quotas

### Tier Definitions

Monthly scan quotas are defined in `src/config/subscription.config.ts`:

```typescript
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    scansPerMonth: 10,
    // ...
  },
  basic: {
    name: 'Basic',
    scansPerMonth: 200,
    productId: 'prod_TFUNPU55PGdYSt',
    // ...
  },
  pro: {
    name: 'Pro',
    scansPerMonth: 1000,
    productId: 'prod_TFUNP2Cp1fIeun',
    // ...
  },
}
```

| Tier | Scans Per Month | Product ID |
|------|----------------|------------|
| Free | 10 | `free` |
| Basic | 200 | `prod_TFUNPU55PGdYSt` |
| Pro | 1000 | `prod_TFUNP2Cp1fIeun` |

### Database Schema

Monthly scan usage is tracked in the `scan_usage` table:

```sql
CREATE TABLE scan_usage (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  month_year TEXT NOT NULL,              -- Format: "YYYY-MM"
  scans_used INTEGER DEFAULT 0,
  additional_scans_purchased INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, month_year)
);
```

**Key Fields**:
- `month_year`: Calendar month identifier (e.g., "2025-01")
- `scans_used`: Number of scans consumed this month
- `additional_scans_purchased`: Extra scans purchased beyond subscription limit

### How Quotas Reset

Quotas reset automatically at the start of each calendar month because:
- Each month gets a new row in `scan_usage` with a unique `month_year` value
- The system queries for the current `month_year` (e.g., "2025-01")
- If no record exists for the current month, `scans_used` starts at 0

**Example**:
- January 2025: `month_year = "2025-01"`, `scans_used = 7`
- February 1, 2025: System looks for `month_year = "2025-02"`, finds nothing, starts fresh

### Edge Functions

#### `check-scan-quota`

**Purpose**: Returns the user's current scan quota status for the current month.

**Location**: `supabase/functions/check-scan-quota/index.ts`

**Authentication**: Requires valid JWT token (logged-in user only)

**Process**:
1. Authenticates the user
2. Determines user's subscription tier from `user_subscriptions` table
3. Gets current `month_year` (e.g., "2025-01")
4. Queries `scan_usage` for the user's usage in current month
5. Calculates quota information

**Response**:
```json
{
  "can_scan": true,
  "scans_used": 7,
  "scans_limit": 10,
  "additional_scans": 0,
  "total_limit": 10,
  "remaining": 3,
  "usage_percent": 70,
  "warning": false,
  "tier": "free"
}
```

**⚠️ Important**: This function **only returns information**. It does not prevent API calls or enforce limits. Enforcement happens only in the frontend UI.

#### `increment-scan-usage`

**Purpose**: Increments the user's scan count after a successful scan.

**Location**: `supabase/functions/increment-scan-usage/index.ts`

**Authentication**: Requires valid JWT token

**Process**:
1. Authenticates the user
2. Gets current `month_year`
3. Uses `UPSERT` to either:
   - Create a new record with `scans_used = 1` if none exists for this month
   - Increment `scans_used` by 1 if record already exists

**Database Operation**:
```sql
INSERT INTO scan_usage (user_id, month_year, scans_used)
VALUES (?, ?, 1)
ON CONFLICT (user_id, month_year)
DO UPDATE SET
  scans_used = scan_usage.scans_used + 1,
  updated_at = NOW();
```

**⚠️ Important**: This function is called **after** the scan completes, from the frontend. The backend AI functions do not call this or validate quotas before processing.

---

## Hourly Rate Limits

### Per-Tier Limits

Hourly rate limits are defined in `supabase/functions/_shared/rate-limiter.ts`:

```typescript
const DEFAULT_LIMITS: RateLimitConfig = {
  free: 10,      // 10 requests per hour
  basic: 50,     // 50 requests per hour
  pro: 200,      // 200 requests per hour
};
```

| Tier | Requests Per Hour |
|------|------------------|
| Free | 10 |
| Basic | 50 |
| Pro | 200 |

### Database Schema

Hourly rate limits are tracked in the `api_rate_limits` table:

```sql
CREATE TABLE api_rate_limits (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,               -- UUID for logged-in users, 'anonymous' for anonymous
  hour_timestamp TIMESTAMP NOT NULL,   -- Top of the hour (minutes/seconds zeroed)
  request_count INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  UNIQUE(user_id, hour_timestamp)
);
```

**Key Fields**:
- `user_id`: User UUID for authenticated users, string `'anonymous'` for all anonymous users
- `hour_timestamp`: Top-of-hour timestamp (e.g., "2025-01-17 14:00:00")
- `request_count`: Number of requests made in this hour

### How Limits Reset

Rate limits reset automatically every hour:
- System calculates current hour by zeroing minutes/seconds: `hourTimestamp.setMinutes(0, 0, 0)`
- Each hour gets a unique `hour_timestamp` value
- Old hour records are automatically ignored

**Example**:
- 2:30 PM: `hour_timestamp = "2025-01-17 14:00:00"`, `request_count = 5`
- 3:00 PM: System looks for `hour_timestamp = "2025-01-17 15:00:00"`, starts fresh

### Where Enforced

The `checkRateLimit()` function in `supabase/functions/_shared/rate-limiter.ts` is called **at the start** of these edge functions:

1. **`analyze-image`**: Main image analysis function
2. **`suggest-ethical-swap`**: Ethical alternative suggestions
3. **`enrich-description`**: Text description enrichment

**Enforcement Process**:
```typescript
// 1. Determine user's tier
const tier = subscription?.status === 'active' ? determineTier(subscription.product_id) : 'free';

// 2. Get limit for this tier
const limit = limits[tier]; // 10, 50, or 200

// 3. Check current hour's usage
const { data: existing } = await supabase
  .from('api_rate_limits')
  .select('request_count')
  .eq('user_id', userId)
  .eq('hour_timestamp', currentHour)
  .single();

// 4. If at limit, reject request
if (currentCount >= limit) {
  return { allowed: false, remaining: 0, limit };
}

// 5. Otherwise, increment and allow
await supabase.from('api_rate_limits').upsert({
  user_id: userId,
  hour_timestamp: currentHour,
  request_count: currentCount + 1
});

return { allowed: true, remaining: limit - currentCount - 1, limit };
```

**✅ Backend Enforcement**: Unlike monthly quotas, hourly rate limits are **enforced on the backend**. If a user exceeds their hourly limit, the edge function returns an error before calling the AI service.

### Error Response

When rate limit is exceeded, the edge function returns:
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "remaining": 0,
  "limit": 10,
  "tier": "free"
}
```

---

## Anonymous User Behavior

### How Anonymous Users Are Tracked

When a user is not logged in, the system treats them as "anonymous":

```typescript
// In rate-limiter.ts
let userId = 'anonymous';

if (authHeader) {
  const { data: userData } = await supabaseClient.auth.getUser(token);
  if (userData.user) {
    userId = userData.user.id;
  }
}

// All anonymous users share this single userId
await checkRateLimit(userId, supabaseClient);
```

**Key Problem**: All anonymous users share the **same `userId = 'anonymous'`** value in the database.

### Shared Global Rate Limit Pool

Because all anonymous users share the same `user_id`, they share a **single global hourly rate limit**:

**Example Scenario**:
- Anonymous User A makes 5 requests at 2:00 PM
- Anonymous User B makes 6 requests at 2:15 PM
- Database shows: `user_id = 'anonymous'`, `request_count = 11`
- **Both users hit the limit** because they're sharing the same pool (10 requests/hour for free tier)
- Anonymous User C tries at 2:30 PM → **immediately blocked** even though they made 0 requests

### No Monthly Quota Tracking

Anonymous users are **not tracked** in the `scan_usage` table:
- The `check-scan-quota` function requires authentication
- The `increment-scan-usage` function requires authentication
- Anonymous users can make unlimited scans (only limited by hourly rate limits)

### Why This Creates Vulnerability

1. **Ineffective Rate Limiting**: One anonymous user can exhaust the shared pool, blocking all other anonymous users
2. **Easy to Bypass**: Users can clear cookies, switch browsers, or use incognito mode to reset their session
3. **No Long-Term Tracking**: No monthly or daily quotas prevent sustained abuse
4. **Direct API Access**: Anyone can call the edge functions directly with `curl` or `fetch`, bypassing the frontend entirely

---

## Authenticated User Flow

### How User Tier is Determined

When a logged-in user makes a request:

1. **Extract JWT Token**: Get `Authorization` header from request
   ```typescript
   const token = req.headers.get("Authorization")?.replace("Bearer ", "");
   ```

2. **Authenticate User**: Validate token and get user ID
   ```typescript
   const { data: userData } = await supabaseClient.auth.getUser(token);
   const userId = userData.user.id;
   ```

3. **Query Subscription**: Look up user's subscription status
   ```typescript
   const { data: subscription } = await supabaseClient
     .from('user_subscriptions')
     .select('product_id, status')
     .eq('user_id', userId)
     .single();
   ```

4. **Determine Tier**: Map product ID to tier level
   ```typescript
   let tier = 'free';
   if (subscription?.status === 'active') {
     if (subscription.product_id === 'prod_TFUNPU55PGdYSt') tier = 'basic';
     else if (subscription.product_id === 'prod_TFUNP2Cp1fIeun') tier = 'pro';
   }
   ```

### How Both Systems Work Together

For a **logged-in user** performing a scan:

**Frontend Check (Monthly Quota)**:
```
User clicks "Scan" button
  ↓
Frontend calls check-scan-quota edge function
  ↓
Returns: { can_scan: true, remaining: 3, tier: "free" }
  ↓
IF can_scan = false:
  → Show error message "Monthly limit reached"
  → Prevent scan
ELSE:
  → Proceed to scan
```

**Backend Check (Hourly Rate Limit)**:
```
Frontend calls analyze-image edge function
  ↓
Backend calls checkRateLimit(userId, supabaseClient)
  ↓
Returns: { allowed: true, remaining: 5, limit: 10 }
  ↓
IF allowed = false:
  → Return 429 error "Rate limit exceeded"
  → No AI call made
ELSE:
  → Proceed to AI analysis
  ↓
AI completes successfully
  ↓
Frontend calls increment-scan-usage
  ↓
Backend increments scans_used in scan_usage table
```

**Both Protections**:
- **Monthly quota**: Prevents long-term excessive usage
- **Hourly rate limit**: Prevents short-term API spam

### Typical Scan Flow

**Image Analysis Workflow**:

1. **Frontend**: `check-scan-quota` → Check monthly quota (frontend only)
2. **Backend**: `analyze-image` (mode: detect) → Check hourly rate limit, detect items
3. **Backend**: `analyze-image` (mode: analyze) → Check hourly rate limit again, analyze items
4. **Backend** (optional): `suggest-ethical-swap` → Check hourly rate limit, suggest alternatives
5. **Frontend**: `increment-scan-usage` → Increment monthly counter

**Text-Only Input Workflow**:

1. **Frontend**: `check-scan-quota` → Check monthly quota (frontend only)
2. **Backend**: `enrich-description` → Check hourly rate limit, enrich description
3. **Backend**: `analyze-image` (mode: analyze) → Analyze enriched description
4. **Backend** (optional): `suggest-ethical-swap` → Suggest alternatives
5. **Frontend**: `increment-scan-usage` → Increment monthly counter

**Important**: Each backend function call checks the hourly rate limit independently, so a complete scan flow can consume multiple hourly requests.

---

## Current Vulnerabilities

### 1. Public AI Endpoints

**Issue**: All main AI functions have JWT verification disabled in `supabase/config.toml`:

```toml
[functions.analyze-image]
verify_jwt = false

[functions.generate-text]
verify_jwt = false

[functions.suggest-ethical-swap]
verify_jwt = false

[functions.enrich-description]
verify_jwt = false
```

**Impact**:
- Anyone can call these functions without authentication
- No user identity tracking for anonymous requests
- Only shared global hourly rate limit provides protection

**Risk Level**: 🔴 **HIGH** - Allows unlimited anonymous access with minimal protection

---

### 2. Frontend-Only Quota Enforcement

**Issue**: Monthly scan quotas are checked only in the frontend UI. The backend edge functions (`analyze-image`, `suggest-ethical-swap`, `enrich-description`) do **not** validate scan quotas before processing.

**Code Evidence**:
```typescript
// Frontend (ScannerScreen.tsx) - checks quota
const { data: quotaData } = await supabase.functions.invoke('check-scan-quota');
if (!quotaData.can_scan) {
  toast.error("Monthly limit reached");
  return; // Stop here
}

// Backend (analyze-image/index.ts) - NO quota check
serve(async (req) => {
  // ... only checks hourly rate limit
  const rateLimitCheck = await checkRateLimit(userId, supabaseClient);
  // ... proceeds to AI call without checking scan_usage table
});
```

**Impact**:
- Users can bypass monthly quotas by calling edge functions directly
- Example: `curl` or `fetch` requests skip frontend checks
- Paid subscription quotas are not enforced

**Risk Level**: 🟡 **MEDIUM** - Requires technical knowledge but trivial to exploit

---

### 3. Shared Anonymous Rate Limit

**Issue**: All anonymous users share a single `userId = 'anonymous'` in the `api_rate_limits` table, creating a shared global hourly pool.

**Impact**:
- One anonymous user can consume the entire hourly limit (10 requests)
- All other anonymous users are blocked for the remainder of the hour
- Legitimate users get "rate limit exceeded" errors due to others' usage
- Impossible to track individual anonymous user behavior

**Risk Level**: 🟡 **MEDIUM** - Causes poor user experience and ineffective rate limiting

---

### 4. Direct API Call Vulnerability

**Issue**: Because edge functions are public (`verify_jwt = false`) and don't enforce backend quotas, anyone can call them directly:

```bash
# Direct API call bypassing all frontend checks
curl -X POST https://bnzhymtlxqtwcwwoirdl.supabase.co/functions/v1/analyze-image \
  -H "Content-Type: application/json" \
  -H "apikey: <anon-key>" \
  -d '{
    "imageData": {"base64":"...","mimeType":"image/jpeg"},
    "mode": "analyze"
  }'
```

**Impact**:
- Complete bypass of frontend UI
- No monthly quota checks
- Only shared anonymous hourly rate limit applies (easily exhausted)
- Potential for automated scraping/abuse

**Risk Level**: 🔴 **HIGH** - Trivial to exploit with significant cost exposure

---

### 5. Cost Exposure Risk

**Critical Function**: `analyze-image` is the most expensive function because it:
- Calls Gemini AI models (costs per token)
- Processes large images (vision models are expensive)
- Is called multiple times per scan (detect → analyze)
- Has no backend quota enforcement

**Estimated Costs** (example scenario):
- Single image analysis: ~$0.01 - $0.05 per call
- If 1000 unauthorized calls per day: **$10 - $50/day** = **$300 - $1500/month**

**Other Vulnerable Endpoints**:
- `suggest-ethical-swap`: Text-based AI calls
- `enrich-description`: Text enrichment AI calls

**Risk Level**: 🔴 **HIGH** - Direct financial impact if app becomes public

---

## Configuration Files Reference

### Subscription Tiers & Monthly Quotas

**File**: `src/config/subscription.config.ts`

**Contents**:
- `SUBSCRIPTION_TIERS`: Object defining Free/Basic/Pro tiers
- `scansPerMonth`: Monthly scan limits per tier
- `productId`: Stripe product IDs for paid tiers
- `getSubscriptionTier()`: Helper function to map product ID to tier name

**Usage**: Referenced by `check-scan-quota` edge function and frontend components

---

### Hourly Rate Limits

**File**: `supabase/functions/_shared/rate-limiter.ts`

**Contents**:
- `DEFAULT_LIMITS`: Object defining requests per hour per tier
- `checkRateLimit()`: Main function to validate and enforce rate limits
- Database operations for `api_rate_limits` table

**Usage**: Imported and called by `analyze-image`, `suggest-ethical-swap`, `enrich-description`

---

### Edge Function JWT Settings

**File**: `supabase/config.toml`

**Contents**:
- `[functions.<function-name>]`: Configuration section for each edge function
- `verify_jwt`: Boolean flag controlling authentication requirement
  - `true`: Requires valid JWT token, rejects anonymous requests
  - `false`: Allows public access without authentication

**Current Settings**:
```toml
[functions.analyze-image]
verify_jwt = false  # ⚠️ Public access

[functions.suggest-ethical-swap]
verify_jwt = false  # ⚠️ Public access

[functions.enrich-description]
verify_jwt = false  # ⚠️ Public access

[functions.check-subscription]
verify_jwt = true   # ✅ Authentication required

[functions.check-scan-quota]
verify_jwt = true   # ✅ Authentication required

[functions.increment-scan-usage]
verify_jwt = true   # ✅ Authentication required
```

---

### Database Schema

**File**: `src/integrations/supabase/types.ts` (auto-generated)

**Relevant Tables**:

**`scan_usage`**:
```typescript
{
  id: string;
  user_id: string;
  month_year: string;      // "YYYY-MM"
  scans_used: number;
  additional_scans_purchased: number;
  created_at: string;
  updated_at: string;
}
```

**`api_rate_limits`**:
```typescript
{
  id: string;
  user_id: string;         // UUID or 'anonymous'
  hour_timestamp: string;  // ISO timestamp, top of hour
  request_count: number;
  created_at: string;
}
```

**`user_subscriptions`**:
```typescript
{
  id: string;
  user_id: string;
  product_id: string;      // Stripe product ID
  status: string;          // 'active', 'canceled', etc.
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## Summary

### What Already Exists

✅ **Working Systems**:
- Monthly scan quotas with three tiers (Free/Basic/Pro)
- Hourly rate limits enforced on backend
- Database tables for tracking usage
- Edge functions for quota checking and incrementing
- Stripe integration for paid subscriptions

### What Is Missing

❌ **Critical Gaps**:
- ~~Backend enforcement of monthly quotas~~ **FIXED: Added anonymous daily quotas**
- ~~IP-based tracking for anonymous users~~ **FIXED: Added IP-based daily tracking**
- Authentication requirement for AI endpoints (still public but now enforced via quota)
- Individual rate limiting for anonymous users (still shared hourly pool)
- Daily quota system **✅ IMPLEMENTED for anonymous users**
- CAPTCHA or anti-bot protection

### Current Protection Level

**For Logged-In Users**: 
- ✅ Hourly rate limits (backend enforced)
- ⚠️ Monthly quotas (frontend only, easily bypassed)

**For Anonymous Users**:
- ✅ **NEW: Daily quota (10 scans/day per IP, backend enforced)**
- ✅ **NEW: Must log in after exceeding daily limit**
- ⚠️ Shared hourly rate limit (ineffective for individual tracking)
- ❌ No monthly quotas

**Overall Assessment**: 🟡 **MEDIUM RISK** - Anonymous daily quotas now provide backend protection. Logged-in users still have bypass-able monthly quotas, but the anonymous attack vector is significantly reduced.

---

## Anonymous Daily Quota Enforcement (NEW)

### Overview

As of this implementation, **anonymous users are limited to 10 free scans per day** (UTC timezone). After reaching this limit, they must create an account or log in to continue using the scanner.

This system provides:
- ✅ Backend enforcement (no frontend bypass possible)
- ✅ IP-based tracking (each IP gets independent quota)
- ✅ Automatic daily reset at midnight UTC
- ✅ Clear error messaging requiring login
- ✅ No impact on logged-in users

### Database Schema

**Table**: `anonymous_daily_usage`

| Column | Type | Description |
|--------|------|-------------|
| `ip_address` | TEXT | User's IP address (primary key part) |
| `date` | TEXT | UTC date in YYYY-MM-DD format (primary key part) |
| `scans_used` | INTEGER | Number of scans consumed today |
| `last_updated` | TIMESTAMPTZ | Last usage timestamp |

**Primary Key**: `(ip_address, date)`

**Index**: `idx_anonymous_daily_usage_date` on `date` column for cleanup operations

**RLS Policy**: Only `service_role` can read/write (managed entirely by backend)

### IP Address Extraction

Anonymous users are identified by their IP address, extracted in this priority order:

1. `x-real-ip` header (preferred, set by reverse proxies)
2. `x-forwarded-for` header (first IP in comma-separated list)
3. `"unknown"` (fallback, treated as single anonymous user)

```typescript
const ipAddress = req.headers.get("x-real-ip") ??
                  req.headers.get("x-forwarded-for")?.split(',')[0]?.trim() ??
                  "unknown";
```

### How It Works

**Backend Enforcement Flow** (in `analyze-image`, `enrich-description`, `suggest-ethical-swap`):

1. Extract IP address from request headers
2. Determine if user is authenticated (`userId !== 'anonymous'`)
3. If anonymous:
   - Query `anonymous_daily_usage` for today's usage
   - If `scans_used >= 10`: Return 429 error with `DAILY_LIMIT_REACHED` code
   - If under limit: Increment counter and proceed with AI call
4. If authenticated: Skip anonymous quota check, use normal monthly quotas

**Daily Reset**:
- Each date gets a new row in the database
- When the UTC date changes, old records are automatically ignored
- No manual cleanup required for normal operation

**Example Database State**:

```
ip_address        | date       | scans_used | last_updated
------------------|------------|------------|------------------------
192.168.1.100     | 2025-01-17 | 7          | 2025-01-17 14:30:22
203.0.113.42      | 2025-01-17 | 10         | 2025-01-17 15:45:10  ← At limit
198.51.100.200    | 2025-01-17 | 3          | 2025-01-17 09:12:05
```

### Error Response

When an anonymous user exceeds the daily limit, the backend returns:

```json
{
  "success": false,
  "error": {
    "code": "DAILY_LIMIT_REACHED",
    "message": "You've reached the free daily limit. Please log in to continue using the scanner.",
    "requiresAuth": true
  }
}
```

**Status Code**: `429 Too Many Requests`

### Frontend Handling

The frontend should:
1. Detect `error.code === "DAILY_LIMIT_REACHED"`
2. Display a dialog prompting the user to log in or create an account
3. Redirect to `/auth` page when user confirms

### Interaction with Other Systems

**Anonymous Users**:
- ✅ Daily quota: 10 scans/day/IP (backend enforced) - **NEW**
- ✅ Hourly rate limit: 10 requests/hour (shared global pool, backend enforced)
- ❌ Monthly quota: None

**Logged-In Free Users**:
- ✅ Monthly quota: 10 scans/month (frontend only, bypass-able)
- ✅ Hourly rate limit: 10 requests/hour (backend enforced)
- ❌ Daily quota: None (exempt from anonymous daily limits)

**Paid Users (Basic/Pro)**:
- ✅ Monthly quota: 200/1000 scans (frontend only)
- ✅ Hourly rate limit: 50/200 requests/hour (backend enforced)
- ❌ Daily quota: None (exempt from anonymous daily limits)

### Configuration

**Anonymous Daily Limit**: Configurable in `supabase/functions/_shared/anonymous-quota.ts`

```typescript
const ANONYMOUS_DAILY_LIMIT = 10; // Change this value to adjust the limit
```

### Security Considerations

**✅ Backend Enforcement**:
- All quota checks happen inside edge functions
- No way to bypass via direct API calls
- IP-based tracking prevents simple cookie/session bypass

**⚠️ Known Limitations**:
- Users behind shared IPs (corporate networks, VPNs) share the same quota
- Sophisticated users can bypass via VPN/proxy rotation
- "unknown" IP fallback creates shared pool for misconfigured proxies

**Recommended Additional Protections** (not implemented):
- Device fingerprinting
- CAPTCHA after repeated limit hits
- Progressive rate limiting (stricter after violations)

### Maintenance

**Cleanup Old Records** (recommended cron job):

```sql
-- Delete records older than 7 days
DELETE FROM public.anonymous_daily_usage
WHERE date < (CURRENT_DATE - INTERVAL '7 days');
```

This can be run weekly to prevent table bloat.

---

## Next Steps (If Protection Improvements Are Desired)

This section is for reference only and describes potential improvements that are **not currently implemented**:

**Priority 1 - Critical**:
1. Enable JWT verification on AI edge functions (`verify_jwt = true`)
2. Add backend quota enforcement in `analyze-image`, `suggest-ethical-swap`, `enrich-description`
3. Implement IP-based tracking for anonymous users

**Priority 2 - Important**:
4. Add frontend auth gates (redirect to /auth for scanner features)
5. Consider daily quotas instead of/in addition to monthly quotas
6. Improve error messaging and quota visibility in UI

**Priority 3 - Nice to Have**:
7. Implement CAPTCHA (Cloudflare Turnstile) on scan buttons
8. Add browser fingerprinting for better anonymous tracking
9. Implement progressive rate limiting (stricter after repeated violations)
10. Add admin dashboard for monitoring usage and abuse patterns
