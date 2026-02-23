/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting API requests per time window
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (use Redis in production)
const requestCounts: RateLimitStore = {};

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

/**
 * Get client identifier (IP address)
 */
function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

/**
 * Rate limit middleware
 * @param request - Next.js request
 * @returns True if rate limit exceeded, false otherwise
 */
export function checkRateLimit(request: NextRequest): boolean {
  const clientId = getClientId(request);
  const now = Date.now();

  // Initialize or get existing record
  if (!requestCounts[clientId] || requestCounts[clientId].resetTime < now) {
    requestCounts[clientId] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    return false;
  }

  // Increment counter
  requestCounts[clientId].count++;

  // Check if limit exceeded
  return requestCounts[clientId].count > MAX_REQUESTS;
}

/**
 * Get rate limit info for response headers
 */
export function getRateLimitHeaders(request: NextRequest) {
  const clientId = getClientId(request);
  const record = requestCounts[clientId];

  if (!record) {
    return {
      'X-RateLimit-Limit': MAX_REQUESTS.toString(),
      'X-RateLimit-Remaining': MAX_REQUESTS.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + WINDOW_MS).toISOString(),
    };
  }

  const remaining = Math.max(0, MAX_REQUESTS - record.count);

  return {
    'X-RateLimit-Limit': MAX_REQUESTS.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
  };
}

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  Object.keys(requestCounts).forEach((key) => {
    if (requestCounts[key].resetTime < now) {
      delete requestCounts[key];
    }
  });
}, 60000); // Clean every minute

/**
 * Rate limit middleware wrapper for API routes
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    // Check rate limit
    if (checkRateLimit(request)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        },
        {
          status: 429,
          headers: getRateLimitHeaders(request),
        }
      );
    }

    // Call original handler
    const response = await handler(request);

    // Add rate limit headers
    const headers = getRateLimitHeaders(request);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}
