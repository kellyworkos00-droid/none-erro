/**
 * API Route: /api/hr/payroll
 * Payroll Processing
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createApiResponse } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { getClientIp, getUserAgent } from '@/lib/request-utils';

export const dynamic = 'force-dynamic';

const processPayrollSchema = z.object({
  employeeId: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  allowances: z.number().min(0).default(0),
  bonuses: z.number().min(0).default(0),
  overtime: z.number().min(0).default(0),
  otherDeductions: z.number().min(0).default(0),
  notes: z.string().optional(),
});

/**
 * Calculate PAYE tax for Kenya
 */
function calculatePAYE(grossPay: number): number {
  let tax = 0;
  
  if (grossPay <= 24000) {
    tax = grossPay * 0.1;
  } else if (grossPay <= 32333) {
    tax = 2400 + (grossPay - 24000) * 0.25;
  } else if (grossPay <= 500000) {
    tax = 4483.25 + (grossPay - 32333) * 0.30;
  } else if (grossPay <= 800000) {
    tax = 144783.35 + (grossPay - 500000) * 0.325;
  } else {
    tax = 242283.35 + (grossPay - 800000) * 0.35;
  }
  
  // Personal relief
  tax = Math.max(0, tax - 2400);
  
  return Math.round(tax * 100) / 100;
}

/**
 * Calculate NHIF deduction for Kenya
 */
function calculateNHIF(grossPay: number): number {
  if (grossPay < 6000) return 150;
  if (grossPay < 8000) return 300;
  if (grossPay < 12000) return 400;
  if (grossPay < 15000) return 500;
  if (grossPay < 20000) return 600;
  if (grossPay < 25000) return 750;
  if (grossPay < 30000) return 850;
  if (grossPay < 35000) return 900;
  if (grossPay < 40000) return 950;
  if (grossPay < 45000) return 1000;
  if (grossPay < 50000) return 1100;
  if (grossPay < 60000) return 1200;
  if (grossPay < 70000) return 1300;
  if (grossPay < 80000) return 1400;
  if (grossPay < 90000) return 1500;
  if (grossPay < 100000) return 1600;
  return 1700;
}

/**
  * Calculate NSSF deduction for Kenya (new rates 2023)
 */
function calculateNSSF(grossPay: number): number {
  const tierI = Math.min(grossPay, 7000) * 0.06;
  const tierII = Math.max(0, Math.min(grossPay - 7000, 29000)) * 0.06;
  return Math.round((tierI + tierII) * 100) / 100;
}

/**
 * GET /api/hr/payroll
 * Get payroll records
 */
export async function GET(request: NextRequest) {
  const api = createApiResponse(request);

  try {
    await requirePermission(request, 'admin');

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    const payrolls = await prisma.payroll.findMany({
      where: {
        ...(month && { month: parseInt(month) }),
        ...(year && { year: parseInt(year) }),
        ...(employeeId && { employeeId }),
        ...(status && { status }),
      },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
        deductions: true,
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });

    const summary = {
      total: payrolls.length,
      totalGross: payrolls.reduce((sum: number, p: { grossPay: number }) => sum + p.grossPay, 0),
      totalNet: payrolls.reduce((sum: number, p: { netPay: number }) => sum + p.netPay, 0),
      totalDeductions: payrolls.reduce((sum: number, p: { totalDeductions: number }) => sum + p.totalDeductions, 0),
      byStatus: {
        draft: payrolls.filter(p => p.status === 'DRAFT').length,
        processed: payrolls.filter(p => p.status === 'PROCESSED').length,
        paid: payrolls.filter(p => p.status === 'PAID').length,
      },
    };

    return api.success(
      {
        payrolls,
        summary,
      },
      'Payrolls retrieved successfully'
    );
  } catch (error) {
    throw error;
  }
}

/**
 * POST /api/hr/payroll
 * Process payroll for an employee
 */
export async function POST(request: NextRequest) {
  const api = createApiResponse(request);

  try {
    const user = await requirePermission(request, 'admin');
    const body = await request.json();
    const data = processPayrollSchema.parse(body);

    // Get employee
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee) {
      throw new ValidationError('Employee not found');
    }

    if (employee.employmentStatus !== 'ACTIVE') {
      throw new ValidationError('Cannot process payroll for inactive employee');
    }

    // Check if payroll already exists
    const existing = await prisma.payroll.findUnique({
      where: {
        employeeId_month_year: {
          employeeId: data.employeeId,
          month: data.month,
          year: data.year,
        },
      },
    });

    if (existing) {
      throw new ValidationError('Payroll for this period already exists');
    }

    // Calculate payroll
    const basicSalary = employee.basicSalary;
    const allowances = data.allowances;
    const bonuses = data.bonuses;
    const overtime = data.overtime;
    const grossPay = basicSalary + allowances + bonuses + overtime;

    const taxAmount = calculatePAYE(grossPay);
    const nhifAmount = calculateNHIF(grossPay);
    const nssfAmount = calculateNSSF(grossPay);
    const totalDeductions = taxAmount + nhifAmount + nssfAmount + data.otherDeductions;
    const netPay = grossPay - totalDeductions;

    // Create payroll record
    const payroll = await prisma.payroll.create({
      data: {
        employeeId: data.employeeId,
        month: data.month,
        year: data.year,
        basicSalary,
        allowances,
        bonuses,
        overtime,
        grossPay,
        taxAmount,
        nhifAmount,
        nssfAmount,
        otherDeductions: data.otherDeductions,
        totalDeductions,
        netPay,
        notes: data.notes,
        status: 'DRAFT',
      },
      include: {
        employee: true,
        deductions: true,
      },
    });

    // Create breakdown deductions
    await prisma.payrollDeduction.createMany({
      data: [
        {
          payrollId: payroll.id,
          deductionType: 'TAX',
          description: 'PAYE Tax',
          amount: taxAmount,
        },
        {
          payrollId: payroll.id,
          deductionType: 'NHIF',
          description: 'NHIF Contribution',
          amount: nhifAmount,
        },
        {
          payrollId: payroll.id,
          deductionType: 'NSSF',
          description: 'NSSF Contribution',
          amount: nssfAmount,
        },
        ...(data.otherDeductions > 0 ? [{
          payrollId: payroll.id,
          deductionType: 'OTHER',
          description: 'Other Deductions',
          amount: data.otherDeductions,
        }] : []),
      ],
    });

    // Audit log
    await createAuditLog({
      userId: user.userId,
      action: 'PROCESS_PAYROLL',
      entityType: 'Payroll',
      entityId: payroll.id,
      description: `Processed payroll for ${employee.firstName} ${employee.lastName} - ${data.month}/${data.year}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    return api.created(payroll, 'Payroll processed successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid payroll data', error.errors);
    }
    throw error;
  }
}
