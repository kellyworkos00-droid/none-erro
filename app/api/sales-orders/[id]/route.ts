import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import type { TransactionClient } from '@/lib/types';
import { postInvoiceCreated } from '@/lib/accounting';

const DELIVERY_PREFIX = 'DEL-';
const INVOICE_PREFIX = 'INV-';

const getNextDeliveryNumber = async (tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
  const latest = await tx.salesDelivery.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { deliveryNumber: true },
  });

  const lastDigits = latest?.deliveryNumber?.match(/(\d+)$/)?.[1];
  const lastValue = lastDigits ? parseInt(lastDigits, 10) : 0;
  const count = await tx.salesDelivery.count();
  const nextValue = Math.max(lastValue, count) + 1;

  return `${DELIVERY_PREFIX}${nextValue.toString().padStart(6, '0')}`;
};

const getNextInvoiceNumber = async (tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
  const latest = await tx.invoice.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });

  const lastDigits = latest?.invoiceNumber?.match(/(\d+)$/)?.[1];
  const lastValue = lastDigits ? parseInt(lastDigits, 10) : 0;
  const count = await tx.invoice.count();
  const nextValue = Math.max(lastValue, count) + 1;

  return `${INVOICE_PREFIX}${nextValue.toString().padStart(6, '0')}`;
};

