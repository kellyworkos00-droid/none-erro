import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'stock.view');
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const locationId = searchParams.get('locationId');
    const productId = searchParams.get('productId');

    const where: Record<string, unknown> = {};
    if (locationId) {
      where.locationId = locationId;
    } else if (warehouseId) {
      where.location = { warehouseId };
    }
    if (productId) where.productId = productId;

    const levels = await prisma.stockLevel.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: {
        product: true,
        location: { include: { warehouse: true } },
      },
      orderBy: [{ productId: 'asc' }, { locationId: 'asc' }],
    });

    return NextResponse.json(createSuccessResponse({ items: levels }), { status: 200 });
  } catch (error) {
    console.error('Get stock levels error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
