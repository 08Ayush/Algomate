'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { Eye, CheckCircle, XCircle, Clock, AlertCircle, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

  // Separate useEffect to fetch timetables when user is set
  useEffect(() => {
    if (user?.id) {
      fetchPendingTimetables();
    }
  }, [user]);

  const fetchPendingTimetables = async () => {
    try {
      if (!user?.id) {
        console.error('❌ No user found');
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching pending timetables for review');

      const token = btoa(JSON.stringify({ id: user.id, role: user.role, department_id: user.department_id }));

      const response = await fetch('/api/timetables/review-queue', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error fetching pending timetables:', errorData.error);
        setLoading(false);
        return;
      }

      const result = await response.json();

      if (!result.success) {
        console.error('❌ Failed to fetch pending timetables:', result.error);
        setLoading(false);
        return;
      }

      console.log('✅ Fetched', result.timetables?.length || 0, 'pending timetables for this department');
      setPendingTimetables(result.timetables || []);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error in fetchPendingTimetables:', error);
      setLoading(false);
    }
  };

  const handleApprove = async (timetableId: string, title: string) => {
    if (!confirm(`Approve and publish "${title}"? This will make it visible to students.`)) {
      return;
    }

    setIsProcessing(timetableId);
    console.log('✅ Approving timetable:', timetableId);

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

      console.log('✅ Timetable approved and published successfully');
      alert('✅ Timetable approved and published successfully!');
      
      // Refresh the list
      fetchPendingTimetables();
    } catch (error: any) {
      console.error('❌ Error in handleApprove:', error);
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
    console.log('❌ Rejecting timetable:', timetableId);

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

      console.log('✅ Timetable rejected successfully');
      alert('Timetable rejected. Creator will be notified.');
      
      // Refresh the list
      fetchPendingTimetables();
    } catch (error: any) {
      console.error('❌ Error in handleReject:', error);
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
    console.log('📧 Sending email notifications for timetable:', timetableId);

    try {
      // Note: Email service needs to be implemented
      // For now, this is a placeholder showing future implementation
      alert(
        '📧 Email Notification Feature\n\n' +
        'This feature is under development and will send notifications to:\n' +
        '• All students enrolled in the batch\n' +
        '• Faculty members assigned to courses\n' +
        '• Department administrators\n\n' +
        'Coming soon!'
      );

      /* Future implementation:
      const token = btoa(JSON.stringify({ id: user.id, role: user.role, department_id: user.department_id }));
      
      const response = await fetch('/api/email/sendUpdate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timetableId,
          publishedBy: `${user.first_name} ${user.last_name}`
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(`Failed to send emails: ${result.error || 'Unknown error'}`);
        setIsSendingEmail(null);
        return;
      }

      const stats = result.stats;
      alert(
        `✅ Email notifications sent successfully!\n\n` +
        `📧 Sent to:\n` +
        `• ${stats.students} students\n` +
        `• ${stats.faculty} faculty members\n` +
        `Total: ${stats.sent}/${stats.total} emails sent`
      );
      */

    } catch (error: any) {
      console.error('❌ Error sending email notifications:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSendingEmail(null);
    }
  };

  const handleView = (timetableId: string) => {
    console.log('👁️ Viewing timetable for review:', timetableId);
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
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading review queue...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const stats = {
    pending: pendingTimetables.length,
    approved: 0, // Could fetch from database if needed
    rejected: 0, // Could fetch from database if needed
  };

  return (
    <>
      <Header />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Review Queue</h1>
              <p className="text-gray-600 dark:text-gray-300">Review and approve pending timetables</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-xl">
                    <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approved}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Approved Today</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900 rounded-xl">
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rejected}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Review Items */}
            {pendingTimetables.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-12 text-center">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No pending reviews</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  All timetables have been reviewed. Check back later for new submissions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTimetables.map((timetable) => (
                  <div key={timetable.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{timetable.title}</h3>
                          <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            Pending
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Submitted by:</span> {timetable.creator_name} ({timetable.creator_email})
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Batch:</span> {timetable.batch_name} • 
                            <span className="font-medium"> Semester:</span> {timetable.semester} • 
                            <span className="font-medium"> Year:</span> {timetable.academic_year}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Classes:</span> {timetable.class_count} • 
                            <span className="font-medium"> Submitted:</span> {formatDate(timetable.submitted_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleView(timetable.id)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </button>
                      <button
                        onClick={() => handleApprove(timetable.id, timetable.title)}
                        disabled={isProcessing === timetable.id}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {isProcessing === timetable.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve & Publish
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(timetable.id, timetable.title)}
                        disabled={isProcessing === timetable.id}
                        className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleSendEmailNotification(timetable.id, timetable.title)}
                        disabled={isSendingEmail === timetable.id}
                        className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSendingEmail === timetable.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Email
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
