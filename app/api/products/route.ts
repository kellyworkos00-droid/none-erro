import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse, generateSKU } from '@/lib/utils';
import { verifyToken } from '@/lib/auth';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';

/**
 * GET /api/products
 * Get all products with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'ACTIVE';

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(category ? { category } : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json(
      createSuccessResponse(
        {
          items: products,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        'Products retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Failed to get products:', error);
    return NextResponse.json(
      createErrorResponse('Failed to get products', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Create a new product
 */
export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as {
      name?: string;
      description?: string;
      price?: string | number;
      cost?: string | number;
      category?: string;
      sku?: string;
      quantity?: string | number;
      reorderLevel?: string | number;
      unit?: string;
      status?: string;
    };
    const {
      name,
      description,
      price,
      cost,
      category,
      sku,
      quantity,
      reorderLevel,
      unit,
      status,
    } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        createErrorResponse('Missing required fields', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    // Generate SKU if not provided
    const finalSku = sku || generateSKU();

    // Check if SKU already exists
    const existing = await prisma.product.findUnique({
      where: { sku: finalSku },
    });

    if (existing) {
      return NextResponse.json(
        createErrorResponse('SKU already exists', 'DUPLICATE_SKU'),
        { status: 400 }
      );
    }

    const parsedQuantity = Number(quantity);
    if (Number.isFinite(parsedQuantity) && parsedQuantity < 0) {
      return NextResponse.json(
        createErrorResponse('Quantity cannot be negative', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        sku: finalSku,
        name,
        description,
        price: Number(price),
        cost: cost !== undefined && cost !== null && cost !== '' ? Number(cost) : null,
        category,
        quantity: Number.isFinite(parsedQuantity) ? Math.trunc(parsedQuantity) : 0,
        reorderLevel: Number.isFinite(Number(reorderLevel)) ? Number(reorderLevel) : undefined,
        unit: unit?.trim() || undefined,
        status: status || 'ACTIVE',
      },
    });

    await createAuditLog({
      userId: payload.userId,
      action: 'CREATE_PRODUCT',
      entityType: 'Product',
      entityId: product.id,
      description: `Product ${product.name} created`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: {
        sku: product.sku,
        price: product.price,
        category: product.category,
        status: product.status,
        quantity: product.quantity,
      },
    });

    return NextResponse.json(
      createSuccessResponse(product, 'Product created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json(
      createErrorResponse('Failed to create product', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
