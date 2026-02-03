'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Bell, CheckCircle, AlertCircle, Calendar, RefreshCw, CheckCheck,
  Clock, Filter, ArrowRight, Send, Info, X, Users, GraduationCap, MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';

interface Notification {
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
  sender_id?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

interface Batch {
  id: string;
  name: string;
}

const FacultyNotificationsPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Send notification state
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'system_alert',
    target: 'all', // all, batch, faculty
    batch_id: ''
  });

  const isCreator = user?.faculty_type === 'creator';
  const isPublisher = user?.faculty_type === 'publisher';
  const canSendNotifications = isCreator || isPublisher;

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'faculty') {
      router.push('/login');
      return;
    }
    setUser(parsedUser);
    fetchNotifications(parsedUser.id);
    if (parsedUser.faculty_type === 'creator' || parsedUser.faculty_type === 'publisher') {
      fetchBatches(parsedUser);
    }
  }, [router]);

  const fetchBatches = async (userData: any) => {
    try {
      const token = btoa(JSON.stringify({
        id: userData.id,
        role: userData.role,
        college_id: userData.college_id
      }));
      const response = await fetch('/api/admin/batches', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success || data.data || data.batches) {
        setBatches(data.data || data.batches || []);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const fetchNotifications = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications?user_id=${userId}&limit=50`);
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    if (!user) return;
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, notification_ids: notificationIds })
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => notificationIds.includes(n.id) ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
        );
        toast.success('Marked as read');
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
        body: JSON.stringify({ user_id: user.id, mark_all_read: true })
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const sendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      toast.error('Please fill in title and message');
      return;
    }

    setSendingNotification(true);
    try {
      const token = btoa(JSON.stringify({
        id: user.id,
        role: user.role,
        college_id: user.college_id
      }));

      const payload = {
        title: notificationForm.title,
        message: notificationForm.message,
        type: notificationForm.type,
        target: notificationForm.target,
        batch_id: notificationForm.target === 'batch' ? notificationForm.batch_id : null,
        sender_id: user.id,
        college_id: user.college_id
      };

      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Notification sent to ${data.recipients_count || 'recipients'}`);
        setShowSendModal(false);
        setNotificationForm({
          title: '',
          message: '',
          type: 'general_announcement',
          target: 'all',
          batch_id: ''
        });
      } else {
        toast.error(data.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setSendingNotification(false);
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
      router.push(`/faculty/timetables/view/${notification.timetable_id}`);
    } else if (notification.content_type === 'assignment' && notification.content_id) {
      router.push(`/faculty/assignments/${notification.content_id}`);
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
      case 'content_approved':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'timetable_rejected':
      case 'content_rejected':
      case 'event_cancelled':
      case 'class_cancellation':
        return <X size={20} className="text-red-600" />;
      case 'schedule_change':
      case 'revision_requested':
        return <RefreshCw size={20} className="text-blue-600" />;
      case 'conflict_detected':
      case 'system_alert':
      case 'maintenance_alert':
        return <AlertCircle size={20} className="text-orange-600" />;

      // Assignment notifications
      case 'assignment_created':
      case 'assignment':
      case 'exam_test':
        return <GraduationCap size={20} className="text-purple-600" />;
      case 'assignment_due':
      case 'approval_request':
      case 'content_pending_review':
        return <Clock size={20} className="text-blue-600" />;
      case 'assignment_submitted':
      case 'material_uploaded':
        return <Users size={20} className="text-blue-600" />;
      case 'assignment_graded':
        return <CheckCircle size={20} className="text-green-600" />;

      // Announcement & Event
      case 'announcement':
      case 'general_announcement':
        return <MessageSquare size={20} className="text-blue-600" />;
      case 'event_created':
      case 'event_reminder':
        return <Calendar size={20} className="text-pink-600" />;

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
      case 'class_cancellation':
        return 'bg-red-100';

      case 'schedule_change':
      case 'approval_request':
      case 'content_pending_review':
      case 'announcement':
      case 'assignment_submitted':
      case 'general_announcement':
      case 'material_uploaded':
        return 'bg-blue-100';

      case 'system_alert':
      case 'maintenance_alert':
      case 'conflict_detected':
        return 'bg-orange-100';

      case 'assignment_created':
      case 'assignment':
      case 'exam_test':
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
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hrs ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.is_read) return false;
    if (filter === 'read' && !n.is_read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <FacultyCreatorLayout activeTab="notifications">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Notifications</h1>
            <p className="text-gray-600">
              {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => user && fetchNotifications(user.id)}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                <CheckCheck size={18} /> Mark All Read
              </button>
            )}
            {canSendNotifications && (
              <button
                onClick={() => setShowSendModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg"
              >
                <Send size={18} /> Send Notification
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          {canSendNotifications && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100"><Send size={24} className="text-purple-600" /></div>
              <div>
                <p className="text-lg font-bold text-gray-900">Broadcast</p>
                <p className="text-sm text-gray-500">Send to students</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl shadow-lg p-6">
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
                    className={`px-4 py-2 rounded-xl transition-colors font-medium ${filter === f ? 'bg-[#4D869C] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                  <option value="conflict_detected">Conflicts</option>
                </optgroup>
                <optgroup label="Assignments">
                  <option value="assignment_created">Assignment Created</option>
                  <option value="assignment_due">Assignment Due</option>
                  <option value="assignment_submitted">Assignment Submitted</option>
                  <option value="assignment_graded">Assignment Graded</option>
                </optgroup>
                <optgroup label="Announcements & Events">
                  <option value="announcement">Announcements</option>
                  <option value="event_created">Event Created</option>
                  <option value="event_reminder">Event Reminder</option>
                  <option value="event_cancelled">Event Cancelled</option>
                  <option value="general_announcement">General Announcement</option>
                </optgroup>
                <optgroup label="Workflow">
                  <option value="approval_request">Approval Requests</option>
                  <option value="content_pending_review">Pending Review</option>
                  <option value="content_approved">Content Approved</option>
                  <option value="content_rejected">Content Rejected</option>
                </optgroup>
                <optgroup label="System">
                  <option value="system_alert">System Alerts</option>
                  <option value="maintenance_alert">Maintenance</option>
                </optgroup>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Notifications List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4D869C] border-t-transparent mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
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

        {/* Send Notification Modal */}
        <AnimatePresence>
          {showSendModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
              >
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] rounded-t-2xl">
                  <div className="flex items-center gap-3 text-white">
                    <Send size={20} />
                    <h3 className="text-lg font-bold">Send Notification</h3>
                  </div>
                  <button onClick={() => setShowSendModal(false)} className="text-white/80 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                    <input
                      type="text"
                      value={notificationForm.title}
                      onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none"
                      placeholder="Notification title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Message *</label>
                    <textarea
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none resize-none"
                      placeholder="Notification message..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                      <select
                        value={notificationForm.type}
                        onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none"
                      >
                        <option value="general_announcement">General Announcement</option>
                        <option value="assignment">Assignment</option>
                        <option value="exam_test">Exam / Test</option>
                        <option value="class_cancellation">Class Cancellation</option>
                        <option value="material_uploaded">Material Uploaded</option>
                        <option value="schedule_change">Schedule Change</option>
                        <option value="system_alert">System Alert</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Send To</label>
                      <select
                        value={notificationForm.target}
                        onChange={(e) => setNotificationForm({ ...notificationForm, target: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none"
                      >
                        <option value="all">All Students</option>
                        <option value="batch">Specific Batch</option>
                        <option value="faculty">All Faculty</option>
                      </select>
                    </div>
                  </div>

                  {notificationForm.target === 'batch' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Select Batch</label>
                      <select
                        value={notificationForm.batch_id}
                        onChange={(e) => setNotificationForm({ ...notificationForm, batch_id: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none"
                      >
                        <option value="">Select a batch</option>
                        {batches.map(batch => (
                          <option key={batch.id} value={batch.id}>{batch.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                    <Info size={18} className="text-blue-600" />
                    <p className="text-sm text-blue-700">
                      {notificationForm.target === 'all' && 'This will send to all students in your college.'}
                      {notificationForm.target === 'batch' && 'This will send to all students in the selected batch.'}
                      {notificationForm.target === 'faculty' && 'This will send to all faculty members.'}
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 border-t flex justify-end gap-3">
                  <button
                    onClick={() => setShowSendModal(false)}
                    className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendNotification}
                    disabled={sendingNotification || !notificationForm.title || !notificationForm.message}
                    className="px-6 py-2.5 bg-[#4D869C] text-white font-bold rounded-xl hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send size={16} /> {sendingNotification ? 'Sending...' : 'Send Notification'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </FacultyCreatorLayout>
  );
};

export default FacultyNotificationsPage;
