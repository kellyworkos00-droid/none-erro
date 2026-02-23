import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import type { TransactionClient } from '@/lib/types';

/**
 * GET /api/supplier-bills/:id
 * Get a supplier bill
 */
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    await requirePermission(request, 'supplier_bill.view');

    const bill = await prisma.supplierBill.findUnique({
      where: { id: context.params.id },
      include: {
        supplier: true,
        payments: true,
      },
    });

    if (!bill) {
      return NextResponse.json(
        createErrorResponse('Supplier bill not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(createSuccessResponse(bill), { status: 200 });
  } catch (error) {
    console.error('Get supplier bill error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/supplier-bills/:id
 * Update supplier bill workflow
 */
export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = (body?.action as string | undefined)?.toUpperCase() || '';
    const purchaseOrderId = body?.purchaseOrderId as string | undefined;

    const permissionMap = {
      SUBMIT: 'supplier_bill.create',
      APPROVE: 'supplier_bill.approve',
      MATCH: 'supplier_bill.match',
      CANCEL: 'supplier_bill.approve',
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
      const bill = await tx.supplierBill.findUnique({
        where: { id: context.params.id },
      });

      if (!bill) {
        return { error: 'NOT_FOUND' } as const;
      }

      if (action === 'SUBMIT' && bill.status !== 'DRAFT') {
        return { error: 'INVALID_STATE' } as const;
      }

      if (action === 'APPROVE' && bill.approvalStatus !== 'PENDING') {
        return { error: 'INVALID_STATE' } as const;
      }

      if (action === 'MATCH') {
        const linkedPoId = purchaseOrderId || bill.purchaseOrderId;
        if (!linkedPoId) {
          return { error: 'MISSING_PO' } as const;
        }
        const order = await tx.purchaseOrder.findUnique({
          where: { id: linkedPoId },
        });

        if (!order) {
          return { error: 'PO_NOT_FOUND' } as const;
        }

        if (order.status !== 'RECEIVED') {
          return { error: 'PO_NOT_RECEIVED' } as const;
        }
      }

      if (action === 'CANCEL' && bill.status !== 'DRAFT') {
        return { error: 'INVALID_STATE' } as const;
      }

      const updateData: Record<string, unknown> = {};

      if (action === 'SUBMIT') {
        updateData.approvalStatus = 'PENDING';
        updateData.submittedAt = new Date();
      }

      if (action === 'APPROVE') {
        updateData.approvalStatus = 'APPROVED';
        updateData.approvedBy = user.userId;
        updateData.approvedAt = new Date();
        updateData.status = 'OPEN';
      }

      if (action === 'MATCH') {
        updateData.purchaseOrderId = purchaseOrderId || bill.purchaseOrderId;
        updateData.matchedBy = user.userId;
        updateData.matchedAt = new Date();
      }

      if (action === 'CANCEL') {
        updateData.status = 'CANCELLED';
        updateData.approvalStatus = 'REJECTED';
      }

      const updatedBill = await tx.supplierBill.update({
        where: { id: bill.id },
        data: updateData,
        include: {
          supplier: true,
          payments: true,
        },
      });

      return { bill: updatedBill } as const;
    });

    if ('error' in result) {
      if (result.error === 'NOT_FOUND') {
        return NextResponse.json(
          createErrorResponse('Supplier bill not found', 'NOT_FOUND'),
          { status: 404 }
        );
      }

      if (result.error === 'MISSING_PO') {
        return NextResponse.json(
          createErrorResponse('Purchase order required for matching', 'VALIDATION_ERROR'),
          { status: 400 }
        );
      }

      if (result.error === 'PO_NOT_FOUND') {
        return NextResponse.json(
          createErrorResponse('Purchase order not found', 'NOT_FOUND'),
          { status: 404 }
        );
      }

      if (result.error === 'PO_NOT_RECEIVED') {
        return NextResponse.json(
          createErrorResponse('Purchase order must be received', 'INVALID_STATE'),
          { status: 400 }
        );
      }

      return NextResponse.json(
        createErrorResponse('Supplier bill cannot be updated', 'INVALID_STATE'),
        { status: 400 }
      );
    }

    const auditActionMap: Record<Action, 'SUPPLIER_BILL_SUBMIT' | 'SUPPLIER_BILL_APPROVE' | 'SUPPLIER_BILL_MATCH' | 'SUPPLIER_BILL_CANCEL'> = {
      SUBMIT: 'SUPPLIER_BILL_SUBMIT',
      APPROVE: 'SUPPLIER_BILL_APPROVE',
      MATCH: 'SUPPLIER_BILL_MATCH',
      CANCEL: 'SUPPLIER_BILL_CANCEL',
    };

    await createAuditLog({
      userId: user.userId,
      action: auditActionMap[action as Action],
      entityType: 'SupplierBill',
      entityId: result.bill.id,
      description: `Supplier bill ${action.toLowerCase()}: ${result.bill.billNumber}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { billNumber: result.bill.billNumber },
    });

    return NextResponse.json(
      createSuccessResponse(result.bill, `Supplier bill ${action.toLowerCase()}`),
      { status: 200 }
    );
  } catch (error) {
    console.error('Update supplier bill error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
