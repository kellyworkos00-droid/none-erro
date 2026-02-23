import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRoles } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireRoles(request, ['ADMIN', 'FINANCE_MANAGER']);

    const projects = await prisma.project.findMany({
      select: {
        status: true,
        quotedAmount: true,
        actualExpenses: true,
        estimatedExpenses: true,
      },
    });

    const totalProjects = projects.length;
    const activeProjects = projects.filter(
      (project) => project.status !== 'COMPLETED' && project.status !== 'CANCELLED'
    ).length;
    const completedProjects = projects.filter((project) => project.status === 'COMPLETED').length;
    const totalBudget = projects.reduce((sum, project) => sum + project.quotedAmount, 0);
    const totalSpent = projects.reduce((sum, project) => sum + project.actualExpenses, 0);
    const projectsAtRisk = projects.filter(
      (project) => project.estimatedExpenses > project.quotedAmount || project.actualExpenses > project.quotedAmount
    ).length;

    const summary = {
      totalProjects,
      activeProjects,
      completedProjects,
      totalBudget,
      totalSpent,
      projectsAtRisk,
    };

    return NextResponse.json(
      createSuccessResponse(summary),
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
          { status: 401 }
        );
      }

      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          createErrorResponse('Insufficient permissions', 'FORBIDDEN'),
          { status: 403 }
        );
      }
    }

    console.error('Error fetching project summary:', error);
    return NextResponse.json(
      createErrorResponse('Failed to fetch project summary', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
