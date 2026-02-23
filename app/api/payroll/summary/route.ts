import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'reports.view');

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalEmployees, monthlyPayrollExpenses, pendingPayrollExpenses] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.expense.aggregate({
        where: {
          expenseDate: { gte: startOfMonth },
          OR: [
            { category: { contains: 'payroll', mode: 'insensitive' } },
            { category: { contains: 'salary', mode: 'insensitive' } },
          ],
        },
        _sum: { amount: true },
      }),
      prisma.expense.count({
        where: {
          expenseDate: { gte: startOfMonth },
          OR: [
            { category: { contains: 'payroll', mode: 'insensitive' } },
            { category: { contains: 'salary', mode: 'insensitive' } },
          ],
          paymentMethod: null,
        },
      }),
    ]);

    const totalMonthlyPayroll = monthlyPayrollExpenses._sum.amount ?? 0;
    const summary = {
      totalEmployees,
      totalMonthlyPayroll,
      totalYearlyPayroll: totalMonthlyPayroll * 12,
      pendingPayrolls: pendingPayrollExpenses,
    };

    return NextResponse.json(createSuccessResponse(summary), { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        createErrorResponse('Insufficient permissions', 'FORBIDDEN'),
        { status: 403 }
      );
    }

    console.error('Error fetching payroll summary:', error);
    return NextResponse.json(
      createErrorResponse('Failed to fetch payroll summary', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
