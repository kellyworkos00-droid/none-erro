import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse, generateSKU } from '@/lib/utils';
import { verifyToken } from '@/lib/auth';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';

/**
 * POST /api/products/upload
 * Create product with image upload
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

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = formData.get('price') as string;
    const cost = formData.get('cost') as string;
    const quantity = formData.get('quantity') as string;
    const category = formData.get('category') as string;
    const skuValue = formData.get('sku');
    const reorderLevel = formData.get('reorderLevel') as string;
    const unit = formData.get('unit') as string;
    const status = formData.get('status') as string;
    const file = formData.get('image') as File;

    // Validation
    if (!name || !price) {
      return NextResponse.json(
        createErrorResponse('Missing required fields (name, price)', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    // Generate SKU if not provided
    const productSku: string = (skuValue?.toString().trim()) || generateSKU();

    // Check if SKU already exists
    const existing = await prisma.product.findUnique({
      where: { sku: productSku },
    });

    if (existing) {
      return NextResponse.json(
        createErrorResponse('SKU already exists', 'DUPLICATE_SKU'),
        { status: 400 }
      );
    }

    let imageUrl: string | null = null;

    // Handle file upload if provided
    if (file) {
      try {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
          return NextResponse.json(
            createErrorResponse('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed', 'INVALID_FILE_TYPE'),
            { status: 400 }
          );
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          return NextResponse.json(
            createErrorResponse('File size exceeds 5MB limit', 'FILE_TOO_LARGE'),
            { status: 400 }
          );
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'products');
        await mkdir(uploadsDir, { recursive: true });

        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const ext = file.name.split('.').pop();
        const filename = `${productSku}-${timestamp}-${random}.${ext}`;
        const filepath = join(uploadsDir, filename);

        // Save file
        const bytes = await file.arrayBuffer();
        await writeFile(filepath, Buffer.from(bytes));

        imageUrl = `/uploads/products/${filename}`;
      } catch (error) {
        console.error('File upload error:', error);
        return NextResponse.json(
          createErrorResponse('Failed to upload image', 'UPLOAD_ERROR'),
          { status: 500 }
        );
      }
    }

    // Create product in database
    const product = await prisma.product.create({
      data: {
        sku: productSku,
        name,
        description: description || null,
        price: parseFloat(price),
        cost: cost ? parseFloat(cost) : null,
        quantity: quantity ? parseInt(quantity, 10) : 0,
        reorderLevel: Number.isFinite(Number(reorderLevel)) ? Number(reorderLevel) : undefined,
        unit: unit?.trim() || undefined,
        category: category || null,
        imageUrl,
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
        imageUrl: product.imageUrl,
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
