import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createStockTransferSchema } from '@/lib/validations';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import type { TransactionClient } from '@/lib/types';

function buildTransferNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TR-${y}${m}${d}-${rand}`;
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'stock.view');

    const transfers = await prisma.stockTransfer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        fromLocation: { include: { warehouse: true } },
        toLocation: { include: { warehouse: true } },
        items: { include: { product: true } },
      },
    });

    return NextResponse.json(createSuccessResponse({ items: transfers }), { status: 200 });
  } catch (error) {
    console.error('Get transfers error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'stock.transfer');
    const body = await request.json();

    const parsed = createStockTransferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { fromLocationId, toLocationId, items } = parsed.data;

    if (fromLocationId === toLocationId) {
      return NextResponse.json(
        createErrorResponse('From and to locations must be different', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const transfer = await prisma.$transaction(async (tx: TransactionClient) => {
      const created = await tx.stockTransfer.create({
        data: {
          transferNumber: buildTransferNumber(),
          fromLocationId,
          toLocationId,
          status: 'DRAFT',
          createdBy: user.userId,
        },
      });

      for (const item of items) {
        await tx.stockTransferItem.create({
          data: {
            transferId: created.id,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }

      return tx.stockTransfer.findUnique({
        where: { id: created.id },
        include: { items: true },
      });
    });

    await createAuditLog({
      userId: user.userId,
      action: 'STOCK_TRANSFER_CREATE',
      entityType: 'StockTransfer',
      entityId: transfer?.id,
      description: `Stock transfer created: ${transfer?.transferNumber}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { transferNumber: transfer?.transferNumber },
    });

    return NextResponse.json(
      createSuccessResponse(transfer, 'Transfer created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create transfer error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
