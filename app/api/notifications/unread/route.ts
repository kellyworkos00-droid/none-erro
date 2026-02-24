import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getUnreadNotificationCount } from '@/lib/notification-service';
import { errorResponse, successResponse } from '@/lib/response';

/**
 * GET /api/notifications/unread
 * Get unread notification count for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const unreadCount = await getUnreadNotificationCount(user.id);

    return successResponse({
      data: { unreadCount },
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return errorResponse('Failed to fetch unread count', 500);
  }
}
