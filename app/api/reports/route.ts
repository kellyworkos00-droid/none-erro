import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/response';

/**
 * GET /api/reports
 * Fetch all saved custom reports for the authenticated user
 *
 * Query parameters:
 * - limit: number of results (default: 10)
 * - offset: pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (limit < 1 || limit > 100) {
      return errorResponse('Limit must be between 1 and 100', 400);
    }

    if (offset < 0) {
      return errorResponse('Offset must be non-negative', 400);
    }

    const reports = await prisma.reportTemplate.findMany({
      where: {
        createdById: user.userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        reportType: true,
        columns: true,
        filters: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.reportTemplate.count({
      where: {
        createdById: user.userId,
      },
    });

    return successResponse({
      reports,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return errorResponse('Failed to fetch reports', 500);
  }
}

/**
 * POST /api/reports
 * Create a new custom report template
 *
 * Body:
 * - name: string (required)
 * - description: string
 * - reportType: "aging" | "cashflow" | "dashboard" (required)
 * - columns: string[] (array of column names to display)
 * - filters: object (custom filters - date range, customer, amount range, etc)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // Check authorization
    if (!['ADMIN', 'FINANCE_MANAGER'].includes(user.role || '')) {
      return errorResponse('Insufficient permissions', 403);
    }

    const body = await request.json();
    const { name, description, reportType, columns, filters } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('Name is required and must be a non-empty string', 400);
    }

    if (!reportType || !['aging', 'cashflow', 'dashboard'].includes(reportType)) {
      return errorResponse('Invalid or missing reportType', 400);
    }

    if (!Array.isArray(columns)) {
      return errorResponse('Columns must be an array', 400);
    }

    if (columns.length === 0) {
      return errorResponse('At least one column must be selected', 400);
    }

    // Validate column names (basic allowed columns)
    const allowedColumns = [
      'date',
      'amount',
      'customer',
      'status',
      'reference',
      'description',
      'daysOutstanding',
      'invoiceCount',
      'totalAmount',
    ];

    for (const col of columns) {
      if (typeof col !== 'string' || !allowedColumns.includes(col)) {
        return errorResponse(`Invalid column: ${col}`, 400);
      }
    }

    // Normalize filters
    const normalizedFilters = filters || {};

    const report = await prisma.reportTemplate.create({
      data: {
        name: name.trim(),
        description: description || null,
        reportType,
        columns,
        filters: normalizedFilters,
        createdById: user.userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        reportType: true,
        columns: true,
        filters: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(report, 201);
  } catch (error) {
    console.error('Error creating report:', error);
    return errorResponse('Failed to create report', 500);
  }
}
