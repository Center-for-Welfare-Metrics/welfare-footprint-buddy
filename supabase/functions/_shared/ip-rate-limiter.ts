/**
 * IP-Based Rate Limiter for Edge Functions
 * 
 * Uses in-memory Map for simplicity (resets on function cold start).
 * For production-grade rate limiting, consider using Redis or Supabase table.
 * 
 * Default: 30 requests per minute per IP
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (persists across warm invocations within same worker)
const ipLimits = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60000; // 1 minute

function cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  for (const [ip, entry] of ipLimits.entries()) {
    if (now > entry.resetTime) {
      ipLimits.delete(ip);
    }
  }
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Check and update rate limit for an IP address
 * @param ip Client IP address
 * @param maxRequests Maximum requests allowed in the window (default: 30)
 * @param windowMs Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Object with allowed status and remaining requests
 */
export function checkIpRateLimit(
  ip: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; retryAfter?: number } {
  cleanupExpiredEntries();
  
  const now = Date.now();
  const entry = ipLimits.get(ip);
  
  // No existing entry or expired
  if (!entry || now > entry.resetTime) {
    ipLimits.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  // Check if over limit
  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }
  
  // Increment and allow
  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

/**
 * Create a rate limit exceeded response
 */
export function rateLimitResponse(retryAfter: number = 60): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    }
  );
}
