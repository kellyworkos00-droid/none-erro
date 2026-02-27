/**
 * API Route: /api/hr/employees/[id]
 * Single Employee Operations
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createApiResponse } from '@/lib/response';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { z } from 'zod';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  departmentId: z.string().nullable().optional(),
  position: z.string().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
  employmentStatus: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']).optional(),
  terminationDate: z.string().datetime().nullable().optional(),
  basicSalary: z.number().min(0).optional(),
  currency: z.string().optional(),
  paymentFrequency: z.enum(['MONTHLY', 'WEEKLY', 'BIWEEKLY']).optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  taxId: z.string().optional(),
  nhifNumber: z.string().optional(),
  nssfNumber: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/hr/employees/[id]
 * Get employee by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse(request);

  try {
    await requirePermission(request, 'employee.view');

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        department: true,
        payrolls: {
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
        leaves: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            payrolls: true,
            leaves: true,
            attendances: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee');
    }

    return api.success(employee, 'Employee retrieved successfully');
  } catch (error) {
    throw error;
  }
}

/**
 * PUT /api/hr/employees/[id]
 * Update employee
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse(request);

  try {
    const user = await requirePermission(request, 'employee.edit');
    const body = await request.json();
    const data = updateEmployeeSchema.parse(body);

    // Check if employee exists
    const existing = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      throw new NotFoundError('Employee');
    }

    // If email is being changed, check for conflicts
    if (data.email && data.email !== existing.email) {
      const emailExists = await prisma.employee.findFirst({
        where: {
          email: data.email,
          id: { not: params.id },
        },
      });

      if (emailExists) {
        throw new ValidationError('Email already exists');
      }
    }

    // Update employee
    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        terminationDate: data.terminationDate ? new Date(data.terminationDate) : null,
      },
      include: {
        department: true,
      },
    });

    // Audit log
    await createAuditLog({
      userId: user.userId,
      action: 'UPDATE_EMPLOYEE',
      entityType: 'Employee',
      entityId: employee.id,
      description: `Updated employee: ${employee.firstName} ${employee.lastName}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    return api.success(employee, 'Employee updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid employee data', error.errors);
    }
    throw error;
  }
}

/**
 * DELETE /api/hr/employees/[id]
 * Delete employee
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse(request);

  try {
    const user = await requirePermission(request, 'employee.delete');

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!employee) {
      throw new NotFoundError('Employee');
    }

    await prisma.employee.delete({
      where: { id: params.id },
    });

    // Audit log
    await createAuditLog({
      userId: user.userId,
      action: 'DELETE_RECORD',
      entityType: 'Employee',
      entityId: params.id,
      description: `Deleted employee: ${employee.firstName} ${employee.lastName}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    return api.success({ id: params.id }, 'Employee deleted successfully');
  } catch (error) {
    throw error;
  }
}
