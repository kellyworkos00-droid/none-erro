import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const period = request.nextUrl.searchParams.get('period') || 'monthly';

    // Mock P&L data based on period
    const baseData = {
      revenue: 18500000,
      costOfGoods: 9250000,
      operatingExpenses: 5200000,
      interestExpense: 250000,
      taxExpense: 1350000,
      breakdown: {
        sales: 15000000,
        serviceIncome: 3500000,
        costOfSales: 9250000,
        salaries: 3200000,
        utilities: 650000,
        depreciation: 850000,
        otherExpenses: 500000,
      },
    };

    // Calculate derived values
    const grossProfit = baseData.revenue - baseData.costOfGoods;
    const grossProfitMargin = (grossProfit / baseData.revenue) * 100;
    const operatingIncome = grossProfit - baseData.operatingExpenses;
    const netIncome = operatingIncome - baseData.interestExpense - baseData.taxExpense;
    const netProfitMargin = (netIncome / baseData.revenue) * 100;

    // Adjust values based on period
    let multiplier = 1;
    let periodName = 'Monthly';

    switch (period) {
      case 'quarterly':
        multiplier = 3;
        periodName = 'Quarterly';
        break;
      case 'yearly':
        multiplier = 12;
        periodName = 'Yearly';
        break;
    }

    const data = {
      period: periodName,
      revenue: baseData.revenue * multiplier,
      costOfGoods: baseData.costOfGoods * multiplier,
      grossProfit: grossProfit * multiplier,
      grossProfitMargin: grossProfitMargin,
      operatingExpenses: baseData.operatingExpenses * multiplier,
      operatingIncome: operatingIncome * multiplier,
      interestExpense: baseData.interestExpense * multiplier,
      taxExpense: baseData.taxExpense * multiplier,
      netIncome: netIncome * multiplier,
      netProfitMargin: netProfitMargin,
      breakdown: {
        sales: baseData.breakdown.sales * multiplier,
        serviceIncome: baseData.breakdown.serviceIncome * multiplier,
        costOfSales: baseData.breakdown.costOfSales * multiplier,
        salaries: baseData.breakdown.salaries * multiplier,
        utilities: baseData.breakdown.utilities * multiplier,
        depreciation: baseData.breakdown.depreciation * multiplier,
        otherExpenses: baseData.breakdown.otherExpenses * multiplier,
      },
    };

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('P&L Report error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch P&L report' },
      { status: 500 }
    );
  }
}
