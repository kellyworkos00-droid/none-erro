import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const warehouse = searchParams.get('warehouse');

    const whereClause: Prisma.StockMovementWhereInput = {
      movementType: 'ADJUSTMENT',
    };

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
      if (dateTo) whereClause.createdAt.lte = new Date(dateTo);
    }

    if (warehouse) {
      whereClause.warehouse = {
        name: { contains: warehouse, mode: 'insensitive' },
      };
    }

    const adjustmentItems = await prisma.stockMovement.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        warehouse: {
          select: {
            name: true,
          },
        },
        location: {
          select: {
            code: true,
            name: true,
          },
        },
        createdByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const runningByProductLocation = new Map<string, number>();

    const variations = adjustmentItems
      .map((item) => {
        const key = `${item.productId}:${item.locationId}`;
        const previousQuantity = runningByProductLocation.get(key) ?? 0;
        const newQuantity = previousQuantity + item.quantity;
        runningByProductLocation.set(key, newQuantity);

        const fullName = `${item.createdByUser.firstName} ${item.createdByUser.lastName}`.trim();

        return {
          id: item.id,
          date: item.createdAt.toISOString(),
          productName: item.product.name,
          sku: item.product.sku,
          warehouse: item.warehouse.name,
          location: `${item.location.code} - ${item.location.name}`,
          previousQuantity,
          newQuantity,
          variation: item.quantity,
          variationType: item.quantity >= 0 ? 'increase' : 'decrease',
          reason: item.notes || 'Stock Adjustment',
          createdBy: fullName || 'System',
        };
      })
      .reverse();

    return NextResponse.json({ data: variations });
  } catch (error) {
    console.error('Error fetching stock variations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock variations' },
      { status: 500 }
    );
  }
}
