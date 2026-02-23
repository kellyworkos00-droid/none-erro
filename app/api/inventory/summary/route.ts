import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'UNAUTHORIZED'), { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'INVALID_TOKEN'), { status: 401 });
    }

    // Get real-time inventory data from database
    const [
      totalItems,
      lowStockItems,
      outOfStockItems,
      productStats,
      warehouseCount
    ] = await Promise.all([
      // Total unique products
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      
      // Products below reorder level
      prisma.product.count({
        where: {
          status: 'ACTIVE',
          quantity: { lt: prisma.product.fields.reorderLevel }
        }
      }),
      
      // Out of stock products
      prisma.product.count({
        where: {
          status: 'ACTIVE',
          quantity: 0
        }
      }),
      
      // Total inventory value (cost * quantity)
      prisma.product.aggregate({
        where: { status: 'ACTIVE' },
        _sum: {
          quantity: true
        }
      }),
      
      // Total warehouses
      prisma.warehouse.count()
    ]);

    // Calculate approximate total value
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { cost: true, price: true, quantity: true }
    });

    const totalValue = products.reduce((sum, product) => {
      const value = (product.cost || product.price) * product.quantity;
      return sum + value;
    }, 0);

    const summary = {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue: Math.round(totalValue),
      warehouses: warehouseCount,
      totalQuantity: productStats._sum.quantity || 0
    };

    return NextResponse.json(createSuccessResponse(summary, 'Inventory summary fetched successfully'));
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    return NextResponse.json(
      createErrorResponse('Failed to fetch inventory summary', 'SERVER_ERROR'),
      { status: 500 }
    );
  }
}
