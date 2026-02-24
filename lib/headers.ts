/**
 * Security Headers Middleware & Utilities
 * Implements industry best practices for security headers
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security Headers Configuration
 */
const SECURITY_HEADERS = {
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',
  
  // Enable browser XSS protection
  'X-Content-Type-Options': 'nosniff',
  
  // Referrer policy to prevent sensitive information leakage
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust as needed
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
  
  // Permissions policy (formerly Feature Policy)
  'Permissions-Policy': [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
  ].join(', '),
  
  // Strict Transport Security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  
  // Cross-Origin policies
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Remove some default headers that expose server info
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');

  return response;
}

/**
 * CORS Headers Configuration
 */
export interface CorsConfig {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

const DEFAULT_CORS_CONFIG: CorsConfig = {
  allowedOrigins: [process.env.FRONTEND_URL || 'http://localhost:3000'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400,
};

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;

  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    if (allowed === origin) return true;
    
    // Support wildcard subdomains
    if (allowed.startsWith('*.')) {
      const pattern = allowed.replace('*.', '');
      return origin.endsWith(pattern);
    }

    return false;
  });
}

/**
 * Apply CORS headers to response
 */
export function applyCorsHeaders(
  response: NextResponse,
  origin: string | null,
  config: CorsConfig = DEFAULT_CORS_CONFIG
): NextResponse {
  const allowedOrigins = config.allowedOrigins || DEFAULT_CORS_CONFIG.allowedOrigins!;

  if (isOriginAllowed(origin, allowedOrigins)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', (config.allowedMethods || DEFAULT_CORS_CONFIG.allowedMethods!).join(', '));
    response.headers.set('Access-Control-Allow-Headers', (config.allowedHeaders || DEFAULT_CORS_CONFIG.allowedHeaders!).join(', '));
    response.headers.set('Access-Control-Max-Age', (config.maxAge || DEFAULT_CORS_CONFIG.maxAge!).toString());

    if (config.exposedHeaders) {
      response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
    }

    if (config.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }

  return response;
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleCorsPrelight(
  request: NextRequest,
  config: CorsConfig = DEFAULT_CORS_CONFIG
): NextResponse {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 204 });

  return applyCorsHeaders(response, origin, config);
}

/**
 * Rate limit headers middleware
 */
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  reset: Date
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toISOString());

  return response;
}

/**
 * Request ID middleware for tracing
 */
export function addRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set('X-Request-ID', requestId);
  return response;
}

/**
 * Cache control headers
 */
export function setCacheControl(
  response: NextResponse,
  options: {
    type?: 'public' | 'private' | 'no-cache' | 'no-store';
    maxAge?: number;
    sMaxAge?: number;
    revalidate?: number;
  } = {}
): NextResponse {
  const parts: string[] = [options.type || 'private'];

  if (options.maxAge) {
    parts.push(`max-age=${options.maxAge}`);
  }

  if (options.sMaxAge) {
    parts.push(`s-maxage=${options.sMaxAge}`);
  }

  if (options.revalidate) {
    parts.push(`stale-while-revalidate=${options.revalidate}`);
  }

  response.headers.set('Cache-Control', parts.join(', '));
  return response;
}

/**
 * Disable caching for sensitive endpoints
 */
export function disableCaching(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}
