'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { Calendar, Search, Eye, Trash2, Send, AlertCircle, CheckCircle, Clock, XCircle, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Timetable {
  id: string;
  title: string;
  status: string;
  academic_year: string;
  semester: number;
  created_at: string;
  fitness_score: number;
  batch_name: string;
  created_by_name: string;
  class_count: number;
}

export default function TimetablesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [filteredTimetables, setFilteredTimetables] = useState<Timetable[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      
      if (parsedUser.role !== 'faculty') {
        router.push('/login');
        return;
      }
      
      const facultyType = parsedUser.faculty_type;
      if (facultyType !== 'creator' && facultyType !== 'publisher') {
        router.push('/student/dashboard');
        return;
      }
      
      setUser(parsedUser);
      fetchTimetables(parsedUser.id, parsedUser.faculty_type);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  const fetchTimetables = async (userId: string, facultyType?: string) => {
    try {
      console.log('🔍 Fetching timetables for user:', userId, 'Faculty Type:', facultyType);
      
      // Check if user is a publisher
      const isPublisher = facultyType === 'publisher';
      
      let timetablesData;
      
      if (isPublisher) {
        // Publishers see ALL timetables (regardless of creator)
        console.log('📊 Publisher mode: Fetching all timetables');
        const { data, error } = await supabase
          .from('generated_timetables')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('❌ Error fetching timetables:', error);
          setLoading(false);
          return;
        }
        timetablesData = data;
      } else {
        // Creators see only their own timetables
        console.log('✏️ Creator mode: Fetching own timetables');
        const { data, error } = await supabase
          .from('generated_timetables')
          .select('*')
          .eq('created_by', userId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('❌ Error fetching timetables:', error);
          setLoading(false);
          return;
        }
        timetablesData = data;
      }

      if (!timetablesData || timetablesData.length === 0) {
        console.log('📭 No timetables found for user');
        setLoading(false);
        return;
      }

      console.log('✅ Found', timetablesData.length, 'timetables');

      // Get additional data for each timetable
      const timetablesWithDetails = await Promise.all(
        timetablesData.map(async (tt: any) => {
          // Get batch name
          const { data: batchData } = await supabase
            .from('batches')
            .select('name')
            .eq('id', tt.batch_id)
            .single();

          // Get creator name
          const { data: userData } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', tt.created_by)
            .single();

          // Get class count
          const { count } = await supabase
            .from('scheduled_classes')
            .select('id', { count: 'exact', head: true })
            .eq('timetable_id', tt.id);

          return {
            id: tt.id,
            title: tt.title,
            status: tt.status,
            academic_year: tt.academic_year,
            semester: tt.semester,
            created_at: tt.created_at,
            fitness_score: tt.fitness_score || 0,
            batch_name: batchData?.name || 'Unknown Batch',
            created_by_name: userData 
              ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() 
              : 'Unknown',
            class_count: count || 0
          };
        })
      );

      console.log('✅ Processed timetables:', timetablesWithDetails);
      setTimetables(timetablesWithDetails);
      setFilteredTimetables(timetablesWithDetails);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error in fetchTimetables:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = timetables;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(tt => tt.status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tt => 
        tt.title.toLowerCase().includes(query) ||
        tt.batch_name.toLowerCase().includes(query) ||
        tt.academic_year.toLowerCase().includes(query)
      );
    }

    setFilteredTimetables(filtered);
  }, [searchQuery, selectedStatus, timetables]);

  const handleDelete = async (timetableId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(timetableId);
    console.log('🗑️ Deleting timetable:', timetableId);

    try {
      // Delete timetable (cascade will handle scheduled_classes, workflow_approvals, etc.)
      const { error } = await supabase
        .from('generated_timetables')
        .delete()
        .eq('id', timetableId);

      if (error) {
        console.error('❌ Error deleting timetable:', error);
        alert(`Failed to delete timetable: ${error.message}`);
        setIsDeleting(null);
        return;
      }

      console.log('✅ Timetable deleted successfully');
      alert('Timetable deleted successfully!');
      
      // Refresh the list
      if (user) {
        fetchTimetables(user.id, user.faculty_type);
      }
    } catch (error: any) {
      console.error('❌ Error in handleDelete:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSubmitForReview = async (timetableId: string, title: string) => {
    if (!confirm(`Submit "${title}" for review? Publishers will be able to review and approve it.`)) {
      return;
    }

    setIsSubmitting(timetableId);
    console.log('📤 Submitting timetable for review:', timetableId);

    try {
      // Update timetable status to pending_approval
      const { error: updateError } = await supabase
        .from('generated_timetables')
        .update({ status: 'pending_approval' })
        .eq('id', timetableId);

      if (updateError) {
        console.error('❌ Error updating timetable status:', updateError);
        alert(`Failed to update status: ${updateError.message}`);
        setIsSubmitting(null);
        return;
      }

      // Update workflow approval record
      const { error: workflowError } = await supabase
        .from('workflow_approvals')
        .insert({ 
          timetable_id: timetableId,
          workflow_step: 'submitted_for_review',
          performed_by: user.id,
          comments: 'Submitted for review by creator'
        });

      if (workflowError) {
        console.error('❌ Error updating workflow:', workflowError);
        alert(`Failed to update workflow: ${workflowError.message}`);
        setIsSubmitting(null);
        return;
      }

      console.log('✅ Timetable submitted for review successfully');
      alert('Timetable submitted for review! Publishers will be notified.');
      
      // Refresh the list
      if (user) {
        fetchTimetables(user.id, user.faculty_type);
      }
    } catch (error: any) {
      console.error('❌ Error in handleSubmitForReview:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleView = (timetableId: string) => {
    // TODO: Navigate to view page or open modal
    console.log('👁️ Viewing timetable:', timetableId);
    router.push(`/faculty/timetables/view/${timetableId}`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      draft: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200', icon: AlertCircle, label: 'Draft' },
      pending_approval: { color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200', icon: Clock, label: 'Pending Review' },
      published: { color: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200', icon: CheckCircle, label: 'Published' },
      rejected: { color: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200', icon: XCircle, label: 'Rejected' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center ${config.color} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
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

  const getStats = () => {
    return {
      total: timetables.length,
      draft: timetables.filter(tt => tt.status === 'draft').length,
      pending: timetables.filter(tt => tt.status === 'pending_approval').length,
      published: timetables.filter(tt => tt.status === 'published').length,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading timetables...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const stats = getStats();

  return (
    <>
      <Header />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Timetables</h1>
              <p className="text-gray-600 dark:text-gray-300">View, manage, and submit your created timetables</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Drafts</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.draft}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-gray-500" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Published</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.published}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by title, batch, or academic year..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500"
                  />
                </div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending_approval">Pending Review</option>
                  <option value="published">Published</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Timetables List */}
            {filteredTimetables.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No timetables found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchQuery || selectedStatus !== 'all' 
                    ? 'Try adjusting your search or filter' 
                    : 'Create your first timetable to get started'}
                </p>
                <button
                  onClick={() => router.push('/faculty/ai-timetable-creator')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Timetable
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTimetables.map((timetable) => (
                  <div key={timetable.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
                          <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{timetable.title}</h3>
                            {getStatusBadge(timetable.status)}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Batch:</span> {timetable.batch_name} • 
                              <span className="font-medium"> Semester:</span> {timetable.semester} • 
                              <span className="font-medium"> Year:</span> {timetable.academic_year}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Classes:</span> {timetable.class_count} • 
                              <span className="font-medium"> Fitness:</span> {timetable.fitness_score.toFixed(1)}%
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Created By:</span> {timetable.created_by_name} • 
                              <span className="font-medium"> Created:</span> {formatDate(timetable.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 ml-4">
                        {/* View Button */}
                        <button
                          onClick={() => handleView(timetable.id)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="View Timetable"
                        >
                          <Eye className="w-5 h-5" />
                        </button>

                        {/* Submit for Review Button (only for drafts) */}
                        {timetable.status === 'draft' && (
                          <button
                            onClick={() => handleSubmitForReview(timetable.id, timetable.title)}
                            disabled={isSubmitting === timetable.id}
                            className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            title="Submit for Review"
                          >
                            {isSubmitting === timetable.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Submitting...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-1" />
                                Submit
                              </>
                            )}
                          </button>
                        )}

                        {/* Delete Button (only for drafts and rejected) */}
                        {(timetable.status === 'draft' || timetable.status === 'rejected') && (
                          <button
                            onClick={() => handleDelete(timetable.id, timetable.title)}
                            disabled={isDeleting === timetable.id}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Delete Timetable"
                          >
                            {isDeleting === timetable.id ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>
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
