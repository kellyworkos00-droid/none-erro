import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createSupplierBillSchema } from '@/lib/validations';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import type { TransactionClient } from '@/lib/types';

const BILL_PREFIX = 'BILL-';

const getNextBillNumber = async (tx: TransactionClient) => {
  const latest = await tx.supplierBill.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { billNumber: true },
  });

  const lastDigits = latest?.billNumber?.match(/(\d+)$/)?.[1];
  const lastValue = lastDigits ? parseInt(lastDigits, 10) : 0;
  const count = await tx.supplierBill.count();
  const nextValue = Math.max(lastValue, count) + 1;

  return `${BILL_PREFIX}${nextValue.toString().padStart(6, '0')}`;
};

/**
 * GET /api/supplier-bills
 * List supplier bills
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'supplier_bill.view');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (supplierId) {
      where.supplierId = supplierId;
    }
    if (status) {
      where.status = status;
    }

    const [bills, total] = await Promise.all([
      prisma.supplierBill.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' },
        include: { supplier: true },
      }),
      prisma.supplierBill.count({ where }),
    ]);

    return NextResponse.json(
      createSuccessResponse({
        items: bills,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get supplier bills error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/supplier-bills
 * Create a supplier bill
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'supplier_bill.create');
    const body = await request.json();
    const parsed = createSupplierBillSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { supplierId, totalAmount, issueDate, dueDate, purchaseOrderId, reference, notes } = parsed.data;

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const billNumber = await getNextBillNumber(tx);

      return tx.supplierBill.create({
        data: {
          billNumber,
          supplierId,
          purchaseOrderId: purchaseOrderId || null,
          totalAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
          status: 'DRAFT',
          approvalStatus: 'NOT_SUBMITTED',
          issueDate: new Date(issueDate),
          dueDate: new Date(dueDate),
          reference: reference || null,
          notes: notes || null,
          createdBy: user.userId,
        },
        include: { supplier: true },
      });
    });

    await createAuditLog({
      userId: user.userId,
      action: 'CREATE_SUPPLIER_BILL',
      entityType: 'SupplierBill',
      entityId: result.id,
      description: `Supplier bill created: ${result.billNumber}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { billNumber: result.billNumber },
    });

    return NextResponse.json(
      createSuccessResponse(result, 'Supplier bill created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create supplier bill error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
