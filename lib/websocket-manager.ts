import { NotificationPayload } from '@/lib/notification-service';

// In-memory storage for connected users and their socket IDs
// In production, you'd want to use Redis for multi-server deployments
const connectedUsers = new Map<string, Set<string>>();
let io: any = null;

/**
 * Initialize Socket.IO server (called from API route)
 */
export function initializeSocketIO(ioInstance: any) {
  io = ioInstance;

  io.on('connection', (socket: any) => {
    console.log('User connected:', socket.id);

    // Handle user joining room (after authentication)
    socket.on('user:join', (userId: string) => {
      socket.join(`user:${userId}`);
      
      if (!connectedUsers.has(userId)) {
        connectedUsers.set(userId, new Set());
      }
      connectedUsers.get(userId)!.add(socket.id);

      console.log(`User ${userId} joined (socket: ${socket.id})`);
    });

    // Handle user leaving
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      // Remove from all user sets
      connectedUsers.forEach((sockets) => {
        sockets.delete(socket.id);
      });
    });

    // Heartbeat/ping
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });
}

/**
 * Broadcast a notification to a specific user
 */
export async function broadcastNotification(
  userId: string,
  notification: NotificationPayload
): Promise<void> {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }

  // Send to user's room
  io.to(`user:${userId}`).emit('notification:new', notification);
  console.log(`📢 Notification sent to user ${userId}:`, notification.title);
}

/**
 * Broadcast a notification to multiple users
 */
export async function broadcastBulkNotifications(
  userIds: string[],
  notification: Omit<NotificationPayload, 'userId' | 'id'>
): Promise<void> {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }

  userIds.forEach((userId) => {
    io.to(`user:${userId}`).emit('notification:new', {
      ...notification,
      userId,
    });
  });

  console.log(`📢 Bulk notification sent to ${userIds.length} users`);
}

/**
 * Send real-time reconciliation status update
 */
export async function broadcastReconciliationStatus(
  userId: string,
  status: {
    reconciliationId: string;
    status: 'in_progress' | 'completed' | 'failed';
    progress?: number;
    matchedCount?: number;
    unmatchedCount?: number;
    message?: string;
    error?: string;
  }
): Promise<void> {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }

  io.to(`user:${userId}`).emit('reconciliation:update', status);
  console.log(`📊 Reconciliation update sent to user ${userId}:`, status.status);
}

/**
 * Broadcast matching progress
 */
export async function broadcastMatchingProgress(
  userId: string,
  progress: {
    total: number;
    matched: number;
    unmatched: number;
    percentageComplete: number;
    currentPhase: string;
  }
): Promise<void> {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }

  io.to(`user:${userId}`).emit('matching:progress', progress);
}

/**
 * Broadcast alert to user
 */
export async function broadcastAlert(
  userId: string,
  alert: {
    id: string;
    type: string;
    title: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    timestamp: Date;
    actionUrl?: string;
  }
): Promise<void> {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }

  io.to(`user:${userId}`).emit('alert:new', alert);
  console.log(`🚨 Alert sent to user ${userId}: ${alert.title}`);
}

/**
 * Broadcast system-wide notification (to all connected users)
 */
export async function broadcastSystemNotification(
  notification: {
    title: string;
    message: string;
    type: string;
    severity?: string;
  }
): Promise<void> {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }

  io.emit('system:notification', notification);
  console.log('📢 System notification sent to all users:', notification.title);
}

/**
 * Notify user of unread notification count change
 */
export async function broadcastUnreadCount(
  userId: string,
  unreadCount: number
): Promise<void> {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }

  io.to(`user:${userId}`).emit('notifications:unread-count', { count: unreadCount });
}

/**
 * Check if user is online
 */
export function isUserOnline(userId: string): boolean {
  return connectedUsers.has(userId) && connectedUsers.get(userId)!.size > 0;
}

/**
 * Get connected socket IDs for a user
 */
export function getUserSockets(userId: string): Set<string> {
  return connectedUsers.get(userId) || new Set();
}

/**
 * Get total online users count
 */
export function getOnlineUsersCount(): number {
  return connectedUsers.size;
}

/**
 * Get connection stats
 */
export function getConnectionStats() {
  return {
    totalOnlineUsers: connectedUsers.size,
    totalConnections: Array.from(connectedUsers.values()).reduce(
      (sum, sockets) => sum + sockets.size,
      0
    ),
    userConnections: Array.from(connectedUsers.entries()).map(([userId, sockets]) => ({
      userId,
      connectionCount: sockets.size,
    })),
  };
}
