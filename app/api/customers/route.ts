import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createCustomerSchema } from '@/lib/validations';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/customers
 * Get all customers with pagination and search
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'customer.view');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      isActive: true,
      ...(search ? {
        OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { customerCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
      } : {}),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          invoices: {
            where: {
              status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json(
      createSuccessResponse({
        customers,
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
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
          { status: 401 }
        );
      }

      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          createErrorResponse('Insufficient permissions', 'FORBIDDEN'),
          { status: 403 }
        );
      }
    }

    console.error('Get customers error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers
 * Create a new customer
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'customer.create');
    const body = await request.json();
    const parsed = createCustomerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { customerCode, name, email, phone, billingAddress, creditLimit } = parsed.data;

    const existing = await prisma.customer.findUnique({
      where: { customerCode },
    });

    if (existing) {
      return NextResponse.json(
        createErrorResponse('Customer code already exists', 'DUPLICATE_CODE'),
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        customerCode,
        name,
        email: email || null,
        phone: phone || null,
        billingAddress: billingAddress || null,
        creditLimit: creditLimit ?? null,
      },
    });

    await createAuditLog({
      userId: user.userId,
      action: 'CREATE_CUSTOMER',
      entityType: 'Customer',
      entityId: customer.id,
      description: `Customer created: ${customer.name}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: {
        customerCode: customer.customerCode,
      },
    });

    return NextResponse.json(
      createSuccessResponse(customer, 'Customer created successfully'),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
          { status: 401 }
        );
      }

      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          createErrorResponse('Insufficient permissions', 'FORBIDDEN'),
          { status: 403 }
        );
      }
    }

    console.error('Create customer error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
