/**
 * API Route: /api/hr/departments
 * Department Management
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createApiResponse } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { z } from 'zod';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const departmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  managerId: z.string().optional(),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/hr/departments
 * Get all departments
 */
export async function GET(request: NextRequest) {
  const api = createApiResponse(request);

  try {
    await requirePermission(request, 'admin');

    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return api.success(
      {
        departments,
        total: departments.length,
      },
      'Departments retrieved successfully'
    );
  } catch (error) {
    throw error;
  }
}

/**
 * POST /api/hr/departments
 * Create new department
 */
export async function POST(request: NextRequest) {
  const api = createApiResponse(request);

  try {
    const user = await requirePermission(request, 'admin');
    const body = await request.json();
    const data = departmentSchema.parse(body);

    // Check if department name already exists
    const existing = await prisma.department.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ValidationError('Department name already exists');
    }

    const department = await prisma.department.create({
      data,
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    // Audit log
    await createAuditLog({
      userId: user.userId,
      action: 'CREATE_EXPENSE_CATEGORY', // Using existing action, can add CREATE_DEPARTMENT later
      entityType: 'Department',
      entityId: department.id,
      description: `Created department: ${department.name}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    return api.created(department, 'Department created successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid department data', error.errors);
    }
    throw error;
  }
}
