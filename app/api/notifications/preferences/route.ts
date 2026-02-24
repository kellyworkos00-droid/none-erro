import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/notification-service';
import { errorResponse, successResponse } from '@/lib/response';

/**
 * GET /api/notifications/preferences
 * Get notification preferences for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const preferences = await getNotificationPreferences(user.userId);

    return successResponse({
      data: preferences,
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return errorResponse('Failed to fetch preferences', 500);
  }
}

/**
 * PUT /api/notifications/preferences
 * Update notification preferences for current user
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();

    const preferences = await updateNotificationPreferences(user.userId, body);

    return successResponse({
      data: preferences,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return errorResponse('Failed to update preferences', 500);
  }
}
