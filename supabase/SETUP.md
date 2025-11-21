# Welfare Footprint App - Backend Setup Guide

This document explains how to set up, run, and test the Supabase Edge Functions locally.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- [Deno](https://deno.land/) runtime (usually bundled with Supabase CLI)
- Access to the project's environment variables

## Environment Variables

The following environment variables are required for the edge functions to work:

### Required for All Functions
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (admin access)

### AI Functions (analyze-image, enrich-description, suggest-ethical-swap, etc.)
- `LOVABLE_API_KEY` - API key for Lovable AI gateway (for Gemini models)
- `GEMINI_API_KEY` - Direct Gemini API key (optional, fallback)

### Payment Functions (create-checkout, customer-portal, check-subscription)
- `STRIPE_SECRET_KEY` - Stripe secret key for payment processing

### Frontend
- `VITE_SUPABASE_URL` - Same as SUPABASE_URL, used by Vite frontend
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Same as SUPABASE_ANON_KEY

**IMPORTANT:** Never commit real API keys to version control. Use `.env.local` or environment-specific configuration.

## Running Functions Locally

### 1. Start Supabase Local Development

```bash
# Start all Supabase services (database, auth, storage, functions)
supabase start

# This will output:
# - API URL (usually http://localhost:54321)
# - GraphQL URL
# - DB URL
# - Studio URL (web UI)
# - Inbucket URL (email testing)
# - JWT secret
# - anon key
# - service_role key
```

### 2. Serve Edge Functions Locally

```bash
# Serve all functions
supabase functions serve

# Or serve a specific function
supabase functions serve analyze-image --no-verify-jwt

# With environment variables
supabase functions serve --env-file .env.local
```

Functions will be available at `http://localhost:54321/functions/v1/<function-name>`

## Testing Functions

### Using curl

#### 1. Test analyze-image (requires authentication)
```bash
curl -X POST 'http://localhost:54321/functions/v1/analyze-image' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "mode": "detect",
    "imageData": { "base64": "...", "mimeType": "image/jpeg" },
    "language": "en"
  }'
```

#### 2. Test enrich-description
```bash
curl -X POST 'http://localhost:54321/functions/v1/enrich-description' \
  -H 'Content-Type: application/json' \
  -d '{
    "description": "pasta with cheese",
    "language": "en"
  }'
```

#### 3. Test suggest-ethical-swap
```bash
curl -X POST 'http://localhost:54321/functions/v1/suggest-ethical-swap' \
  -H 'Content-Type: application/json' \
  -d '{
    "productName": "chicken breast",
    "animalIngredients": "chicken",
    "ethicalLens": 2,
    "language": "en"
  }'
```

#### 4. Test check-scan-quota (requires authentication)
```bash
curl -X POST 'http://localhost:54321/functions/v1/check-scan-quota' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

#### 5. Test increment-scan-usage (requires authentication)
```bash
curl -X POST 'http://localhost:54321/functions/v1/increment-scan-usage' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

### Getting a JWT Token for Testing

```bash
# Sign up a test user
curl -X POST 'http://localhost:54321/auth/v1/signup' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'

# The response will include an access_token you can use for authenticated requests
```

## Logging and Observability

All edge functions use structured logging with request tracing.

### Request ID Tracing

Every request generates or receives a `requestId` that appears in all logs for that request:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "function": "analyze-image",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Request started",
  "ip": "192.168.1.1",
  "userId": "abc123"
}
```

### Filtering Logs by Request

To trace a single request through the system:

```bash
# View logs for all functions
supabase functions logs

# Filter by specific function
supabase functions logs analyze-image

# In production, use Supabase Dashboard > Edge Functions > Logs
# Search for: requestId:"550e8400-e29b-41d4-a716-446655440000"
```

### Log Levels

- `debug` - Verbose diagnostic information
- `info` - Normal operational messages
- `warn` - Warning conditions (approaching limits, degraded performance)
- `error` - Error conditions (failures, exceptions)

## Common Issues

### 1. "AI gateway error: 401"
- Check that `LOVABLE_API_KEY` is set correctly
- Verify the API key has not expired

### 2. "Authentication required"
- Ensure you're passing the JWT token in the `Authorization: Bearer` header
- Token format: `Bearer eyJhbG...`

### 3. "STRIPE_SECRET_KEY is not set"
- Required for payment-related functions
- Get from Stripe Dashboard > Developers > API Keys

### 4. CORS errors in browser
- All functions properly handle CORS with `OPTIONS` preflight
- Check that `Access-Control-Allow-Origin: *` is in response headers

### 5. Cache issues
- To bypass cache during testing, add `"cache": "bypass"` to request body
- Or flush cache using admin-cache-control function

## Production Deployment

Edge functions are automatically deployed when you push to the main branch or deploy via Supabase CLI:

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy analyze-image

# Deploy with environment variables
supabase secrets set LOVABLE_API_KEY=your_key_here
supabase secrets set STRIPE_SECRET_KEY=your_key_here
```

## Monitoring in Production

### Metrics Available

The app tracks:
- Request latency (ms)
- Token usage and estimated costs
- Cache hit rates
- Error rates by function

Query metrics via Supabase Dashboard or directly from tables:
- `ai_usage_metrics` - Real-time AI call metrics
- `ai_metrics_daily_rollup` - Aggregated daily stats
- `ai_response_cache` - Cache entries and hit counts

### Example: Check Today's AI Costs

```sql
SELECT 
  provider,
  model,
  operation,
  COUNT(*) as requests,
  SUM(tokens_used) as total_tokens,
  SUM(estimated_cost_usd) as total_cost_usd,
  AVG(latency_ms) as avg_latency_ms
FROM ai_usage_metrics
WHERE DATE(timestamp) = CURRENT_DATE
GROUP BY provider, model, operation
ORDER BY total_cost_usd DESC;
```

## Support

For issues or questions:
1. Check the logs with request ID filtering
2. Review this setup guide
3. Consult the [Technical Guide](../Technical_Guide_Welfare_Footprint_App_Updated.md)
4. Check the [Architecture Overview](../docs/architecture_overview.md)
