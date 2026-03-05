import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/whatsapp-commerce/stats
 * Get WhatsApp Commerce integration statistics
 */
export async function GET(request: NextRequest) {
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

    // Get product count
    const totalProducts = await prisma.product.count({
      where: { status: 'ACTIVE' },
    });

    // Get synced products count
    const syncedProducts = await prisma.product.count({
      where: {
        status: 'ACTIVE',
      },
    });

    // Simulate order stats (will be real once order table is created)
    const totalOrders = 0;
    const pendingOrders = 0;
    const messagesSent = 0;

    // Get last sync status
    const settings = await prisma.whatsAppCommerceSettings.findFirst({
      where: { organizationId: payload.organizationId },
    });

    const stats = {
      totalProducts,
      syncedProducts,
      totalOrders,
      pendingOrders,
      messagesSent,
      lastSyncStatus: settings?.lastSyncStatus || 'pending',
    };

    return NextResponse.json(
      createSuccessResponse(stats, 'Stats retrieved successfully')
    );
  } catch (error) {
    console.error('Failed to get WhatsApp commerce stats:', error);
    return NextResponse.json(
      createErrorResponse('Failed to get stats', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
