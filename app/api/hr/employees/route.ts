/**
 * API Route: /api/hr/employees
 * Employee Management
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createApiResponse } from '@/lib/response';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { z } from 'zod';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const createEmployeeSchema = z.object({
  employeeNumber: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('Kenya'),
  departmentId: z.string().optional(),
  position: z.string().min(1),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).default('FULL_TIME'),
  hireDate: z.string().datetime().optional(),
  basicSalary: z.number().min(0),
  currency: z.string().default('KES'),
  paymentFrequency: z.enum(['MONTHLY', 'WEEKLY', 'BIWEEKLY']).default('MONTHLY'),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  taxId: z.string().optional(),
  nhifNumber: z.string().optional(),
  nssfNumber: z.string().optional(),
});

/**
 * GET /api/hr/employees
 * Get all employees
 */
export async function GET(request: NextRequest) {
  const api = createApiResponse(request);

  try {
    await requirePermission(request, 'admin');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');

    const employees = await prisma.employee.findMany({
      where: {
        ...(status && { employmentStatus: status }),
        ...(departmentId && { departmentId }),
      },
      include: {
        department: true,
        _count: {
          select: {
            payrolls: true,
            leaves: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return api.success(
      {
        employees,
        total: employees.length,
        active: employees.filter((employee) => employee.employmentStatus === 'ACTIVE').length,
      },
      'Employees retrieved successfully'
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Permission')) {
      return api.error(new ValidationError('Insufficient permissions'));
    }
    throw error;
  }
}

/**
 * POST /api/hr/employees
 * Create new employee
 */
export async function POST(request: NextRequest) {
  const api = createApiResponse(request);

  try {
    const user = await requirePermission(request, 'admin');
    const body = await request.json();
    const data = createEmployeeSchema.parse(body);

    // Check if employee number already exists
    const existing = await prisma.employee.findUnique({
      where: { employeeNumber: data.employeeNumber },
    });

    if (existing) {
      throw new ValidationError('Employee number already exists');
    }

    // Check if email already exists
    const existingEmail = await prisma.employee.findUnique({
      where: { email: data.email },
    });

    if (existingEmail) {
      throw new ValidationError('Email already exists');
    }

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
      },
      include: {
        department: true,
      },
    });

    // Audit log
    await createAuditLog({
      userId: user.userId,
      action: 'CREATE_EMPLOYEE',
      entityType: 'Employee',
      entityId: employee.id,
      description: `Created employee: ${employee.firstName} ${employee.lastName}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    return api.created(employee, 'Employee created successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid employee data', error.errors);
    }
    throw error;
  }
}
