import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const milestoneSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED']).optional(),
  amount: z.number().min(0).optional(),
});

/**
 * GET /api/projects/[id]/milestones
 * Get project milestones
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoles(request, ['ADMIN', 'FINANCE_MANAGER']);

    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId: params.id },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json(
      createSuccessResponse(milestones),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get milestones error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/milestones
 * Create milestone
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoles(request, ['ADMIN', 'FINANCE_MANAGER']);
    const body = await request.json();
    const parsed = milestoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId: params.id,
        name: parsed.data.name,
        description: parsed.data.description,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        status: parsed.data.status || 'PENDING',
        amount: parsed.data.amount || 0,
      },
    });

    return NextResponse.json(
      createSuccessResponse(milestone, 'Milestone created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create milestone error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
