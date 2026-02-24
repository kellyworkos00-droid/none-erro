import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getActiveAlerts, acknowledgeAlert, resolveAlert } from '@/lib/alert-manager';
import { errorResponse, successResponse } from '@/lib/response';

/**
 * GET /api/alerts
 * Get active alerts for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '50');
    const severity = searchParams.get('severity') || undefined;
    const eventType = searchParams.get('eventType') || undefined;

    const alerts = await getActiveAlerts({
      skip,
      take,
      severity,
      eventType,
    });

    return successResponse({
      data: alerts,
      pagination: {
        skip,
        take,
      },
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return errorResponse('Failed to fetch alerts', 500);
  }
}

/**
 * PATCH /api/alerts
 * Update alert status (acknowledge, resolve)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { action, alertIds } = body;

    if (!action || !Array.isArray(alertIds) || alertIds.length === 0) {
      return errorResponse('Missing required fields', 400);
    }

    if (action === 'acknowledge') {
      await Promise.all(alertIds.map((id: string) => acknowledgeAlert(id, user.userId)));
      return successResponse({ message: 'Alerts acknowledged' });
    } else if (action === 'resolve') {
      await Promise.all(alertIds.map((id: string) => resolveAlert(id)));
      return successResponse({ message: 'Alerts resolved' });
    }

    return errorResponse('Invalid action', 400);
  } catch (error) {
    console.error('Error updating alerts:', error);
    return errorResponse('Failed to update alerts', 500);
  }
}
