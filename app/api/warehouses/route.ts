import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createWarehouseSchema } from '@/lib/validations';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import type { TransactionClient } from '@/lib/types';

/**
 * GET /api/warehouses
 * List warehouses
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'warehouse.view');

    const warehouses = await prisma.warehouse.findMany({
      orderBy: { createdAt: 'desc' },
      include: { locations: true },
    });

    return NextResponse.json(createSuccessResponse({ items: warehouses }), { status: 200 });
  } catch (error) {
    console.error('Get warehouses error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/warehouses
 * Create warehouse
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'warehouse.create');
    const body = await request.json();
    const parsed = createWarehouseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { code, name, address } = parsed.data;

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const warehouse = await tx.warehouse.create({
        data: {
          code: code.toUpperCase(),
          name,
          address: address || null,
        },
      });

      await tx.warehouseLocation.create({
        data: {
          warehouseId: warehouse.id,
          code: 'MAIN',
          name: 'Main',
        },
      });

      return tx.warehouse.findUnique({
        where: { id: warehouse.id },
        include: { locations: true },
      });
    });

    await createAuditLog({
      userId: user.userId,
      action: 'CREATE_WAREHOUSE',
      entityType: 'Warehouse',
      entityId: result?.id,
      description: `Warehouse created: ${result?.code}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { code: result?.code },
    });

    return NextResponse.json(
      createSuccessResponse(result, 'Warehouse created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create warehouse error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
