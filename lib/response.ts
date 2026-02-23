// @ts-nocheck
/**
 * Standardized API Response Handler
 * Ensures consistent response formats across all endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { applySecurityHeaders, disableCaching } from '@/lib/headers';
import { AppError } from '@/lib/errors';

/**
 * Standard success response format
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Standard error response format
 */
export interface ErrorResponseFormat {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Create success response
 */
export function createSuccess<T>(
  data: T,
  message?: string,
  requestId?: string
): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
  };
}

/**
 * Create error response
 */
export function createError(
  error: AppError,
  requestId?: string
): ErrorResponseFormat {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      ...(error.details && typeof error.details === 'object' ? { details: error.details } : {}),
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
  };
}

/**
 * API Response Builder
 */
export class ApiResponse {
  private request?: NextRequest;
  private requestId?: string;
  private rateLimitInfo?: { limit: number; remaining: number; reset: Date };

  constructor(request?: NextRequest, requestId?: string) {
    this.request = request;
    this.requestId = requestId;
  }

  /**
   * Send success response
   */
  success<T>(
    data: T,
    message?: string,
    statusCode: number = 200
  ): NextResponse {
    const response = NextResponse.json(
      createSuccess(data, message, this.requestId),
      { status: statusCode }
    );

    return this.applyDefaults(response, statusCode);
  }

  /**
   * Send created response (201)
   */
  created<T>(data: T, message?: string): NextResponse {
    return this.success(data, message || 'Resource created successfully', 201);
  }

  /**
   * Send error response
   */
  error(appError: AppError): NextResponse {
    const response = NextResponse.json(
      createError(appError, this.requestId),
      { status: appError.statusCode }
    );

    return this.applyDefaults(response, appError.statusCode);
  }

  /**
   * Send paginated response
   */
  paginated<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages?: number;
    },
    message?: string
  ): NextResponse {
    const response = NextResponse.json(
      {
        success: true,
        data,
        pagination: {
          ...pagination,
          totalPages: pagination.totalPages || Math.ceil(pagination.total / pagination.limit),
        },
        ...(message && { message }),
        meta: {
          timestamp: new Date().toISOString(),
          ...(this.requestId && { requestId: this.requestId }),
        },
      },
      { status: 200 }
    );

    return this.applyDefaults(response, 200);
  }

  /**
   * Send list response
   */
  list<T>(data: T[], message?: string, statusCode: number = 200): NextResponse {
    const response = NextResponse.json(
      {
        success: true,
        data,
        count: data.length,
        ...(message && { message }),
        meta: {
          timestamp: new Date().toISOString(),
          ...(this.requestId && { requestId: this.requestId }),
        },
      },
      { status: statusCode }
    );

    return this.applyDefaults(response, statusCode);
  }

  /**
   * Send no content response (204)
   */
  noContent(): NextResponse {
    const response = new NextResponse(null, { status: 204 });
    return this.applyDefaults(response, 204);
  }

  /**
   * Send not found response (404)
   */
  notFound(message: string = 'Resource not found'): NextResponse {
    const error = new AppError(message, 'NOT_FOUND', 404);
    return this.error(error);
  }

  /**
   * Apply default headers to response
   */
  private applyDefaults(response: NextResponse, statusCode: number): NextResponse {
    // Apply security headers
    response = applySecurityHeaders(response);

    // Add request ID
    if (this.requestId) {
      response.headers.set('X-Request-ID', this.requestId);
    }

    // Disable caching for non-public endpoints
    if (statusCode >= 200 && statusCode < 300) {
      response = disableCaching(response);
    }

    // Set content type
    if (!response.headers.has('Content-Type')) {
      response.headers.set('Content-Type', 'application/json');
    }

    return response;
  }

  /**
   * Add rate limit headers
   */
  withRateLimit(
    limit: number,
    remaining: number,
    reset: Date
  ): ApiResponse {
    // Store rate limit info in headers
    this.rateLimitInfo = { limit, remaining, reset };
    return this;
  }
}

/**
 * Create API response builder
 */
export function createApiResponse(
  request?: NextRequest,
  requestId?: string
): ApiResponse {
  return new ApiResponse(request, requestId);
}

/**
 * Middleware for automatic response formatting
 */
export function withApiResponse(
  handler: (
    request: NextRequest,
    api: ApiResponse
  ) => Promise<NextResponse | { success: boolean; data?: unknown; error?: AppError }>
) {
  return async (request: NextRequest) => {
    const requestId = request.headers.get('X-Request-ID') || generateRequestId();
    const api = createApiResponse(request, requestId);

    try {
      const result = await handler(request, api);

      // If handler returns NextResponse, use it directly
      if (result instanceof NextResponse) {
        return result;
      }

      // If handler returns object with success flag
      if (result.success && result.data) {
        return api.success(result.data);
      }

      if (!result.success && result.error) {
        return api.error(result.error);
      }

      return api.success(result);
    } catch (error) {
      const appError = error instanceof AppError
        ? error
        : new AppError(
            error instanceof Error ? error.message : 'Unknown error',
            'INTERNAL_ERROR',
            500
          );

      return api.error(appError);
    }
  };
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
