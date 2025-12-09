'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { Eye, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
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
      fetchPendingTimetables(parsedUser.department_id);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  const fetchPendingTimetables = async (departmentId?: string) => {
    try {
      // Get department ID from parameter or fetch from user
      let userDepartmentId = departmentId;
      
      if (!userDepartmentId && user?.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('department_id')
          .eq('id', user.id)
          .single();
        userDepartmentId = userData?.department_id;
      }

      if (!userDepartmentId) {
        console.error('❌ No department ID found');
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching pending timetables for review from department:', userDepartmentId);
      
      // First, get all batches for this department
      const { data: departmentBatches, error: batchError } = await supabase
        .from('batches')
        .select('id')
        .eq('department_id', userDepartmentId);

      if (batchError) {
        console.error('❌ Error fetching department batches:', batchError);
        setLoading(false);
        return;
      }

      const batchIds = departmentBatches?.map(b => b.id) || [];
      
      if (batchIds.length === 0) {
        console.log('⚠️ No batches found for this department');
        setPendingTimetables([]);
        setLoading(false);
        return;
      }

      console.log('📦 Found', batchIds.length, 'batches for department:', userDepartmentId);

      // Now fetch timetables only for those batches
      const { data, error } = await supabase
        .from('generated_timetables')
        .select(`
          *,
          batch:batches(id, name, department_id)
        `)
        .eq('status', 'pending_approval')
        .in('batch_id', batchIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching pending timetables:', error);
        setLoading(false);
        return;
      }

      console.log('✅ Fetched', data?.length || 0, 'pending timetables for this department');
      const filteredData = data;

      // Get additional details for each timetable
      const timetablesWithCounts = await Promise.all(
        (filteredData || []).map(async (tt: any) => {
          // Get batch name
          const { data: batchData } = await supabase
            .from('batches')
            .select('name')
            .eq('id', tt.batch_id)
            .single();

          // Get creator info
          const { data: userData } = await supabase
            .from('users')
            .select('first_name, last_name, email')
            .eq('id', tt.created_by)
            .single();

          // Get class count
          const { count } = await supabase
            .from('scheduled_classes')
            .select('id', { count: 'exact', head: true })
            .eq('timetable_id', tt.id);

          // Get workflow submission time
          const { data: workflowData } = await supabase
            .from('workflow_approvals')
            .select('performed_at')
            .eq('timetable_id', tt.id)
            .eq('workflow_step', 'submitted_for_review')
            .order('performed_at', { ascending: false })
            .limit(1)
            .single();

          return {
            id: tt.id,
            title: tt.title,
            status: tt.status,
            academic_year: tt.academic_year,
            semester: tt.semester,
            submitted_at: workflowData?.performed_at || tt.created_at,
            batch_name: batchData?.name || 'Unknown Batch',
            creator_name: userData ? `${userData.first_name} ${userData.last_name}`.trim() : 'Unknown',
            creator_email: userData?.email || '',
            class_count: count || 0,
            workflow_status: 'pending_review'
          };
        })
      );

      console.log('✅ Fetched pending timetables:', timetablesWithCounts.length);
      setPendingTimetables(timetablesWithCounts);
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
      // Update timetable status to published
      const { error: updateError } = await supabase
        .from('generated_timetables')
        .update({ status: 'published' })
        .eq('id', timetableId);

      if (updateError) {
        console.error('❌ Error publishing timetable:', updateError);
        alert(`Failed to publish: ${updateError.message}`);
        setIsProcessing(null);
        return;
      }

      // Add workflow approval record
      const { error: workflowError } = await supabase
        .from('workflow_approvals')
        .insert({
          timetable_id: timetableId,
          workflow_step: 'approved',
          performed_by: user.id,
          comments: 'Approved and published by publisher'
        });

      if (workflowError) {
        console.error('❌ Error updating workflow:', workflowError);
        alert(`Failed to update workflow: ${workflowError.message}`);
        setIsProcessing(null);
        return;
      }

      console.log('✅ Timetable approved and published successfully');
      
      // Send email notifications to all students and faculty
      try {
        const notifyResponse = await fetch('/api/email/sendUpdate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify({
            timetableId,
            publishedBy: `${user.first_name} ${user.last_name}`
          })
        });

        const notifyData = await notifyResponse.json();
        
        if (notifyData.success) {
          const stats = notifyData.stats;
          alert(
            `✅ Timetable approved and published successfully!\n\n` +
            `📧 Email notifications sent to:\n` +
            `• ${stats.students} students\n` +
            `• ${stats.faculty} faculty members\n` +
            `Total: ${stats.sent}/${stats.total} emails sent`
          );
        } else {
          alert(
            `✅ Timetable approved and published successfully!\n\n` +
            `⚠️ Warning: Failed to send email notifications.\n` +
            `Please inform students manually.`
          );
        }
      } catch (emailError) {
        console.error('❌ Error sending email notifications:', emailError);
        alert(
          `✅ Timetable approved and published successfully!\n\n` +
          `⚠️ Warning: Failed to send email notifications.\n` +
          `Please inform students manually.`
        );
      }
      
      // Refresh the list
      fetchPendingTimetables(user?.department_id);
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
      // Update timetable status to rejected
      const { error: updateError } = await supabase
        .from('generated_timetables')
        .update({ status: 'rejected' })
        .eq('id', timetableId);

      if (updateError) {
        console.error('❌ Error rejecting timetable:', updateError);
        alert(`Failed to reject: ${updateError.message}`);
        setIsProcessing(null);
        return;
      }

      // Add workflow rejection record
      const { error: workflowError } = await supabase
        .from('workflow_approvals')
        .insert({
          timetable_id: timetableId,
          workflow_step: 'rejected',
          performed_by: user.id,
          comments: reason,
          rejection_reason: reason
        });

      if (workflowError) {
        console.error('❌ Error updating workflow:', workflowError);
        alert(`Failed to update workflow: ${workflowError.message}`);
        setIsProcessing(null);
        return;
      }

      console.log('✅ Timetable rejected successfully');
      alert('Timetable rejected. Creator will be notified.');
      
      // Refresh the list
      fetchPendingTimetables(user?.department_id);
    } catch (error: any) {
      console.error('❌ Error in handleReject:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(null);
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
