import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
} from '@/lib/notification-service';
import { errorResponse, successResponse } from '@/lib/response';

/**
 * GET /api/notifications
 * Get user's notifications with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '20');
    const isRead = searchParams.get('isRead')
      ? searchParams.get('isRead') === 'true'
      : undefined;
    const type = searchParams.get('type') || undefined;
    const severity = searchParams.get('severity') || undefined;

    const result = await getUserNotifications(user.userId, {
      skip,
      take,
      isRead,
      type,
      severity,
    });

    return successResponse({
      data: result.notifications,
      pagination: {
        total: result.total,
        skip: result.skip,
        take: result.take,
        hasMore: result.skip + result.take < result.total,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return errorResponse('Failed to fetch notifications', 500);
  }
}

/**
 * POST /api/notifications
 * Create a new notification (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'ADMIN') {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { userId, type, title, message, severity, category, actionUrl, sendEmail } = body;

    if (!userId || !type || !title || !message) {
      return errorResponse('Missing required fields', 400);
    }

    // Import notification service to create notification
    const { createNotification } = await import('@/lib/notification-service');
    const notification = await createNotification({
      userId,
      type,
      title,
      message,
      severity,
      category,
      actionUrl,
      sendEmail,
    });

    return successResponse({ data: notification }, 201);
  } catch (error) {
    console.error('Error creating notification:', error);
    return errorResponse('Failed to create notification', 500);
  }
}

/**
 * PATCH /api/notifications
 * Update notification status (mark as read, delete, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { action, notificationIds } = body;

    if (!action || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return errorResponse('Missing required fields', 400);
    }

    if (action === 'read') {
      await Promise.all(notificationIds.map((id: string) => markNotificationAsRead(id)));
      return successResponse({ message: 'Notifications marked as read' });
    } else if (action === 'readAll') {
      await markAllNotificationsAsRead(user.userId);
      return successResponse({ message: 'All notifications marked as read' });
    } else if (action === 'delete') {
      await Promise.all(notificationIds.map((id: string) => deleteNotification(id)));
      return successResponse({ message: 'Notifications deleted' });
    }

    return errorResponse('Invalid action', 400);
  } catch (error) {
    console.error('Error updating notifications:', error);
    return errorResponse('Failed to update notifications', 500);
  }
}
