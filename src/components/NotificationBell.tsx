'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  AlertCircle,
  Calendar,
  FileText,
  Megaphone,
  PartyPopper,
  Settings,
  XCircle,
  Clock,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRealtimeNotifications, type Notification as RealtimeNotification } from '@/hooks/useRealtimeNotifications';

// Extended notification types matching the backend
type NotificationType =
  | 'timetable_published'
  | 'timetable_approved'
  | 'timetable_rejected'
  | 'schedule_change'
  | 'conflict_detected'
  | 'system_alert'
  | 'approval_request'
  | 'content_pending_review'
  | 'content_approved'
  | 'content_rejected'
  | 'revision_requested'
  | 'assignment_created'
  | 'assignment_due'
  | 'assignment_submitted'
  | 'assignment_graded'
  | 'announcement'
  | 'event_created'
  | 'event_reminder'
  | 'event_cancelled'
  | 'resource_updated'
  | 'maintenance_alert'
  | 'policy_update';

interface Notification {
  id: string;
  type: NotificationType;
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

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUserId(user.id);
    }
  }, []);

  // Use Realtime notifications hook - replaces polling!
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
  } = useRealtimeNotifications(userId);

  const handleNotificationClick = (notification: RealtimeNotification) => {
    markAsRead(notification.id);

    // Navigate based on action_url or content type
    if (notification.action_url) {
      let targetUrl = notification.action_url;

      // Transform legacy /admin/timetables/ URLs to correct path
      if (targetUrl.startsWith('/admin/timetables/')) {
        const timetableId = targetUrl.replace('/admin/timetables/', '').replace('/edit', '');
        targetUrl = `/faculty/timetables/view/${timetableId}`;
      }
      // Transform legacy /timetable/ URLs to correct path
      else if (targetUrl.startsWith('/timetable/')) {
        const timetableId = targetUrl.replace('/timetable/', '');
        targetUrl = `/faculty/timetables/view/${timetableId}`;
      }

      router.push(targetUrl);
      setIsOpen(false);
      return;
    }

    // Fallback navigation based on content type
    if (notification.timetable_id) {
      router.push(`/faculty/timetables/view/${notification.timetable_id}`);
    } else if (notification.content_type === 'assignment' && notification.content_id) {
      router.push(`/assignments/${notification.content_id}`);
    } else if (notification.content_type === 'announcement' && notification.content_id) {
      router.push(`/announcements/${notification.content_id}`);
    } else if (notification.content_type === 'event' && notification.content_id) {
      router.push(`/events/${notification.content_id}`);
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      // Timetable notifications
      case 'timetable_published':
        return <Calendar className="w-5 h-5 text-green-500" />;
      case 'timetable_approved':
        return <CheckCheck className="w-5 h-5 text-green-500" />;
      case 'timetable_rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'schedule_change':
        return <RefreshCw className="w-5 h-5 text-orange-500" />;
      case 'conflict_detected':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;

      // Content workflow
      case 'approval_request':
      case 'content_pending_review':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'content_approved':
        return <CheckCheck className="w-5 h-5 text-green-500" />;
      case 'content_rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'revision_requested':
        return <RefreshCw className="w-5 h-5 text-yellow-500" />;

      // Assignment notifications
      case 'assignment_created':
        return <FileText className="w-5 h-5 text-purple-500" />;
      case 'assignment_due':
        return <Clock className="w-5 h-5 text-red-500" />;
      case 'assignment_submitted':
        return <UserCheck className="w-5 h-5 text-blue-500" />;
      case 'assignment_graded':
        return <CheckCheck className="w-5 h-5 text-green-500" />;

      // Announcement & Event notifications
      case 'announcement':
        return <Megaphone className="w-5 h-5 text-blue-500" />;
      case 'event_created':
      case 'event_reminder':
        return <PartyPopper className="w-5 h-5 text-pink-500" />;
      case 'event_cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;

      // System notifications
      case 'system_alert':
      case 'maintenance_alert':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'resource_updated':
        return <Settings className="w-5 h-5 text-gray-500" />;
      case 'policy_update':
        return <FileText className="w-5 h-5 text-blue-500" />;

      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityStyle = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-4 border-red-500';
      case 'high':
        return 'border-l-4 border-orange-500';
      default:
        return '';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 z-50 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {unreadCount} unread
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                  title="Close notifications"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {notifications.map((notification: RealtimeNotification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                        } ${getPriorityStyle(notification.priority)}`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 whitespace-pre-wrap">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {formatTime(notification.created_at)}
                            </span>
                            {notification.priority === 'urgent' && (
                              <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded">
                                Urgent
                              </span>
                            )}
                            {notification.priority === 'high' && (
                              <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded">
                                Important
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-slate-700 text-center">
                <button
                  onClick={() => {
                    router.push('/notifications');
                    setIsOpen(false);
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
