import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createExpenseSchema } from '@/lib/validations';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import type { TransactionClient } from '@/lib/types';

const EXPENSE_PREFIX = 'EXP-';

const getNextExpenseNumber = async (tx: TransactionClient) => {
  const latest = await tx.expense.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { expenseNumber: true },
  });

  const lastDigits = latest?.expenseNumber?.match(/(\d+)$/)?.[1];
  const lastValue = lastDigits ? parseInt(lastDigits, 10) : 0;
  const count = await tx.expense.count();
  const nextValue = Math.max(lastValue, count) + 1;

  return `${EXPENSE_PREFIX}${nextValue.toString().padStart(6, '0')}`;
};

/**
 * GET /api/expenses
 * List expenses
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'expense.view');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category') || '';

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      ...(category ? { category } : {}),
    };

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
        include: { createdByUser: true, categoryRef: true },
      }),
      prisma.expense.count({ where }),
    ]);

    return NextResponse.json(
      createSuccessResponse({
        items: expenses,
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
    console.error('Get expenses error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/expenses
 * Create an expense
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'expense.create');
    const body = await request.json();
    const parsed = createExpenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const {
      category,
      categoryId,
      amount,
      description,
      expenseDate,
      paymentMethod,
      vendor,
      reference,
    } = parsed.data;

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const expenseNumber = await getNextExpenseNumber(tx);
      const categoryRecord = categoryId
        ? await tx.expenseCategory.findUnique({ where: { id: categoryId } })
        : null;

      const createdExpense = await tx.expense.create({
        data: {
          expenseNumber,
          category: categoryRecord?.name || category,
          categoryId: categoryRecord?.id || null,
          amount,
          description: description || null,
          expenseDate: new Date(expenseDate),
          paymentMethod: paymentMethod || null,
          vendor: vendor || null,
          reference: reference || null,
          createdBy: user.userId,
        },
        include: { categoryRef: true },
      });

      let budgetAlert: string | null = null;
      if (categoryRecord && categoryRecord.monthlyBudget > 0) {
        const expenseDateObj = new Date(expenseDate);
        const startOfMonth = new Date(
          expenseDateObj.getFullYear(),
          expenseDateObj.getMonth(),
          1
        );
        const endOfMonth = new Date(
          expenseDateObj.getFullYear(),
          expenseDateObj.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );

        const totals = await tx.expense.aggregate({
          where: {
            categoryId: categoryRecord.id,
            expenseDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          _sum: { amount: true },
        });

        const totalSpent = totals._sum.amount || 0;
        const threshold = (categoryRecord.monthlyBudget * categoryRecord.alertThresholdPercent) / 100;
        if (totalSpent >= threshold) {
          budgetAlert = `Budget alert: ${categoryRecord.name} has reached ${Math.round(
            (totalSpent / categoryRecord.monthlyBudget) * 100
          )}% of its monthly budget.`;
        }
      }

      return { expense: createdExpense, budgetAlert };
    });

    await createAuditLog({
      userId: user.userId,
      action: 'CREATE_EXPENSE',
      entityType: 'Expense',
      entityId: result.expense.id,
      description: `Expense created: ${result.expense.expenseNumber}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { expenseNumber: result.expense.expenseNumber },
    });

    return NextResponse.json(
      createSuccessResponse(result, 'Expense created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
