// Centralized error handling utility
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  AI_MODEL = 'AI_MODEL',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  timestamp: string;
  functionName?: string;
  originalError?: any;
  retryable: boolean;
}

export class ErrorHandler {
  static log(error: AppError): void {
    const logLevel = error.retryable ? 'WARN' : 'ERROR';
    console.error(
      `[${logLevel}][${error.timestamp}][${error.functionName || 'Unknown'}] ${error.message}`,
      error.originalError
    );
  }

  static createError(
    type: ErrorType,
    message: string,
    userMessage: string,
    functionName?: string,
    originalError?: any,
    retryable: boolean = false
  ): AppError {
    const error: AppError = {
      type,
      message,
      userMessage,
      timestamp: new Date().toISOString(),
      functionName,
      originalError,
      retryable
    };
    
    this.log(error);
    return error;
  }

  static handleNetworkError(functionName: string, originalError?: any): AppError {
    return this.createError(
      ErrorType.NETWORK,
      'Network request failed',
      'Connection lost. Please check your internet and try again.',
      functionName,
      originalError,
      true
    );
  }

  static handleAuthError(functionName: string, originalError?: any): AppError {
    return this.createError(
      ErrorType.AUTH,
      'Authentication failed',
      'Your session has expired. Please sign in again.',
      functionName,
      originalError,
      false
    );
  }

  static handleAIError(functionName: string, originalError?: any): AppError {
    return this.createError(
      ErrorType.AI_MODEL,
      'AI analysis failed',
      'We couldn\'t complete this analysis. Retrying automatically...',
      functionName,
      originalError,
      true
    );
  }

  static handleValidationError(functionName: string, message: string, originalError?: any): AppError {
    return this.createError(
      ErrorType.VALIDATION,
      message,
      message,
      functionName,
      originalError,
      false
    );
  }

  static handleUnknownError(functionName: string, originalError?: any): AppError {
    return this.createError(
      ErrorType.UNKNOWN,
      'An unexpected error occurred',
      'We couldn\'t complete this analysis. Please try again later.',
      functionName,
      originalError,
      true
    );
  }

  static parseSupabaseError(error: any, functionName: string): AppError {
    // Network errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return this.handleNetworkError(functionName, error);
    }

    // Auth errors
    if (error.message?.includes('JWT') || error.message?.includes('auth') || error.status === 401) {
      return this.handleAuthError(functionName, error);
    }

    // AI/Function errors
    if (error.message?.includes('AI') || error.message?.includes('analysis')) {
      return this.handleAIError(functionName, error);
    }

    // Default
    return this.handleUnknownError(functionName, error);
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError;
}
