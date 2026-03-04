'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageLoader } from '@/components/ui/PageLoader';
import { motion } from 'framer-motion';
import { NotificationComposer } from '@/components/NotificationComposer';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Calendar,
  RefreshCw,
  Filter,
  CheckCheck,
  Clock,
  ArrowRight,
  Send,
  ArrowLeft,
  Home,
  Info,
  FileText,
  Megaphone,
  PartyPopper,
  XCircle,
  UserCheck,
  Settings
} from 'lucide-react';

// Extended notification types
type NotificationType =
  | 'timetable_published' | 'timetable_approved' | 'timetable_rejected' | 'schedule_change' | 'conflict_detected'
  | 'system_alert' | 'approval_request'
  | 'content_pending_review' | 'content_approved' | 'content_rejected' | 'revision_requested'
  | 'assignment_created' | 'assignment_due' | 'assignment_submitted' | 'assignment_graded'
  | 'announcement' | 'event_created' | 'event_reminder' | 'event_cancelled'
  | 'resource_updated' | 'maintenance_alert' | 'policy_update';

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

      // Redirect faculty users to the faculty notifications page
      if (parsedUser.role === 'faculty') {
        router.replace('/faculty/notifications');
        return;
      }

      setUser(parsedUser);
      fetchNotifications(parsedUser.id);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  const getAuthHeaders = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return {};
      return { 'Authorization': `Bearer ${btoa(raw)}` };
    } catch { return {}; }
  };

  const fetchNotifications = async (userId: string) => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/notifications?user_id=${userId}&limit=50`, {
        headers: { ...getAuthHeaders() }
      });
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

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.is_read) return false;
    if (filter === 'read' && !n.is_read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const markAsRead = async (notificationIds: string[]) => {
    if (!user) return;

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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

    // Navigate based on action_url or content type
    if (notification.action_url) {
      router.push(notification.action_url);
      return;
    }

    // Fallback navigation based on content type
    if (notification.timetable_id) {
      if (user?.role === 'college_admin') {
        router.push(`/college-admin/timetables/${notification.timetable_id}`);
      } else if (user?.role === 'student') {
        router.push(`/student/timetable`);
      }
    } else if (notification.content_type === 'assignment' && notification.content_id) {
      router.push(`/assignments/${notification.content_id}`);
    } else if (notification.content_type === 'announcement' && notification.content_id) {
      router.push(`/announcements`);
    } else if (notification.content_type === 'event' && notification.content_id) {
      router.push(`/events`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      // Timetable notifications
      case 'timetable_published':
      case 'timetable_approved':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'timetable_rejected':
        return <XCircle size={20} className="text-red-600" />;
      case 'schedule_change':
        return <RefreshCw size={20} className="text-blue-600" />;
      case 'conflict_detected':
        return <AlertCircle size={20} className="text-amber-600" />;

      // Approval workflow
      case 'approval_request':
      case 'content_pending_review':
        return <Clock size={20} className="text-blue-600" />;
      case 'content_approved':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'content_rejected':
        return <XCircle size={20} className="text-red-600" />;
      case 'revision_requested':
        return <RefreshCw size={20} className="text-yellow-600" />;

      // Assignment notifications
      case 'assignment_created':
        return <FileText size={20} className="text-purple-600" />;
      case 'assignment_due':
        return <Clock size={20} className="text-red-600" />;
      case 'assignment_submitted':
        return <UserCheck size={20} className="text-blue-600" />;
      case 'assignment_graded':
        return <CheckCircle size={20} className="text-green-600" />;

      // Announcement & Event notifications
      case 'announcement':
        return <Megaphone size={20} className="text-blue-600" />;
      case 'event_created':
      case 'event_reminder':
        return <PartyPopper size={20} className="text-pink-600" />;
      case 'event_cancelled':
        return <XCircle size={20} className="text-red-600" />;

      // System notifications
      case 'system_alert':
      case 'maintenance_alert':
        return <AlertCircle size={20} className="text-orange-600" />;
      case 'resource_updated':
        return <Settings size={20} className="text-gray-600" />;
      case 'policy_update':
        return <FileText size={20} className="text-blue-600" />;

      default:
        return <Bell size={20} className="text-gray-600" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'timetable_published':
      case 'timetable_approved':
      case 'content_approved':
      case 'assignment_graded':
        return 'bg-green-100';

      case 'timetable_rejected':
      case 'content_rejected':
      case 'event_cancelled':
      case 'assignment_due':
        return 'bg-red-100';

      case 'schedule_change':
      case 'approval_request':
      case 'content_pending_review':
      case 'announcement':
      case 'assignment_submitted':
        return 'bg-blue-100';

      case 'system_alert':
      case 'maintenance_alert':
      case 'conflict_detected':
        return 'bg-orange-100';

      case 'assignment_created':
        return 'bg-purple-100';

      case 'event_created':
      case 'event_reminder':
        return 'bg-pink-100';

      case 'revision_requested':
        return 'bg-yellow-100';

      default:
        return 'bg-gray-100';
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

  const getDashboardRoute = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'college_admin': return '/college-admin/dashboard';
      case 'super_admin': return '/super-admin/dashboard';
      case 'student': return '/student/dashboard';
      default: return '/';
    }
  };

  if (loading) {
    return <PageLoader message="Loading Notifications" subMessage="Fetching your latest notifications..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#CDE8E5] via-[#EEF7FF] to-[#7AB2B2]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-[70px] bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] shadow-lg z-50 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(getDashboardRoute())}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Bell size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Notifications</h1>
              <p className="text-xs text-white/70">Academic Compass</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(getDashboardRoute())}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
          >
            <Home size={16} /> Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-[90px] pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Bell size={28} /> Notifications
              </h1>
              <p className="text-gray-600">
                {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => user && fetchNotifications(user.id)}
                disabled={refreshing}
                className="px-4 py-2.5 bg-white text-gray-700 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-2 shadow-sm border border-gray-200 font-medium disabled:opacity-50"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2.5 bg-[#4D869C] text-white hover:shadow-lg rounded-xl transition-all flex items-center gap-2 font-medium"
                >
                  <CheckCheck size={16} /> Mark all read
                </button>
              )}
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100"><Bell size={24} className="text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-100"><Info size={24} className="text-orange-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{unreadCount}</p>
                <p className="text-sm text-gray-500">Unread</p>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100"><CheckCircle size={24} className="text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{notifications.filter(n => n.is_read).length}</p>
                <p className="text-sm text-gray-500">Read</p>
              </div>
            </motion.div>
          </div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Filter size={14} /> Filter by Status
                </label>
                <div className="flex gap-2">
                  {(['all', 'unread', 'read'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-2 rounded-xl transition-colors font-medium ${filter === f
                        ? 'bg-[#4D869C] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {f === 'all' ? `All (${notifications.length})` :
                        f === 'unread' ? `Unread (${unreadCount})` :
                          `Read (${notifications.filter(n => n.is_read).length})`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none"
                >
                  <option value="all">All Types</option>
                  <optgroup label="Timetable">
                    <option value="timetable_published">Timetable Published</option>
                    <option value="timetable_approved">Timetable Approved</option>
                    <option value="timetable_rejected">Timetable Rejected</option>
                    <option value="schedule_change">Schedule Changes</option>
                  </optgroup>
                  <optgroup label="Assignments">
                    <option value="assignment_created">New Assignment</option>
                    <option value="assignment_graded">Assignment Graded</option>
                    <option value="assignment_due">Assignment Due</option>
                  </optgroup>
                  <optgroup label="Announcements & Events">
                    <option value="announcement">Announcements</option>
                    <option value="event_created">Events</option>
                  </optgroup>
                  <optgroup label="System">
                    <option value="system_alert">System Alerts</option>
                    <option value="approval_request">Approval Requests</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Notifications List */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-16">
                <Bell size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No notifications</h3>
                <p className="text-gray-500">
                  {filter === 'unread' ? "You're all caught up!" : 'No notifications to display.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredNotifications.map((notification, i) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-blue-50/50' : ''
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 ${getNotificationBgColor(notification.type)} rounded-xl shrink-0`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            {notification.title}
                            {!notification.is_read && (
                              <span className="inline-block w-2 h-2 bg-[#4D869C] rounded-full"></span>
                            )}
                          </h3>
                          {notification.timetable_id && (
                            <ArrowRight size={18} className="text-gray-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {formatTimeAgo(notification.created_at)}
                          </span>
                          {notification.is_read && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle size={12} /> Read
                            </span>
                          )}
                        </div>
                      </div>
                      {!notification.is_read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead([notification.id]); }}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#4D869C]"
                          title="Mark as read"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Notification Composer Modal */}
      {showNotificationComposer && user && (
        <NotificationComposer
          isOpen={showNotificationComposer}
          onClose={() => {
            setShowNotificationComposer(false);
            if (user) fetchNotifications(user.id);
          }}
          userId={user.id}
          userDepartmentId={user.department_id}
        />
      )}
    </div>
  );
}
