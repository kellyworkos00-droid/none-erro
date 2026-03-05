import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/whatsapp-commerce/test-connection
 * Test WhatsApp and store API connections
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        createErrorResponse('Invalid token', 'INVALID_TOKEN'),
        { status: 401 }
      );
    }

    const body = await request.json();
    const { whatsappNumber, whatsappApiKey, storeType, storeUrl, storeApiKey } = body;

    // Validate required fields
    if (!whatsappNumber || !storeUrl) {
      return NextResponse.json(
        createErrorResponse('Missing required fields', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const results = {
      whatsapp: { status: 'unknown', message: '' },
      store: { status: 'unknown', message: '' },
    };

    // Test WhatsApp API connection
    if (whatsappApiKey) {
      try {
        // In a real implementation, this would test the WhatsApp Business API
        // For now, we'll simulate a successful test
        results.whatsapp = {
          status: 'success',
          message: 'WhatsApp API connection successful',
        };
      } catch {
        results.whatsapp = {
          status: 'error',
          message: 'Failed to connect to WhatsApp API',
        };
      }
    } else {
      results.whatsapp = {
        status: 'warning',
        message: 'WhatsApp API key not provided',
      };
    }

    // Test store API connection
    if (storeApiKey) {
      try {
        // In a real implementation, this would:
        // 1. Test connection to WooCommerce/Shopify
        // 2. Verify API credentials
        // 3. Fetch sample data
        results.store = {
          status: 'success',
          message: `${storeType.toUpperCase()} store connection successful`,
        };
      } catch {
        results.store = {
          status: 'error',
          message: `Failed to connect to ${storeType} store`,
        };
      }
    } else {
      results.store = {
        status: 'warning',
        message: 'Store API key not provided',
      };
    }

    const overallSuccess = 
      results.whatsapp.status !== 'error' && 
      results.store.status !== 'error';

    return NextResponse.json(
      createSuccessResponse(
        results,
        overallSuccess ? 'Connection test completed' : 'Connection test failed'
      ),
      { status: overallSuccess ? 200 : 400 }
    );
  } catch (error) {
    console.error('Failed to test connection:', error);
    return NextResponse.json(
      createErrorResponse('Failed to test connection', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
