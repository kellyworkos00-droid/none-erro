import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  assetsValue: number;
  liabilities: number;
  equity: number;
  debtToEquityRatio: number;
  returnOnAssets: number;
}

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

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';

    // Mock financial metrics data
    const metrics: Record<string, FinancialMetrics> = {
      monthly: {
        totalRevenue: 3500000,
        totalExpenses: 2100000,
        netProfit: 1400000,
        profitMargin: 40.0,
        assetsValue: 15000000,
        liabilities: 4500000,
        equity: 10500000,
        debtToEquityRatio: 0.43,
        returnOnAssets: 9.3,
      },
      quarterly: {
        totalRevenue: 10500000,
        totalExpenses: 6300000,
        netProfit: 4200000,
        profitMargin: 40.0,
        assetsValue: 15000000,
        liabilities: 4500000,
        equity: 10500000,
        debtToEquityRatio: 0.43,
        returnOnAssets: 28.0,
      },
      yearly: {
        totalRevenue: 42000000,
        totalExpenses: 25200000,
        netProfit: 16800000,
        profitMargin: 40.0,
        assetsValue: 15000000,
        liabilities: 4500000,
        equity: 10500000,
        debtToEquityRatio: 0.43,
        returnOnAssets: 112.0,
      },
      all: {
        totalRevenue: 85000000,
        totalExpenses: 51000000,
        netProfit: 34000000,
        profitMargin: 40.0,
        assetsValue: 15000000,
        liabilities: 4500000,
        equity: 10500000,
        debtToEquityRatio: 0.43,
        returnOnAssets: 226.7,
      },
    };

    const data = metrics[period] || metrics['monthly'];

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching financial metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial metrics' },
      { status: 500 }
    );
  }
}
