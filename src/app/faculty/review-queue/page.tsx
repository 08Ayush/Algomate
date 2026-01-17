'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';
import { motion } from 'framer-motion';
import { Eye, CheckCircle, XCircle, Clock, AlertCircle, Mail, RefreshCw, Calendar, Users } from 'lucide-react';

interface PendingTimetable {
  id: string;
  title: string;
  status: string;
  academic_year: string;
  semester: number;
  submitted_at: string;
  batch_name: string;
  creator_name: string;
  creator_email: string;
  class_count: number;
  workflow_status: string;
}

export default function ReviewQueuePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingTimetables, setPendingTimetables] = useState<PendingTimetable[]>([]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);

      if (parsedUser.role !== 'faculty' || parsedUser.faculty_type !== 'publisher') {
        router.push('/faculty/dashboard');
        return;
      }

      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (user?.id) {
      fetchPendingTimetables();
    }
  }, [user]);

  const fetchPendingTimetables = async () => {
    try {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const token = btoa(JSON.stringify({ id: user.id, role: user.role, department_id: user.department_id }));

      const response = await fetch('/api/timetables/review-queue', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        setLoading(false);
        return;
      }

      const result = await response.json();

      if (result.success) {
        setPendingTimetables(result.timetables || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchPendingTimetables:', error);
      setLoading(false);
    }
  };

  const handleApprove = async (timetableId: string, title: string) => {
    if (!confirm(`Approve and publish "${title}"? This will make it visible to students.`)) {
      return;
    }

    setIsProcessing(timetableId);

    try {
      const token = btoa(JSON.stringify({ id: user.id, role: user.role, department_id: user.department_id }));

      const response = await fetch(`/api/timetables/${timetableId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(`Failed to approve: ${result.error || 'Unknown error'}`);
        setIsProcessing(null);
        return;
      }

      alert('✅ Timetable approved and published successfully!');
      fetchPendingTimetables();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (timetableId: string, title: string) => {
    const reason = prompt(`Enter rejection reason for "${title}":`);
    if (!reason || reason.trim() === '') {
      return;
    }

    setIsProcessing(timetableId);

    try {
      const token = btoa(JSON.stringify({ id: user.id, role: user.role, department_id: user.department_id }));

      const response = await fetch(`/api/timetables/${timetableId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(`Failed to reject: ${result.error || 'Unknown error'}`);
        setIsProcessing(null);
        return;
      }

      alert('Timetable rejected. Creator will be notified.');
      fetchPendingTimetables();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSendEmailNotification = async (timetableId: string, title: string) => {
    if (!confirm(`Send email notifications for "${title}" to all students and faculty?`)) {
      return;
    }

    setIsSendingEmail(timetableId);

    try {
      alert(
        '📧 Email Notification Feature\n\n' +
        'This feature is under development and will send notifications to:\n' +
        '• All students enrolled in the batch\n' +
        '• Faculty members assigned to courses\n' +
        '• Department administrators\n\n' +
        'Coming soon!'
      );
    } finally {
      setIsSendingEmail(null);
    }
  };

  const handleView = (timetableId: string) => {
    router.push(`/faculty/timetables/view/${timetableId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#CDE8E5] via-[#EEF7FF] to-[#7AB2B2] flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-10 shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#4D869C] border-t-transparent mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium">Loading review queue...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <FacultyCreatorLayout activeTab="review-queue">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Review Queue</h1>
            <p className="text-gray-600">Review and approve pending timetables from creators</p>
          </div>
          <button
            onClick={fetchPendingTimetables}
            className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-yellow-100">
              <Clock size={24} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingTimetables.length}</p>
              <p className="text-sm text-gray-500">Pending Review</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-green-100">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">--</p>
              <p className="text-sm text-gray-500">Approved Today</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-red-100">
              <XCircle size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">--</p>
              <p className="text-sm text-gray-500">Rejected</p>
            </div>
          </motion.div>
        </div>

        {/* Review Items */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {pendingTimetables.length === 0 ? (
            <div className="text-center py-16">
              <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No pending reviews</h3>
              <p className="text-gray-500">All timetables have been reviewed. Check back later for new submissions.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingTimetables.map((timetable, i) => (
                <motion.div
                  key={timetable.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <Calendar size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{timetable.title}</h3>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                            <Clock size={12} /> Pending Review
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-gray-500">Submitted by</p>
                          <p className="font-medium text-gray-900">{timetable.creator_name}</p>
                          <p className="text-xs text-gray-500">{timetable.creator_email}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Batch</p>
                          <p className="font-medium text-gray-900">{timetable.batch_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Semester / Year</p>
                          <p className="font-medium text-gray-900">Sem {timetable.semester} • {timetable.academic_year}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Submitted</p>
                          <p className="font-medium text-gray-900">{formatDate(timetable.submitted_at)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                          {timetable.class_count} Classes
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleView(timetable.id)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#4D869C] text-white rounded-xl font-medium hover:shadow-lg transition-all"
                    >
                      <Eye size={16} /> Review
                    </button>
                    <button
                      onClick={() => handleApprove(timetable.id, timetable.title)}
                      disabled={isProcessing === timetable.id}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-all"
                    >
                      {isProcessing === timetable.id ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      Approve & Publish
                    </button>
                    <button
                      onClick={() => handleReject(timetable.id, timetable.title)}
                      disabled={isProcessing === timetable.id}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-all"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                    <button
                      onClick={() => handleSendEmailNotification(timetable.id, timetable.title)}
                      disabled={isSendingEmail === timetable.id}
                      className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 transition-all"
                    >
                      {isSendingEmail === timetable.id ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Mail size={16} />
                      )}
                      Send Email
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FacultyCreatorLayout>
  );
}
