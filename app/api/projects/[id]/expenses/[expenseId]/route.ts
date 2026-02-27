import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateExpenseSchema = z.object({
  description: z.string().min(1).optional(),
  category: z.enum(['LABOR', 'MATERIALS', 'EQUIPMENT', 'SUBCONTRACTOR', 'OVERHEAD', 'OTHER']).optional(),
  amount: z.number().min(0).optional(),
  date: z.string().optional(),
  notes: z.string().optional().nullable(),
});

/**
 * PUT /api/projects/[id]/expenses/[expenseId]
 * Update a project expense
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; expenseId: string } }
) {
  try {
    await requireRoles(request, ['ADMIN', 'FINANCE_MANAGER']);
    const body = await request.json();
    const parsed = updateExpenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    // Verify the expense exists and belongs to this project
    const expense = await prisma.projectExpense.findFirst({
      where: {
        id: params.expenseId,
        projectId: params.id,
      },
    });

    if (!expense) {
      return NextResponse.json(
        createErrorResponse('Expense not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    // Update the expense
    const updatedExpense = await prisma.projectExpense.update({
      where: { id: params.expenseId },
      data: {
        ...(parsed.data.description && { description: parsed.data.description }),
        ...(parsed.data.category && { category: parsed.data.category }),
        ...(parsed.data.amount !== undefined && { amount: parsed.data.amount }),
        ...(parsed.data.date && { date: new Date(parsed.data.date) }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
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
      createSuccessResponse(updatedExpense, 'Expense updated successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/expenses/[expenseId]
 * Delete a project expense
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; expenseId: string } }
) {
  try {
    await requireRoles(request, ['ADMIN', 'FINANCE_MANAGER']);

    // Verify the expense exists and belongs to this project
    const expense = await prisma.projectExpense.findFirst({
      where: {
        id: params.expenseId,
        projectId: params.id,
      },
    });

    if (!expense) {
      return NextResponse.json(
        createErrorResponse('Expense not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    // Delete the expense
    await prisma.projectExpense.delete({
      where: { id: params.expenseId },
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
      createSuccessResponse(null, 'Expense deleted successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
