import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createSupplierSchema } from '@/lib/validations';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

/**
 * GET /api/suppliers
 * List suppliers with pagination and search
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'supplier.view');

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
        { supplierCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
      } : {}),
    };

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.supplier.count({ where }),
    ]);

    return NextResponse.json(
      createSuccessResponse({
        suppliers,
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
    console.error('Get suppliers error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/suppliers
 * Create a supplier
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'supplier.create');
    const body = await request.json();
    const parsed = createSupplierSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { supplierCode, name, email, phone, address } = parsed.data;

    const existing = await prisma.supplier.findUnique({
      where: { supplierCode },
    });

    if (existing) {
      return NextResponse.json(
        createErrorResponse('Supplier code already exists', 'DUPLICATE_CODE'),
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        supplierCode,
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
      },
    });

    await createAuditLog({
      userId: user.userId,
      action: 'CREATE_SUPPLIER',
      entityType: 'Supplier',
      entityId: supplier.id,
      description: `Supplier created: ${supplier.name}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { supplierCode: supplier.supplierCode },
    });

    return NextResponse.json(
      createSuccessResponse(supplier, 'Supplier created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create supplier error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
