'use client';

import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

interface NotificationBellProps {
  userId?: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isConnected } = useWebSocket(userId);

  useEffect(() => {
    fetchUnreadCount();

    // Refresh unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/unread');
      if (response.ok) {
        const result = await response.json();
        setUnreadCount(result.data?.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition group"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-700 group-hover:text-gray-900" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-6 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Online Status Indicator */}
        {isConnected && (
          <span
            className="absolute bottom-0 right-0 inline-flex items-center justify-center w-3 h-3 bg-green-500 rounded-full border-2 border-white"
            title="Connected to live updates"
          />
        )}
      </button>

      {/* Notification Center */}
      <NotificationCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
