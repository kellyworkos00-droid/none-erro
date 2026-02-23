import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createExpenseCategorySchema } from '@/lib/validations';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

/**
 * GET /api/expense-categories
 * List expense categories
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'expense_category.view');

    const categories = await prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(createSuccessResponse({ categories }), { status: 200 });
  } catch (error) {
    console.error('Get expense categories error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/expense-categories
 * Create an expense category
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'expense_category.create');
    const body = await request.json();
    const parsed = createExpenseCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { name, monthlyBudget, alertThresholdPercent } = parsed.data;

    const existing = await prisma.expenseCategory.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        createErrorResponse('Category already exists', 'DUPLICATE_NAME'),
        { status: 400 }
      );
    }

    const category = await prisma.expenseCategory.create({
      data: {
        name,
        monthlyBudget: monthlyBudget ?? 0,
        alertThresholdPercent: alertThresholdPercent ?? 80,
      },
    });

    await createAuditLog({
      userId: user.userId,
      action: 'CREATE_EXPENSE_CATEGORY',
      entityType: 'ExpenseCategory',
      entityId: category.id,
      description: `Expense category created: ${category.name}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { categoryName: category.name },
    });

    return NextResponse.json(
      createSuccessResponse(category, 'Expense category created'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create expense category error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
