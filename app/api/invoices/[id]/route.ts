import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/invoices/[id]
 * Get a single invoice with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'invoice.view');

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
        posOrders: {
          include: {
            orderItems: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        createErrorResponse('Invoice not found', 'INVOICE_NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(createSuccessResponse({ invoice }));
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      createErrorResponse('Failed to fetch invoice', 'FETCH_ERROR'),
      { status: 500 }
    );
  }
}
