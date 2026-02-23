import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import { verifyToken } from '@/lib/auth';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';

/**
 * PATCH /api/products/[id]
 * Update a product
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = (await request.json()) as {
      name?: string;
      description?: string;
      price?: string | number;
      cost?: string | number;
      category?: string;
      sku?: string;
      status?: string;
      reorderLevel?: string | number;
      unit?: string;
    };

    if ('quantity' in body) {
      return NextResponse.json(
        createErrorResponse(
          'Quantity updates are only allowed via Stock Adjustments',
          'VALIDATION_ERROR'
        ),
        { status: 400 }
      );
    }

    // Check if product exists
    const existing = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        createErrorResponse('Product not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check if SKU is being changed and already exists
    if (body.sku && body.sku !== existing.sku) {
      const duplicate = await prisma.product.findUnique({
        where: { sku: body.sku },
      });

      if (duplicate) {
        return NextResponse.json(
          createErrorResponse('SKU already exists', 'DUPLICATE_SKU'),
          { status: 400 }
        );
      }
    }

    const updateData: {
      name?: string;
      description?: string | null;
      price?: number;
      cost?: number | null;
      category?: string | null;
      sku?: string;
      status?: string;
      reorderLevel?: number;
      unit?: string;
    } = {};

    if (body.sku !== undefined) updateData.sku = body.sku;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.cost !== undefined) {
      updateData.cost = body.cost !== null && body.cost !== '' ? Number(body.cost) : null;
    }
    if (body.category !== undefined) updateData.category = body.category || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.reorderLevel !== undefined) updateData.reorderLevel = Number(body.reorderLevel);
    if (body.unit !== undefined) updateData.unit = body.unit?.trim() || 'UNIT';

    const product = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
    });

    await createAuditLog({
      userId: payload.userId,
      action: 'UPDATE_PRODUCT',
      entityType: 'Product',
      entityId: product.id,
      description: `Product ${product.name} updated`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: {
        updatedFields: Object.keys(updateData),
      },
    });

    return NextResponse.json(
      createSuccessResponse(product, 'Product updated successfully')
    );
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json(
      createErrorResponse('Failed to update product', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Delete a product (soft delete by setting status to INACTIVE)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if product exists
    const existing = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        createErrorResponse('Product not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    // Soft delete: set status to INACTIVE
    const product = await prisma.product.update({
      where: { id: params.id },
      data: { status: 'INACTIVE' },
    });

    return NextResponse.json(
      createSuccessResponse(product, 'Product deleted successfully')
    );
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json(
      createErrorResponse('Failed to delete product', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
