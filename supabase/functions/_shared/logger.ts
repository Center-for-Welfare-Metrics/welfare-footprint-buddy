/**
 * Centralized Structured Logger
 * 
 * Provides consistent, secure logging across all edge functions
 * with request tracing and sensitive data masking.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  ip?: string;
  userId?: string;
  [key: string]: any;
}

export interface Logger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  withRequest(context: LogContext): Logger;
}

/**
 * Patterns to detect and mask secrets
 */
const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /auth/i,
  /bearer/i,
  /credential/i,
  /stripe[_-]?key/i,
  /gemini[_-]?key/i,
  /lovable[_-]?key/i,
];

/**
 * Check if a key looks like it contains sensitive data
 */
function isSensitiveKey(key: string): boolean {
  return SECRET_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Mask sensitive string values
 */
function maskSensitiveValue(value: string): string {
  if (value.length <= 8) {
    return '***';
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

/**
 * Truncate long strings for logging
 */
function truncateString(str: string, maxLength: number = 100): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.slice(0, maxLength)}... (${str.length} chars total)`;
}

/**
 * Safely serialize metadata, masking secrets and truncating large values
 */
export function safeMeta(meta: Record<string, any> | undefined): Record<string, any> {
  if (!meta) {
    return {};
  }

  try {
    const safe: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(meta)) {
      // Mask sensitive keys
      if (isSensitiveKey(key)) {
        if (typeof value === 'string') {
          safe[key] = maskSensitiveValue(value);
        } else {
          safe[key] = '***';
        }
        continue;
      }

      // Handle different value types
      if (value === null || value === undefined) {
        safe[key] = value;
      } else if (typeof value === 'string') {
        // Truncate long strings
        safe[key] = truncateString(value, 200);
      } else if (typeof value === 'object') {
        // For objects, provide a summary instead of full content
        if (Array.isArray(value)) {
          safe[key] = `[Array: ${value.length} items]`;
        } else {
          const keys = Object.keys(value);
          safe[key] = `[Object: ${keys.length} keys]`;
        }
      } else {
        safe[key] = value;
      }
    }

    return safe;
  } catch (error) {
    return { error: 'Failed to serialize metadata' };
  }
}

/**
 * Create a logger instance for a specific function
 */
export function createLogger(config: { functionName: string }): Logger {
  const baseContext = {
    function: config.functionName,
  };

  function log(level: LogLevel, message: string, meta?: Record<string, any>, context?: LogContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      function: config.functionName,
      message,
      ...context,
      ...safeMeta(meta),
    };

    // Use console methods for different levels (Supabase captures these)
    switch (level) {
      case 'debug':
        console.debug(JSON.stringify(logEntry));
        break;
      case 'info':
        console.info(JSON.stringify(logEntry));
        break;
      case 'warn':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'error':
        console.error(JSON.stringify(logEntry));
        break;
    }
  }

  const logger: Logger = {
    debug(message: string, meta?: Record<string, any>) {
      log('debug', message, meta);
    },
    info(message: string, meta?: Record<string, any>) {
      log('info', message, meta);
    },
    warn(message: string, meta?: Record<string, any>) {
      log('warn', message, meta);
    },
    error(message: string, meta?: Record<string, any>) {
      log('error', message, meta);
    },
    withRequest(context: LogContext): Logger {
      return {
        debug(message: string, meta?: Record<string, any>) {
          log('debug', message, meta, context);
        },
        info(message: string, meta?: Record<string, any>) {
          log('info', message, meta, context);
        },
        warn(message: string, meta?: Record<string, any>) {
          log('warn', message, meta, context);
        },
        error(message: string, meta?: Record<string, any>) {
          log('error', message, meta, context);
        },
        withRequest(newContext: LogContext): Logger {
          return logger.withRequest({ ...context, ...newContext });
        },
      };
    },
  };

  return logger;
}

/**
 * Helper to create a standardized JSON error response
 */
export function jsonErrorResponse(status: number, message: string): Response {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: corsHeaders }
  );
}

/**
 * Helper to create a standardized JSON success response
 */
export function jsonSuccessResponse(data: any, status: number = 200): Response {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  return new Response(
    JSON.stringify({ success: true, data }),
    { status, headers: corsHeaders }
  );
}

/**
 * Helper to generate or extract requestId from headers
 */
export function getRequestId(req: Request): string {
  return req.headers.get('x-request-id') 
    || req.headers.get('x-correlation-id') 
    || crypto.randomUUID();
}

/**
 * Helper to extract client IP from request
 */
export function getClientIp(req: Request): string | undefined {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip')
    || undefined;
}
