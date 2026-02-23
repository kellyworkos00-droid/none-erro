import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/pos/orders/[id]
 * Get a specific POS order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    const order = await prisma.posOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        orderItems: {
          include: { product: true },
        },
        createdByUser: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        createErrorResponse('Order not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createSuccessResponse(order, 'Order retrieved successfully')
    );
  } catch (error) {
    console.error('Failed to get order:', error);
    return NextResponse.json(
      createErrorResponse('Failed to get order', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pos/orders/[id]
 * Update a POS order (add/remove items)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const body = await request.json();
    const { items, customerId, tax, discount } = body;

    const order = await prisma.posOrder.findUnique({
      where: { id },
      include: { orderItems: true },
    });

    if (!order) {
      return NextResponse.json(
        createErrorResponse('Order not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    if (order.status !== 'DRAFT') {
      return NextResponse.json(
        createErrorResponse('Cannot update completed order', 'INVALID_STATE'),
        { status: 400 }
      );
    }

    // Delete existing items and create new ones
    if (items) {
      await prisma.posOrderItem.deleteMany({
        where: { posOrderId: id },
      });

      let subtotal = 0;
      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          return NextResponse.json(
            createErrorResponse('Product not found', 'NOT_FOUND'),
            { status: 404 }
          );
        }
        if (item.quantity > product.quantity) {
          return NextResponse.json(
            createErrorResponse('Insufficient stock', 'INSUFFICIENT_STOCK'),
            { status: 400 }
          );
        }

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        await prisma.posOrderItem.create({
          data: {
            posOrderId: id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: product.price,
            totalPrice: itemTotal,
            discount: item.discount || 0,
          },
        });
      }

      const taxAmount = subtotal * (tax || 0) / 100;
      const discountAmount = subtotal * (discount || 0) / 100;
      const totalAmount = subtotal + taxAmount - discountAmount;

      await prisma.posOrder.update({
        where: { id },
        data: {
          subtotal,
          tax: taxAmount,
          discount: discountAmount,
          totalAmount,
          customerId: customerId || undefined,
        },
      });
    }

    const updatedOrder = await prisma.posOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        orderItems: {
          include: { product: true },
        },
        createdByUser: true,
      },
    });

    return NextResponse.json(
      createSuccessResponse(updatedOrder, 'Order updated successfully')
    );
  } catch (error) {
    console.error('Failed to update order:', error);
    return NextResponse.json(
      createErrorResponse('Failed to update order', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
