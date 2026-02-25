/**
 * API Route: /api/pos/orders/[id]/status
 * Update POS order payment status
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

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

    const body = await request.json();
    const { paymentStatus } = body;

    if (!paymentStatus || !['PAID', 'PENDING', 'PARTIALLY_PAID'].includes(paymentStatus)) {
      return NextResponse.json(
        createErrorResponse('Invalid payment status', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    // Get the order
    const order = await prisma.posOrder.findUnique({
      where: { id: params.id },
      include: { invoice: true },
    });

    if (!order) {
      return NextResponse.json(
        createErrorResponse('Order not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    // Update order payment status
    const updatedOrder = await prisma.posOrder.update({
      where: { id: params.id },
      data: { paymentStatus },
      include: {
        customer: true,
        invoice: true,
        orderItems: {
          include: { product: true },
        },
        createdByUser: true,
      },
    });

    // If invoice exists, update its status as well
    if (order.invoiceId) {
      let invoiceStatus = 'SENT';
      if (paymentStatus === 'PAID') {
        invoiceStatus = 'PAID';
      } else if (paymentStatus === 'PARTIALLY_PAID') {
        invoiceStatus = 'PARTIALLY_PAID';
      }

      await prisma.invoice.update({
        where: { id: order.invoiceId },
        data: { status: invoiceStatus },
      });
    }

    return NextResponse.json(
      createSuccessResponse(updatedOrder, 'Payment status updated successfully')
    );
  } catch (error) {
    console.error('Failed to update order status:', error);
    return NextResponse.json(
      createErrorResponse('Failed to update order status', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