/**
 * GET /api/sales-orders/:id
 * Get a sales order
 */
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    await requirePermission(request, 'sales_order.view');

    const order = await prisma.salesOrder.findUnique({
      where: { id: context.params.id },
      include: {
        customer: true,
        items: { include: { product: true } },
        deliveries: { include: { items: { include: { product: true } } } },
      },
    });

    if (!order) {
      return NextResponse.json(
        createErrorResponse('Sales order not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(createSuccessResponse(order), { status: 200 });
  } catch (error) {
    console.error('Get sales order error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sales-orders/:id
 * Update sales order status
 */
export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = (body?.action as string | undefined)?.toUpperCase() || '';

    const permissionMap = {
      SUBMIT: 'sales_order.submit',
      APPROVE: 'sales_order.approve',
      DELIVER: 'sales_order.deliver',
      INVOICE: 'sales_order.invoice',
      CANCEL: 'sales_order.cancel',
    } as const;

    type Action = keyof typeof permissionMap;

    const permission = permissionMap[action as Action];
    if (!permission) {
      return NextResponse.json(
        createErrorResponse('Invalid action', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const user = await requirePermission(request, permission);

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: context.params.id },
        include: { items: true },
      });

      if (!order) {
        return { error: 'NOT_FOUND' } as const;
      }

      if (action === 'SUBMIT' && order.status !== 'DRAFT') {
        return { error: 'INVALID_STATE' } as const;
      }

      if (action === 'APPROVE' && order.status !== 'PENDING_APPROVAL') {
        return { error: 'INVALID_STATE' } as const;
      }

      if (action === 'DELIVER' && order.status !== 'APPROVED') {
        return { error: 'INVALID_STATE' } as const;
      }

      if (action === 'INVOICE' && order.status !== 'DELIVERED') {
        return { error: 'INVALID_STATE' } as const;
      }

      if (action === 'CANCEL' && !['DRAFT', 'PENDING_APPROVAL'].includes(order.status)) {
        return { error: 'INVALID_STATE' } as const;
      }

      if (action === 'DELIVER') {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product || product.quantity < item.quantity) {
            return { error: 'INSUFFICIENT_STOCK' } as const;
          }
        }

        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } },
          });
        }

        const deliveryNumber = await getNextDeliveryNumber(tx);

        await tx.salesDelivery.create({
          data: {
            deliveryNumber,
            salesOrderId: order.id,
            status: 'DELIVERED',
            dispatchedAt: new Date(),
            deliveredAt: new Date(),
            createdBy: user.userId,
            items: {
              create: order.items.map((item: { productId: string; quantity: number }) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            },
          },
        });
      }

      if (action === 'INVOICE') {
        const invoiceNumber = await getNextInvoiceNumber(tx);
        const issueDate = new Date();

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            customerId: order.customerId,
            subtotal: order.subtotal,
            taxAmount: order.tax,
            totalAmount: order.totalAmount,
            paidAmount: 0,
            balanceAmount: order.totalAmount,
            status: 'SENT',
            issueDate,
            dueDate: issueDate,
            description: `Sales order invoice ${order.orderNumber}`,
          },
        });

        const customer = await tx.customer.findUnique({
          where: { id: order.customerId },
        });

        if (customer) {
          const updatedTotalOutstanding = new Decimal(customer.totalOutstanding)
            .plus(order.totalAmount);
          const updatedCurrentBalance = new Decimal(customer.currentBalance)
            .plus(order.totalAmount);

          await tx.customer.update({
            where: { id: customer.id },
            data: {
              totalOutstanding: updatedTotalOutstanding.toNumber(),
              currentBalance: updatedCurrentBalance.toNumber(),
            },
          });
        }

        await tx.salesOrder.update({
          where: { id: order.id },
          data: { invoiceId: invoice.id },
        });

        try {
          await postInvoiceCreated(
            invoice.id,
            invoice.customerId,
            invoice.totalAmount,
            user.userId,
            `Invoice created for sales order ${order.orderNumber}`,
            issueDate
          );
        } catch (ledgerError) {
          console.error('Ledger posting failed for sales order invoice:', ledgerError);
        }
      }

      const statusMap: Record<Action, { status: string; approvalStatus?: string }> = {
        SUBMIT: { status: 'PENDING_APPROVAL', approvalStatus: 'PENDING' },
        APPROVE: { status: 'APPROVED', approvalStatus: 'APPROVED' },
        DELIVER: { status: 'DELIVERED' },
        INVOICE: { status: 'INVOICED' },
        CANCEL: { status: 'CANCELLED', approvalStatus: 'REJECTED' },
      };

      const statusUpdate = statusMap[action as Action];

      const updatedOrder = await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          status: statusUpdate.status,
          approvalStatus: statusUpdate.approvalStatus,
          approvedBy: action === 'APPROVE' ? user.userId : order.approvedBy,
          approvedAt: action === 'APPROVE' ? new Date() : order.approvedAt,
          submittedAt: action === 'SUBMIT' ? new Date() : order.submittedAt,
          deliveredAt: action === 'DELIVER' ? new Date() : order.deliveredAt,
        },
        include: {
          customer: true,
          items: { include: { product: true } },
          deliveries: true,
        },
      });

      return { order: updatedOrder } as const;
    });

    if ('error' in result) {
      if (result.error === 'NOT_FOUND') {
        return NextResponse.json(
          createErrorResponse('Sales order not found', 'NOT_FOUND'),
          { status: 404 }
        );
      }

      if (result.error === 'INSUFFICIENT_STOCK') {
        return NextResponse.json(
          createErrorResponse('Insufficient stock', 'INSUFFICIENT_STOCK'),
          { status: 400 }
        );
      }

      return NextResponse.json(
        createErrorResponse('Sales order cannot be updated', 'INVALID_STATE'),
        { status: 400 }
      );
    }

    const auditActionMap: Record<
      Action,
      'SALES_ORDER_SUBMIT' | 'SALES_ORDER_APPROVE' | 'SALES_ORDER_DELIVER' | 'SALES_ORDER_INVOICE' | 'SALES_ORDER_CANCEL'
    > = {
      SUBMIT: 'SALES_ORDER_SUBMIT',
      APPROVE: 'SALES_ORDER_APPROVE',
      DELIVER: 'SALES_ORDER_DELIVER',
      INVOICE: 'SALES_ORDER_INVOICE',
      CANCEL: 'SALES_ORDER_CANCEL',
    };

    await createAuditLog({
      userId: user.userId,
      action: auditActionMap[action as Action],
      entityType: 'SalesOrder',
      entityId: result.order.id,
      description: `Sales order ${action.toLowerCase()}: ${result.order.orderNumber}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { orderNumber: result.order.orderNumber },
    });

    return NextResponse.json(
      createSuccessResponse(result.order, `Sales order ${action.toLowerCase()}`),
      { status: 200 }
    );
  } catch (error) {
    console.error('Update sales order error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
