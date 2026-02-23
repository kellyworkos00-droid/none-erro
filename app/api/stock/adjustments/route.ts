import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createStockAdjustmentSchema } from '@/lib/validations';
import { adjustStockLevel } from '@/lib/stock';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'stock.adjust');
    const body = await request.json();

    const parsed = createStockAdjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { locationId, productId, quantity, reason, reference } = parsed.data;

    const level = await adjustStockLevel({
      prisma,
      locationId,
      productId,
      quantityDelta: quantity,
      reference,
      reason,
      createdById: user.userId,
    });

    await createAuditLog({
      userId: user.userId,
      action: 'STOCK_ADJUSTMENT',
      entityType: 'StockLevel',
      entityId: level.id,
      description: `Stock adjusted by ${quantity}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { locationId, productId, quantity, reason },
    });

    return NextResponse.json(
      createSuccessResponse({ level }, 'Stock adjusted successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Stock adjustment error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
