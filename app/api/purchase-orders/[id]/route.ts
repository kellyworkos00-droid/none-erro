import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import type { TransactionClient } from '@/lib/types';

/**
 * GET /api/purchase-orders/:id
 * Get a purchase order
 */
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    await requirePermission(request, 'purchase_order.view');

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: context.params.id },
      include: {
        supplier: true,
        items: { include: { product: true } },
        createdByUser: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        createErrorResponse('Purchase order not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(createSuccessResponse(order), { status: 200 });
  } catch (error) {
    console.error('Get purchase order error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/purchase-orders/:id
 * Update purchase order status (approve, send, receive)
 */
export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = (body?.action as string | undefined)?.toUpperCase() || 'RECEIVE';
    const permissionMap = {
      APPROVE: 'purchase_order.approve',
      SEND: 'purchase_order.send',
      RECEIVE: 'purchase_order.receive',
    } as const;

    type Action = keyof typeof permissionMap;
    type AuditAction = Parameters<typeof createAuditLog>[0]['action'];

    const permission = permissionMap[action as Action];
    if (!permission) {
      return NextResponse.json(
        createErrorResponse('Invalid action', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const safeAction = action as Action;

    const user = await requirePermission(request, permission);

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id: context.params.id },
        include: { items: true },
      });

      if (!order) {
        return { error: 'NOT_FOUND' } as const;
      }

      if (order.status === 'RECEIVED' || order.status === 'CANCELLED') {
        return { error: 'INVALID_STATE' } as const;
      }

      if (safeAction === 'APPROVE' && order.status !== 'DRAFT') {
        return { error: 'INVALID_STATE' } as const;
      }

      if (safeAction === 'SEND' && order.status !== 'APPROVED') {
        return { error: 'INVALID_STATE' } as const;
      }

      if (safeAction === 'RECEIVE' && order.status !== 'SENT') {
        return { error: 'INVALID_STATE' } as const;
      }

      if (safeAction === 'RECEIVE') {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }

      const statusMap: Record<Action, string> = {
        APPROVE: 'APPROVED',
        SEND: 'SENT',
        RECEIVE: 'RECEIVED',
      };

      const updatedOrder = await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: statusMap[safeAction] },
        include: {
          supplier: true,
          items: { include: { product: true } },
        },
      });

      return { order: updatedOrder } as const;
    });

    if ('error' in result) {
      if (result.error === 'NOT_FOUND') {
        return NextResponse.json(
          createErrorResponse('Purchase order not found', 'NOT_FOUND'),
          { status: 404 }
        );
      }

      return NextResponse.json(
        createErrorResponse('Purchase order cannot be received', 'INVALID_STATE'),
        { status: 400 }
      );
    }

    const auditActionMap: Record<Action, AuditAction> = {
      APPROVE: 'APPROVE_PURCHASE_ORDER',
      SEND: 'SEND_PURCHASE_ORDER',
      RECEIVE: 'RECEIVE_PURCHASE_ORDER',
    };

    const actionLabelMap: Record<Action, string> = {
      APPROVE: 'approved',
      SEND: 'sent',
      RECEIVE: 'received',
    };

    await createAuditLog({
      userId: user.userId,
      action: auditActionMap[safeAction],
      entityType: 'PurchaseOrder',
      entityId: result.order.id,
      description: `Purchase order ${actionLabelMap[safeAction]}: ${result.order.orderNumber}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { orderNumber: result.order.orderNumber },
    });

    return NextResponse.json(
      createSuccessResponse(
        result.order,
        `Purchase order ${actionLabelMap[safeAction]}`
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Receive purchase order error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
