import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { updateSupplierSchema } from '@/lib/validations';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

/**
 * PATCH /api/suppliers/[id]
 * Update a supplier
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'supplier.update');

    const body = (await request.json()) as {
      supplierCode?: string;
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
    };

    const parsed = updateSupplierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const existing = await prisma.supplier.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        createErrorResponse('Supplier not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    if (parsed.data.supplierCode && parsed.data.supplierCode !== existing.supplierCode) {
      const duplicate = await prisma.supplier.findUnique({
        where: { supplierCode: parsed.data.supplierCode },
      });

      if (duplicate) {
        return NextResponse.json(
          createErrorResponse('Supplier code already exists', 'DUPLICATE_CODE'),
          { status: 400 }
        );
      }
    }

    const updated = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        supplierCode: parsed.data.supplierCode ?? existing.supplierCode,
        name: parsed.data.name ?? existing.name,
        email: parsed.data.email ?? existing.email,
        phone: parsed.data.phone ?? existing.phone,
        address: parsed.data.address ?? existing.address,
      },
    });

    return NextResponse.json(
      createSuccessResponse(updated, 'Supplier updated successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Update supplier error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
