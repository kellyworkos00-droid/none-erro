/**
 * API Route: /api/hr/leaves
 * Leave Management
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createApiResponse } from '@/lib/response';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { getClientIp, getUserAgent } from '@/lib/request-utils';

export const dynamic = 'force-dynamic';

const createLeaveSchema = z.object({
  employeeId: z.string(),
  leaveType: z.enum(['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().min(10),
});

const approveLeaveSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
});

/**
 * Calculate days between two dates
 */
function calculateDays(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Include both start and end date
}

/**
 * GET /api/hr/leaves
 * Get leave records
 */
export async function GET(request: NextRequest) {
  const api = createApiResponse(request);

  try {
    await requirePermission(request, 'admin');

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const leaveType = searchParams.get('type');

    const leaves = await prisma.leave.findMany({
      where: {
        ...(employeeId && { employeeId }),
        ...(status && { status }),
        ...(leaveType && { leaveType }),
      },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      total: leaves.length,
      pending: leaves.filter(l => l.status === 'PENDING').length,
      approved: leaves.filter(l => l.status === 'APPROVED').length,
      rejected: leaves.filter(l => l.status === 'REJECTED').length,
      totalDays: leaves
        .filter(l => l.status === 'APPROVED')
        .reduce((sum: number, l: { daysRequested: number }) => sum + l.daysRequested, 0),
    };

    return api.success(
      {
        leaves,
        summary,
      },
      'Leaves retrieved successfully'
    );
  } catch (error) {
    throw error;
  }
}

/**
 * POST /api/hr/leaves
 * Create leave request
 */
export async function POST(request: NextRequest) {
  const api = createApiResponse(request);

  try {
    const user = await requirePermission(request, 'admin');
    const body = await request.json();
    const data = createLeaveSchema.parse(body);

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    // Validate dates
    if (endDate < startDate) {
      throw new ValidationError('End date must be after start date');
    }

    // Calculate days
    const daysRequested = calculateDays(startDate, endDate);

    // Check for overlapping leaves
    const overlapping = await prisma.leave.findFirst({
      where: {
        employeeId: data.employeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      throw new ValidationError('Employee already has leave during this period');
    }

    // Create leave request
    const leave = await prisma.leave.create({
      data: {
        employeeId: data.employeeId,
        leaveType: data.leaveType,
        startDate,
        endDate,
        daysRequested,
        reason: data.reason,
        status: 'PENDING',
      },
      include: {
        employee: true,
      },
    });

    // Audit log
    await createAuditLog({
      userId: user.userId,
      action: 'CREATE_EXPENSE_CATEGORY', // Using existing, can add CREATE_LEAVE later
      entityType: 'Leave',
      entityId: leave.id,
      description: `Created leave request for ${leave.employee.firstName} ${leave.employee.lastName}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    return api.created(leave, 'Leave request created successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid leave data', error.errors);
    }
    throw error;
  }
}

/**
 * PATCH /api/hr/leaves/[id]
 * Approve or reject leave
 */
export async function PATCH(request: NextRequest) {
  const api = createApiResponse(request);

  try {
    const user = await requirePermission(request, 'admin');
    const { searchParams } = new URL(request.url);
    const leaveId = searchParams.get('id');

    if (!leaveId) {
      throw new ValidationError('Leave ID is required');
    }

    const body = await request.json();
    const data = approveLeaveSchema.parse(body);

    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
      include: { employee: true },
    });

    if (!leave) {
      throw new NotFoundError('Leave');
    }

    if (leave.status !== 'PENDING') {
      throw new ValidationError('Leave has already been processed');
    }

    // Update leave
    const updated = await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: data.status,
        approvedBy: user.userId,
        approvedDate: new Date(),
        rejectionReason: data.rejectionReason,
      },
      include: {
        employee: true,
      },
    });

    // If approved, update employee status if needed
    if (data.status === 'APPROVED') {
      const today = new Date();
      if (updated.startDate <= today && updated.endDate >= today) {
        await prisma.employee.update({
          where: { id: updated.employeeId },
          data: { employmentStatus: 'ON_LEAVE' },
        });
      }
    }

    // Audit log
    await createAuditLog({
      userId: user.userId,
      action: 'APPROVE_LEAVE',
      entityType: 'Leave',
      entityId: updated.id,
      description: `${data.status === 'APPROVED' ? 'Approved' : 'Rejected'} leave for ${updated.employee.firstName} ${updated.employee.lastName}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    return api.success(updated, `Leave ${data.status.toLowerCase()} successfully`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid approval data', error.errors);
    }
    throw error;
  }
}
