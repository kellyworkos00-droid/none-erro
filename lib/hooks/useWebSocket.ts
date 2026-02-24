'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface WebSocketHookOptions {
  enabled?: boolean;
  autoConnect?: boolean;
}

export function useWebSocket(userId?: string, options: WebSocketHookOptions = {}) {
  const { enabled = true, autoConnect = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !userId || !autoConnect) return;

    const connectSocket = () => {
      try {
        const newSocket = io(process.env.NEXT_PUBLIC_APP_URL || '', {
          path: '/socket.io/',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
        });

        newSocket.on('connect', () => {
          console.log('✅ Connected to WebSocket');
          setIsConnected(true);
          setIsReconnecting(false);

          // Join user-specific room
          newSocket.emit('user:join', userId);
        });

        newSocket.on('disconnect', () => {
          console.log('❌ Disconnected from WebSocket');
          setIsConnected(false);
        });

        newSocket.on('connect_error', (error: Error) => {
          console.error('WebSocket connection error:', error);
          setIsReconnecting(true);
        });

        // Handle incoming notifications
        newSocket.on('notification:new', (notification: any) => {
          console.log('📬 New notification:', notification);
          handleNewNotification(notification);
        });

        // Handle reconciliation status updates
        newSocket.on('reconciliation:update', (status: any) => {
          console.log('📊 Reconciliation update:', status);
          handleReconciliationUpdate(status);
        });

        // Handle matching progress
        newSocket.on('matching:progress', (progress: any) => {
          console.log('🔄 Matching progress:', progress);
          handleMatchingProgress(progress);
        });

        // Handle alerts
        newSocket.on('alert:new', (alert: any) => {
          console.log('🚨 New alert:', alert);
          handleNewAlert(alert);
        });

        // Handle system notifications
        newSocket.on('system:notification', (notification: any) => {
          console.log('📢 System notification:', notification);
          handleSystemNotification(notification);
        });

        // Handle unread count updates
        newSocket.on('notifications:unread-count', (data: { count: number }) => {
          console.log('🔔 Unread count update:', data.count);
          // Dispatch event or update state as needed
          window.dispatchEvent(
            new CustomEvent('notification:unread-update', { detail: data })
          );
        });

        socketRef.current = newSocket;
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        setIsReconnecting(true);
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [enabled, userId, autoConnect]);

  const handleNewNotification = (notification: any) => {
    // Show a subtle toast notification
    if (notification.severity === 'CRITICAL') {
      toast.error(notification.title);
    } else if (notification.severity === 'ERROR') {
      toast.error(notification.message);
    } else if (notification.severity === 'WARNING') {
      toast(notification.message, { icon: '⚠️' });
    } else {
      toast.success(notification.message);
    }
  };

  const handleReconciliationUpdate = (status: any) => {
    if (status.status === 'completed') {
      toast.success('Reconciliation completed successfully!');
    } else if (status.status === 'failed') {
      toast.error(`Reconciliation failed: ${status.error}`);
    }
  };

  const handleMatchingProgress = (progress: any) => {
    console.log(
      `Matching progress: ${progress.percentageComplete}% - Phase: ${progress.currentPhase}`
    );
  };

  const handleNewAlert = (alert: any) => {
    if (alert.severity === 'CRITICAL') {
      toast.error(`🚨 ${alert.title}: ${alert.message}`);
    } else if (alert.severity === 'ERROR') {
      toast.error(`⚠️ ${alert.title}`);
    }
  };

  const handleSystemNotification = (notification: any) => {
    toast(notification.message, {
      icon: '📢',
    });
  };

  const sendMessage = (event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    isReconnecting,
    sendMessage,
  };
}
