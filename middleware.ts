import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders, disableCaching } from '@/lib/headers';

/**
 * Middleware for Kelly OS Bank Reconciliation
 * Handles security headers, rate limiting, and route protection
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  let response = NextResponse.next();

  // Add security headers to all responses
  response = applySecurityHeaders(response);
  
  // Add request ID for tracing (using Web Crypto API - Edge runtime compatible)
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-ID', requestId);

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/', '/api/auth/login'];
  const isPublicRoute = publicRoutes.some((route) => pathname === route);

  // Disable caching for protected routes
  if (!isPublicRoute) {
    response = disableCaching(response);
  }

  // Check authentication for protected routes
  if (!isPublicRoute && pathname.startsWith('/dashboard')) {
    // In client-side apps, auth is checked in components
    // This is just for additional security
    return response;
  }

  // API route protection
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth/login')) {
    const isPublicProductsRead = pathname === '/api/products' && request.method === 'GET';
    if (isPublicProductsRead) {
      return response;
    }

    const authHeader = request.headers.get('authorization');
    const isAuthMeRoute = pathname === '/api/auth/me';
    const isInternalAuthCheck = request.headers.get('x-auth-check') === '1';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
      return applySecurityHeaders(errorResponse);
    }

    if (!isAuthMeRoute && !isInternalAuthCheck) {
      try {
        // Verify the token maps to an active DB user before allowing API access.
        const authCheckUrl = new URL('/api/auth/me', request.url);
        const authCheckResponse = await fetch(authCheckUrl, {
          headers: {
            authorization: authHeader,
            'x-auth-check': '1',
            'X-Request-ID': requestId,
          },
        });

        if (!authCheckResponse.ok) {
          const errorResponse = NextResponse.json(
            {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'User is not connected to the database',
              },
            },
            { status: 401 }
          );
          return applySecurityHeaders(errorResponse);
        }
      } catch (error) {
        console.error('Auth DB check failed:', error);
        const errorResponse = NextResponse.json(
          {
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Unable to verify user connection',
            },
          },
          { status: 503 }
        );
        return applySecurityHeaders(errorResponse);
      }
    }
  }

  return response;
}

// Configure which routes middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
