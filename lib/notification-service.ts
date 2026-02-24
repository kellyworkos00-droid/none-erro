import { prisma } from '@/lib/prisma';
import type { Notification, NotificationPreference, Prisma } from '@prisma/client';
import { sendEmail } from '@/lib/email-service';
import { broadcastNotification } from '@/lib/websocket-manager';

// Notification types
export enum NotificationType {
  RECONCILIATION_COMPLETE = 'RECONCILIATION_COMPLETE',
  RECONCILIATION_FAILED = 'RECONCILIATION_FAILED',
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  APPROVAL_COMPLETED = 'APPROVAL_COMPLETED',
  EXCEPTION_ALERT = 'EXCEPTION_ALERT',
  UNMATCHED_TRANSACTION = 'UNMATCHED_TRANSACTION',
  FAILED_MATCH = 'FAILED_MATCH',
  HIGH_VALUE_PAYMENT = 'HIGH_VALUE_PAYMENT',
  OVERDUE_INVOICE = 'OVERDUE_INVOICE',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_UPDATED = 'INVOICE_UPDATED',
}

export enum NotificationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  severity?: NotificationSeverity | string;
  category?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  sendEmail?: boolean;
}

export interface NotificationPayload {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

type NotificationPreferenceUpdates = Partial<Pick<
  NotificationPreference,
  | 'enablePush'
  | 'enableEmail'
  | 'enableInApp'
  | 'reconciliationAlerts'
  | 'paymentAlerts'
  | 'approvalAlerts'
  | 'exceptionAlerts'
  | 'systemAlerts'
  | 'quietHoursStart'
  | 'quietHoursEnd'
  | 'enableDigest'
  | 'digestFrequency'
>>;

/**
 * Create a notification for a user
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<Notification | null> {
  try {
    // Check user preferences
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId: params.userId },
    });

    const sendNotification = preferences?.enableInApp ?? true;
    const shouldSendEmail = (params.sendEmail || preferences?.enableEmail) ?? false;

    // Create in-app notification
    let notification = null;
    if (sendNotification) {
      notification = await prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          severity: params.severity || NotificationSeverity.INFO,
          category: params.category,
          relatedEntityId: params.relatedEntityId,
          relatedEntityType: params.relatedEntityType,
          metadata: params.metadata,
          actionUrl: params.actionUrl,
        },
      });

      // Broadcast via WebSocket
      await broadcastNotification(params.userId, {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        severity: notification.severity,
        isRead: notification.isRead,
        actionUrl: notification.actionUrl,
        createdAt: notification.createdAt,
        metadata: notification.metadata,
      } as NotificationPayload);
    }

    // Send email if user preferences allow it
    if (shouldSendEmail) {
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
      });

      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: params.title,
          type: 'notification',
          notificationTitle: params.title,
          notificationMessage: params.message,
          actionUrl: params.actionUrl,
        });

        // Log email sending
        if (notification) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: { isEmailed: true, emailedAt: new Date() },
          });
        }
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create bulk notifications for multiple users
 */
export async function createBulkNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
): Promise<Array<Notification | null>> {
  const notifications = await Promise.all(
    userIds.map((userId) =>
      createNotification({
        ...params,
        userId,
      })
    )
  );
  return notifications;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<Notification> {
  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<Prisma.BatchPayload> {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Get user notifications with pagination
 */
export async function getUserNotifications(
  userId: string,
  options: {
    skip?: number;
    take?: number;
    isRead?: boolean;
    type?: string;
    severity?: string;
  } = {}
) {
  const { skip = 0, take = 20, isRead, type, severity } = options;

  const where: Prisma.NotificationWhereInput = { userId };
  if (isRead !== undefined) where.isRead = isRead;
  if (type) where.type = type;
  if (severity) where.severity = severity;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total, skip, take };
}

/**
 * Get unread notification count for user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string): Promise<Notification> {
  return prisma.notification.delete({
    where: { id: notificationId },
  });
}

/**
 * Delete old notifications (cleanup)
 */
export async function deleteOldNotifications(daysOld: number = 30): Promise<Prisma.BatchPayload> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      isRead: true,
    },
  });
}

/**
 * Get notification preferences for user
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreference> {
  let preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  // Create default preferences if they don't exist
  if (!preferences) {
    preferences = await prisma.notificationPreference.create({
      data: {
        userId,
      },
    });
  }

  return preferences;
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: NotificationPreferenceUpdates
): Promise<NotificationPreference> {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...updates },
    update: updates,
  });
}
