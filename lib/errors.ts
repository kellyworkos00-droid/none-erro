/**
 * Comprehensive Error Handling System
 * Production-grade error classes and utilities
 */

/**
 * Base Application Error
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
      },
    };
  }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      message || 'Validation failed',
      'VALIDATION_ERROR',
      400,
      details,
      true
    );
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication Error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: unknown) {
    super(message, 'UNAUTHORIZED', 401, details, true);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization Error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', details?: unknown) {
    super(message, 'FORBIDDEN', 403, details, true);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(
      `${resource} not found`,
      'NOT_FOUND',
      404,
      { resource },
      true
    );
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      message || 'Resource conflict',
      'CONFLICT',
      409,
      details,
      true
    );
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Rate Limit Error (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(
      message,
      'RATE_LIMIT_EXCEEDED',
      429,
      retryAfter ? { retryAfter } : undefined,
      true
    );
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', details?: unknown) {
    super(
      message,
      'INTERNAL_ERROR',
      500,
      details,
      false // Not operational, likely a bug
    );
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

/**
 * Service Unavailable Error (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string, details?: unknown) {
    super(
      `${service} is currently unavailable`,
      'SERVICE_UNAVAILABLE',
      503,
      details,
      true
    );
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Database Error
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: unknown) {
    super(
      message,
      'DATABASE_ERROR',
      500,
      details,
      false
    );
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * External API Error
 */
export class ExternalApiError extends AppError {
  constructor(
    service: string,
    statusCode?: number,
    details?: unknown
  ) {
    super(
      `External service error: ${service}`,
      'EXTERNAL_API_ERROR',
      statusCode || 502,
      details,
      true
    );
    Object.setPrototypeOf(this, ExternalApiError.prototype);
  }
}

/**
 * Business Logic Error
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      'BUSINESS_LOGIC_ERROR',
      400,
      details,
      true
    );
    Object.setPrototypeOf(this, BusinessLogicError.prototype);
  }
}

/**
 * Error Response Builder
 */
export class ErrorResponse {
  constructor(private error: AppError) {}

  toJSON() {
    return {
      success: false,
      error: {
        code: this.error.code,
        message: this.error.message,
        statusCode: this.error.statusCode,
        ...(this.error.details && { details: this.error.details }),
      },
    };
  }

  getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.error instanceof RateLimitError && this.error.details) {
      headers['Retry-After'] = this.error.details.retryAfter?.toString() || '60';
    }

    return headers;
  }

  getStatusCode() {
    return this.error.statusCode;
  }
}

/**
 * Safe error handler that hides sensitive information in production
 */
export function getSafeErrorMessage(error: unknown, isDevelopment: boolean = false): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    if (isDevelopment) {
      return error.message;
    }
    // In production, don't reveal error details
    return 'An unexpected error occurred';
  }

  if (isDevelopment) {
    return String(error);
  }

  return 'An unexpected error occurred';
}

/**
 * Error logger for centralized error tracking
 */
export class ErrorLogger {
  static log(
    error: unknown,
    context: {
      userId?: string;
      requestId?: string;
      action?: string;
      statusCode?: number;
    } = {}
  ) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const timestamp = new Date().toISOString();

    const errorInfo = {
      timestamp,
      isDevelopment,
      context,
      ...(error instanceof AppError && {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        details: error.details,
      }),
      ...(error instanceof Error && {
        name: error.name,
        message: error.message,
        stack: isDevelopment ? error.stack : undefined,
      }),
    };

    // Log to console in development
    if (isDevelopment) {
      console.error('[ERROR]', JSON.stringify(errorInfo, null, 2));
    }

    // In production, send to error tracking service (e.g., Sentry)
    // TODO: Integrate with Sentry or similar
    // sendToErrorTracking(errorInfo);

    return errorInfo;
  }

  static logWithContext(
    error: unknown,
    userId: string,
    action: string,
    requestId?: string
  ) {
    return this.log(error, { userId, requestId, action });
  }
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(
  fn: (req: any, res: any) => Promise<any>
) {
  return (req: any, res: any) => {
    Promise.resolve(fn(req, res)).catch((error) => {
      ErrorLogger.log(error, {
        action: `${req.method} ${req.url}`,
      });

      if (error instanceof AppError) {
        return res.status(error.statusCode).json(new ErrorResponse(error).toJSON());
      }

      return res.status(500).json(
        new ErrorResponse(
          new InternalError('An unexpected error occurred')
        ).toJSON()
      );
    });
  };
}

/**
 * Try-catch wrapper with error transformation
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: unknown) => AppError
): Promise<{ success: boolean; data?: T; error?: AppError }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const appError = errorHandler
      ? errorHandler(error)
      : error instanceof AppError
        ? error
        : new InternalError(String(error));

    return { success: false, error: appError };
  }
}
