import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireRoles } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  clientName: z.string().min(1).optional(),
  tenderReference: z.string().optional(),
  description: z.string().optional(),
  quotedAmount: z.number().min(0).optional(),
  estimatedExpenses: z.number().min(0).optional(),
  actualExpenses: z.number().min(0).optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  completedDate: z.string().datetime().optional(),
  progress: z.number().min(0).max(100).optional(),
  projectManager: z.string().optional(),
  teamMembers: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  invoicedAmount: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
  attachments: z.string().optional(),
  tags: z.string().optional(),
  isArchived: z.boolean().optional(),
});

/**
 * GET /api/projects/[id]
 * Get single project details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoles(request, ['ADMIN', 'FINANCE_MANAGER']);

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        createdByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        milestones: {
          orderBy: { dueDate: 'asc' },
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
          include: {
            createdByUser: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        createErrorResponse('Project not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createSuccessResponse(project),
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

    console.error('Get project error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]
 * Update project
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoles(request, ['ADMIN', 'FINANCE_MANAGER']);
    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const updateData: Prisma.ProjectUpdateInput = { ...parsed.data };
    
    // Convert date strings to Date objects
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    if (updateData.completedDate) updateData.completedDate = new Date(updateData.completedDate);

    const project = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
      include: {
        createdByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        milestones: true,
        expenses: true,
      },
    });

    return NextResponse.json(
      createSuccessResponse(project, 'Project updated successfully'),
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

    console.error('Update project error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoles(request, ['ADMIN']);

    await prisma.project.delete({
      where: { id: params.id },
    });

    return NextResponse.json(
      createSuccessResponse(null, 'Project deleted successfully'),
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

    console.error('Delete project error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
