import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { moveStockBetweenLocations } from '@/lib/stock';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import type { TransactionClient } from '@/lib/types';

interface RouteParams {
  params: { id: string };
}

type TransferAction = 'COMPLETE' | 'CANCEL';

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(request, 'stock.view');

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: params.id },
      include: {
        fromLocation: { include: { warehouse: true } },
        toLocation: { include: { warehouse: true } },
        items: { include: { product: true } },
      },
    });

    if (!transfer) {
      return NextResponse.json(
        createErrorResponse('Transfer not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(createSuccessResponse(transfer), { status: 200 });
  } catch (error) {
    console.error('Get transfer error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission(request, 'stock.transfer');
    const body = await request.json();
    const action = body?.action as TransferAction | undefined;

    if (!action || !['COMPLETE', 'CANCEL'].includes(action)) {
      return NextResponse.json(
        createErrorResponse('Invalid action', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: params.id },
        include: { items: true },
      });

      if (!transfer) {
        return null;
      }

      if (transfer.status !== 'DRAFT') {
        throw new Error('Only draft transfers can be updated');
      }

      if (action === 'CANCEL') {
        return tx.stockTransfer.update({
          where: { id: params.id },
          data: { status: 'CANCELLED' },
        });
      }

      for (const item of transfer.items) {
        await moveStockBetweenLocations({
          prisma: tx,
          fromLocationId: transfer.fromLocationId,
          toLocationId: transfer.toLocationId,
          productId: item.productId,
          quantity: item.quantity,
          reference: transfer.transferNumber,
          reason: 'Transfer completion',
          createdById: user.userId,
        });
      }

      return tx.stockTransfer.update({
        where: { id: params.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    });

    if (!result) {
      return NextResponse.json(
        createErrorResponse('Transfer not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    await createAuditLog({
      userId: user.userId,
      action: action === 'CANCEL' ? 'STOCK_TRANSFER_CANCEL' : 'STOCK_TRANSFER_COMPLETE',
      entityType: 'StockTransfer',
      entityId: result.id,
      description: `Stock transfer ${action === 'CANCEL' ? 'cancelled' : 'completed'}: ${result.transferNumber}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { transferNumber: result.transferNumber },
    });

    return NextResponse.json(createSuccessResponse(result), { status: 200 });
  } catch (error) {
    console.error('Update transfer error:', error);

    if (String((error as Error)?.message || '').includes('Only draft transfers')) {
      return NextResponse.json(
        createErrorResponse('Only draft transfers can be updated', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    if (String((error as Error)?.message || '').includes('Insufficient stock')) {
      return NextResponse.json(
        createErrorResponse('Insufficient stock in source location', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    if (String((error as Error)?.message || '').includes('Location not found')) {
      return NextResponse.json(
        createErrorResponse('Location not found', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
