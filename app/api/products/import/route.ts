import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse, generateSKU } from '@/lib/utils';
import { verifyToken } from '@/lib/auth';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';

type CsvRow = Record<string, string>;

const VALID_STATUSES = new Set(['ACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED', 'INACTIVE']);

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function getField(row: CsvRow, key: string): string {
  return (row[key] || '').trim();
}

function getFirstField(row: CsvRow, keys: string[]): string {
  for (const key of keys) {
    const value = getField(row, key);
    if (value) return value;
  }
  return '';
}

function parseRequiredNumber(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumber(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInt(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

/**
 * POST /api/products/import
 * Import products from CSV file
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'UNAUTHORIZED'), { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'INVALID_TOKEN'), { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        createErrorResponse('CSV file is required (field name: file)', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        createErrorResponse('Invalid file type. Please upload a CSV file', 'INVALID_FILE_TYPE'),
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const parsed = Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: normalizeHeader,
    });

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        createErrorResponse(`CSV parse error: ${parsed.errors[0].message}`, 'CSV_PARSE_ERROR'),
        { status: 400 }
      );
    }

    if (!parsed.data || parsed.data.length === 0) {
      return NextResponse.json(
        createErrorResponse('CSV file has no data rows', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const seenSkus = new Set<string>();
    const errors: Array<{ row: number; reason: string }> = [];
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < parsed.data.length; i += 1) {
      const row = parsed.data[i];
      const rowNumber = i + 2;

      const name = getFirstField(row, ['name', 'productname', 'title']);
      const priceRaw = getFirstField(row, ['price', 'sellingprice', 'saleprice', 'unitprice']);
      const price = parseRequiredNumber(priceRaw);

      if (!name || price === null) {
        skipped += 1;
        errors.push({
          row: rowNumber,
          reason: 'Missing required fields: name and price are required',
        });
        continue;
      }

      // Generate or use provided SKU
      const providedSku = getFirstField(row, ['sku', 'productsku', 'code']);
      const sku = providedSku || generateSKU();
      const skuKey = sku.toLowerCase();

      if (seenSkus.has(skuKey)) {
        skipped += 1;
        errors.push({ row: rowNumber, reason: `Duplicate SKU in CSV: ${sku}` });
        continue;
      }
      seenSkus.add(skuKey);

      const statusRaw = getField(row, 'status').toUpperCase();
      const status = statusRaw && VALID_STATUSES.has(statusRaw) ? statusRaw : 'ACTIVE';

      const cost = parseOptionalNumber(getFirstField(row, ['cost', 'costprice', 'buyingprice']));
      const quantity = parseOptionalInt(getFirstField(row, ['quantity', 'qty', 'stock', 'openingstock'])) ?? 0;
      const reorderLevel = parseOptionalInt(getFirstField(row, ['reorderlevel', 'reorderpoint', 'minimumstock', 'minstock'])) ?? 10;
      const unit = getFirstField(row, ['unit', 'uom']) || 'UNIT';
      const category = getField(row, 'category') || null;
      const description = getFirstField(row, ['description', 'details']) || null;

      if (quantity < 0 || reorderLevel < 0) {
        skipped += 1;
        errors.push({
          row: rowNumber,
          reason: 'Quantity and reorder level cannot be negative',
        });
        continue;
      }

      try {
        await prisma.product.create({
          data: {
            sku,
            name,
            description,
            price,
            cost,
            quantity,
            reorderLevel,
            unit,
            category,
            status,
          },
        });
        created += 1;
      } catch {
        skipped += 1;
        errors.push({
          row: rowNumber,
          reason: `Product could not be created (likely duplicate SKU): ${sku}`,
        });
      }
    }

    await createAuditLog({
      userId: payload.userId,
      action: 'IMPORT_PRODUCTS',
      entityType: 'Product',
      description: `Imported ${created} products (skipped ${skipped})`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: {
        imported: created,
        skipped,
        totalRows: parsed.data.length,
      },
    });

    return NextResponse.json(
      createSuccessResponse(
        {
          imported: created,
          skipped,
          totalRows: parsed.data.length,
          errors,
        },
        'CSV import completed'
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to import products from CSV:', error);
    return NextResponse.json(
      createErrorResponse('Failed to import products from CSV', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
