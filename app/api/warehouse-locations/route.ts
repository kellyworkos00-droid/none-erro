import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createWarehouseLocationSchema } from '@/lib/validations';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'warehouse.view');
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');

    const locations = await prisma.warehouseLocation.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      orderBy: [{ warehouseId: 'asc' }, { code: 'asc' }],
      include: { warehouse: true },
    });

    return NextResponse.json(createSuccessResponse({ items: locations }), { status: 200 });
  } catch (error) {
    console.error('Get locations error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'warehouse.create');
    const body = await request.json();

    const parsed = createWarehouseLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { warehouseId, code, name } = parsed.data;

    const location = await prisma.warehouseLocation.create({
      data: {
        warehouseId,
        code: code.toUpperCase(),
        name,
      },
      include: { warehouse: true },
    });

    await createAuditLog({
      userId: user.userId,
      action: 'CREATE_WAREHOUSE_LOCATION',
      entityType: 'WarehouseLocation',
      entityId: location.id,
      description: `Location created: ${location.code}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { warehouseId, code: location.code },
    });

    return NextResponse.json(
      createSuccessResponse(location, 'Location created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create location error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
