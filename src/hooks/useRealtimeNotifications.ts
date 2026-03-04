/**
 * useRealtimeNotifications Hook
 *
 * Fetches notifications via the API with proper auth headers
 * and polls every 30 seconds for new notifications (Neon-compatible).
 */

import { useEffect, useState, useCallback, useRef } from 'react';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timetable_id?: string;
  batch_id?: string;
  content_type?: string;
  content_id?: string;
  action_url?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
}

interface UseRealtimeNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useRealtimeNotifications(userId: string | null): UseRealtimeNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Build auth header from localStorage user */
  const getAuthHeaders = useCallback((): Record<string, string> => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return {};
      return { Authorization: `Bearer ${btoa(raw)}` };
    } catch {
      return {};
    }
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/notifications?user_id=${userId}&limit=20`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
      const data = await response.json();

      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unread_count);
      } else {
        throw new Error(data.error || 'Failed to fetch notifications');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [userId, getAuthHeaders]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return;
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ user_id: userId, notification_ids: [notificationId] }),
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [userId, getAuthHeaders]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ user_id: userId, mark_all_read: true }),
      });
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [userId, getAuthHeaders]);

  // Initial fetch + poll every 30 seconds
  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    intervalRef.current = setInterval(() => {
      fetchNotifications();
    }, 30_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}

