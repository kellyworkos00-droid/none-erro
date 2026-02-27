import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
