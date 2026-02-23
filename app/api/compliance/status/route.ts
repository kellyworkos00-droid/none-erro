import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get real audit log data from database
    const totalAuditLogs = await prisma.auditLog.count();
    
    // Get the most recent audit log
    const lastAudit = await prisma.auditLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    // Calculate alerts based on recent failed login attempts or critical actions
    const recentFailures = await prisma.auditLog.count({
      where: {
        action: 'LOGIN',
        description: { contains: 'failed' },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      },
    });

    const criticalAlerts = recentFailures >= 5 ? 1 : 0; // Flag if 5+ failed logins
    const warningAlerts = recentFailures >= 3 && recentFailures < 5 ? 1 : 0;

    // Calculate compliance score
    let complianceScore = 100;
    if (criticalAlerts > 0) complianceScore -= 20;
    if (warningAlerts > 0) complianceScore -= 5;
    if (totalAuditLogs === 0) complianceScore -= 10; // No audit trail

    const status = {
      totalAuditLogs,
      criticalAlerts,
      warningAlerts,
      complianceScore,
      lastAuditDate: lastAudit?.createdAt.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json({ data: status });
  } catch (error) {
    console.error('Error fetching compliance status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance status' },
      { status: 500 }
    );
  }
}
