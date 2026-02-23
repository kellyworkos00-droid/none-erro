import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createWarehouseSchema } from '@/lib/validations';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(request, 'warehouse.view');

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: params.id },
      include: { locations: true },
    });

    if (!warehouse) {
      return NextResponse.json(
        createErrorResponse('Warehouse not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(createSuccessResponse(warehouse), { status: 200 });
  } catch (error) {
    console.error('Get warehouse error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission(request, 'warehouse.update');
    const body = await request.json();

    const parsed = createWarehouseSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { code, name, address, isActive } = parsed.data;

    const updated = await prisma.warehouse.update({
      where: { id: params.id },
      data: {
        code: code ? code.toUpperCase() : undefined,
        name,
        address: address ?? undefined,
        isActive,
      },
    });

    await createAuditLog({
      userId: user.userId,
      action: 'UPDATE_WAREHOUSE',
      entityType: 'Warehouse',
      entityId: updated.id,
      description: `Warehouse updated: ${updated.code}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { code: updated.code },
    });

    return NextResponse.json(createSuccessResponse(updated), { status: 200 });
  } catch (error) {
    console.error('Update warehouse error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
