import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const expenseSchema = z.object({
  category: z.enum(['LABOR', 'MATERIALS', 'EQUIPMENT', 'SUBCONTRACTOR', 'OVERHEAD', 'OTHER']),
  description: z.string().min(1),
  amount: z.number().min(0),
  date: z.string().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/projects/[id]/expenses
 * Get project expenses
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoles(request, ['ADMIN', 'FINANCE_MANAGER']);

    const expenses = await prisma.projectExpense.findMany({
      where: { projectId: params.id },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(
      createSuccessResponse(expenses),
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
 * POST /api/projects/[id]/expenses
 * Create expense
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoles(request, ['ADMIN', 'FINANCE_MANAGER']);
    const body = await request.json();
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const expense = await prisma.projectExpense.create({
      data: {
        projectId: params.id,
        category: parsed.data.category,
        description: parsed.data.description,
        amount: parsed.data.amount,
        date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
        notes: parsed.data.notes,
      },
    });

    // Update project actualExpenses total
    const totalExpenses = await prisma.projectExpense.aggregate({
      where: { projectId: params.id },
      _sum: { amount: true },
    });

    await prisma.project.update({
      where: { id: params.id },
      data: { actualExpenses: totalExpenses._sum.amount || 0 },
    });

    return NextResponse.json(
      createSuccessResponse(expense, 'Expense recorded successfully'),
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
