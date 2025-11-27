'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { NotificationComposer } from '@/components/NotificationComposer';
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  RefreshCw, 
  Trash2,
  Filter,
  CheckCheck,
  Clock,
  X,
  ArrowRight,
  Send
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'timetable_published' | 'schedule_change' | 'system_alert' | 'approval_request';
  title: string;
  message: string;
  timetable_id?: string;
  batch_id?: string;
  sender_id?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  sender?: {
    first_name: string;
    last_name: string;
    faculty_type?: string;
  };
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  faculty_type?: string;
  department_id?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showNotificationComposer, setShowNotificationComposer] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchNotifications(parsedUser.id);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    applyFilters();
  }, [filter, typeFilter, notifications]);

  const fetchNotifications = async (userId: string) => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/notifications?user_id=${userId}&limit=50`);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    // Apply read/unread filter
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.is_read);
    } else if (filter === 'read') {
      filtered = filtered.filter(n => n.is_read);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === typeFilter);
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notificationIds: string[]) => {
    if (!user) return;

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          notification_ids: notificationIds
        })
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            notificationIds.includes(n.id)
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          mark_all_read: true
        })
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        );
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead([notification.id]);
    }

    // Navigate to timetable if applicable
    if (notification.timetable_id) {
      router.push(`/faculty/timetables?id=${notification.timetable_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'timetable_published':
        return <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />;
      case 'schedule_change':
        return <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
      case 'system_alert':
        return <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />;
      case 'approval_request':
        return <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />;
      default:
        return <Bell className="w-6 h-6 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'timetable_published':
        return 'bg-green-100 dark:bg-green-900';
      case 'schedule_change':
        return 'bg-blue-100 dark:bg-blue-900';
      case 'system_alert':
        return 'bg-orange-100 dark:bg-orange-900';
      case 'approval_request':
        return 'bg-purple-100 dark:bg-purple-900';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                  <Bell className="w-8 h-8" />
                  Notifications
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                </p>
              </div>
              <div className="flex gap-2">
                {/* Send Notification Button (only for creators and publishers) */}
                {user && user.role === 'faculty' && (user.faculty_type === 'creator' || user.faculty_type === 'publisher') && (
                  <button
                    onClick={() => setShowNotificationComposer(true)}
                    className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Notification
                  </button>
                )}
                <button
                  onClick={() => user && fetchNotifications(user.id)}
                  disabled={refreshing}
                  className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Mark all as read
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Filter className="w-4 h-4 inline mr-1" />
                    Filter by Status
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        filter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      All ({notifications.length})
                    </button>
                    <button
                      onClick={() => setFilter('unread')}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        filter === 'unread'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      Unread ({unreadCount})
                    </button>
                    <button
                      onClick={() => setFilter('read')}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        filter === 'read'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      Read ({notifications.filter(n => n.is_read).length})
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="timetable_published">Timetable Published</option>
                    <option value="schedule_change">Schedule Changes</option>
                    <option value="system_alert">System Alerts</option>
                    <option value="approval_request">Approval Requests</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
              {filteredNotifications.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-12 text-center">
                  <Bell className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No notifications
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {filter === 'unread'
                      ? "You're all caught up! No unread notifications."
                      : 'No notifications to display.'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 transition-all hover:shadow-md cursor-pointer ${
                      !notification.is_read ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 ${getNotificationBgColor(notification.type)} rounded-xl shrink-0`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                            {notification.title}
                            {!notification.is_read && (
                              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                            )}
                          </h3>
                          {notification.timetable_id && (
                            <ArrowRight className="w-5 h-5 text-gray-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {notification.is_read && notification.read_at && (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle className="w-3 h-3" />
                              Read
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Notification Composer Modal */}
      {showNotificationComposer && user && (
        <NotificationComposer
          isOpen={showNotificationComposer}
          onClose={() => {
            setShowNotificationComposer(false);
            // Refresh notifications after sending
            if (user) fetchNotifications(user.id);
          }}
          userId={user.id}
          userDepartmentId={user.department_id}
        />
      )}
    </>
  );
}
