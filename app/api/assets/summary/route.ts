import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

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

    // Mock data for asset summary
    const summary = {
      totalAssets: 28,
      grossValue: 8500000,
      accumulatedDepreciation: 1275000,
      netValue: 7225000,
      depreciatingAssets: 24,
    };

    return NextResponse.json({ data: summary });
  } catch (error) {
    console.error('Error fetching asset summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset summary' },
      { status: 500 }
    );
  }
}
