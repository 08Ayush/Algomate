'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  role: string;
  faculty_type?: string;
  department_id?: string;
}

interface DashboardStats {
  activeTimetables: number;
  avgFitnessScore: number;
  facultyCount: number;
  avgGenerationTime: string;
  totalClassesScheduled: number;
  conflictResolutionRate: number;
  roomUtilization: number;
  facultySatisfaction: number;
}

interface RecentTimetable {
  id: string;
  title: string;
  status: string;
  created_at: string;
  batch_name: string;
}

interface RecentActivity {
  id: string;
  type: 'timetable_published' | 'modification_request' | 'optimization_completed';
  title: string;
  description: string;
  created_at: string;
}

export default function FacultyDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeTimetables: 0,
    avgFitnessScore: 0,
    facultyCount: 0,
    avgGenerationTime: '0s',
    totalClassesScheduled: 0,
    conflictResolutionRate: 0,
    roomUtilization: 0,
    facultySatisfaction: 0
  });
  const [recentTimetables, setRecentTimetables] = useState<RecentTimetable[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

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
      
      setUser(parsedUser);
      fetchDashboardData(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  const fetchDashboardData = async (userData: User) => {
    try {
      await Promise.all([
        fetchStats(userData),
        fetchRecentTimetables(userData),
        fetchRecentActivities(userData),
        fetchPendingReviewCount(userData)
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (userData: User) => {
    try {
      // Fetch timetables based on user type
      let query = supabase
        .from('generated_timetables')
        .select('*, batch:batches!inner(department_id)');

      if (userData.faculty_type === 'creator') {
        query = query.eq('created_by', userData.id);
      } else if (userData.faculty_type === 'publisher' && userData.department_id) {
        query = query.eq('batch.department_id', userData.department_id);
      }

      const { data: timetables, error: timetablesError } = await query;

      if (timetablesError) throw timetablesError;

      // Calculate active timetables
      const activeTimetables = timetables?.filter(t => t.status === 'published')?.length || 0;

      // Calculate average fitness score
      const validFitnessScores = timetables?.filter(t => t.fitness_score > 0).map(t => t.fitness_score) || [];
      const avgFitnessScore = validFitnessScores.length > 0
        ? validFitnessScores.reduce((a, b) => a + b, 0) / validFitnessScores.length
        : 0;

      // Fetch faculty count in department
      const { count: facultyCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', userData.department_id)
        .eq('role', 'faculty')
        .eq('is_active', true);

      // Fetch generation tasks for average time
      const { data: tasks } = await supabase
        .from('timetable_generation_tasks')
        .select('execution_time_seconds')
        .eq('created_by', userData.id)
        .eq('status', 'COMPLETED')
        .limit(10);

      const avgTime = tasks && tasks.length > 0
        ? tasks.reduce((sum, t) => sum + (t.execution_time_seconds || 0), 0) / tasks.length
        : 0;
      const avgGenerationTime = avgTime > 0 ? `${avgTime.toFixed(1)}s` : '0s';

      // Fetch total scheduled classes
      const timetableIds = timetables?.map(t => t.id) || [];
      const { count: totalClasses } = await supabase
        .from('scheduled_classes')
        .select('*', { count: 'exact', head: true })
        .in('timetable_id', timetableIds.length > 0 ? timetableIds : ['dummy']);

      // Calculate conflict resolution rate
      const timetablesWithViolations = timetables?.filter(t => 
        t.constraint_violations && Array.isArray(t.constraint_violations) && t.constraint_violations.length > 0
      ).length || 0;
      const totalTimetables = timetables?.length || 0;
      const conflictResolutionRate = totalTimetables > 0
        ? ((totalTimetables - timetablesWithViolations) / totalTimetables) * 100
        : 0;

      // Fetch classroom utilization
      const { data: classrooms } = await supabase
        .from('classrooms')
        .select('id')
        .eq('department_id', userData.department_id)
        .eq('is_available', true);

      const classroomIds = classrooms?.map(c => c.id) || [];
      const { count: usedClassrooms } = await supabase
        .from('scheduled_classes')
        .select('classroom_id', { count: 'exact', head: true })
        .in('timetable_id', timetableIds.length > 0 ? timetableIds : ['dummy'])
        .in('classroom_id', classroomIds.length > 0 ? classroomIds : ['dummy']);

      const roomUtilization = classroomIds.length > 0 && usedClassrooms
        ? (usedClassrooms / classroomIds.length) * 100
        : 0;

      setStats({
        activeTimetables,
        avgFitnessScore: Math.round(avgFitnessScore),
        facultyCount: facultyCount || 0,
        avgGenerationTime,
        totalClassesScheduled: totalClasses || 0,
        conflictResolutionRate: Math.round(conflictResolutionRate * 10) / 10,
        roomUtilization: Math.round(roomUtilization),
        facultySatisfaction: avgFitnessScore > 0 ? Math.round((avgFitnessScore / 100) * 50) / 10 : 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentTimetables = async (userData: User) => {
    try {
      let query = supabase
        .from('generated_timetables')
        .select(`
          id,
          title,
          status,
          created_at,
          batch:batches!inner(name, department_id)
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (userData.faculty_type === 'creator') {
        query = query.eq('created_by', userData.id);
      } else if (userData.faculty_type === 'publisher' && userData.department_id) {
        query = query.eq('batch.department_id', userData.department_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted = data?.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        created_at: t.created_at,
        batch_name: (t.batch as any)?.name || 'Unknown Batch'
      })) || [];

      setRecentTimetables(formatted);
    } catch (error) {
      console.error('Error fetching recent timetables:', error);
    }
  };

  const fetchRecentActivities = async (userData: User) => {
    try {
      // Fetch recent notifications and workflow approvals
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(3);

      const activities: RecentActivity[] = notifications?.map(n => ({
        id: n.id,
        type: n.type === 'timetable_published' ? 'timetable_published' : 
              n.type === 'approval_request' ? 'modification_request' : 'optimization_completed',
        title: n.title,
        description: n.message,
        created_at: n.created_at
      })) || [];

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  const fetchPendingReviewCount = async (userData: User) => {
    try {
      if (userData.faculty_type !== 'publisher' || !userData.department_id) {
        setPendingReviewCount(0);
        return;
      }

      const { count } = await supabase
        .from('generated_timetables')
        .select('*, batch:batches!inner(department_id)', { count: 'exact', head: true })
        .eq('status', 'pending_approval')
        .eq('batch.department_id', userData.department_id);

      setPendingReviewCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending review count:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} ${Math.floor(seconds / 60) === 1 ? 'minute' : 'minutes'} ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ${Math.floor(seconds / 3600) === 1 ? 'hour' : 'hours'} ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} ${Math.floor(seconds / 86400) === 1 ? 'day' : 'days'} ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; className: string }> = {
      'published': { text: 'Published', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
      'pending_approval': { text: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
      'draft': { text: 'Draft', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
      'generating': { text: 'Generating', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
    };
    
    return badges[status] || badges['draft'];
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'timetable_published':
        return 'text-green-600 dark:text-green-400';
      case 'modification_request':
        return 'text-blue-600 dark:text-blue-400';
      case 'optimization_completed':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  // Check if user is a publisher
  const isPublisher = user?.faculty_type === 'publisher';
  const isCreator = user?.faculty_type === 'creator';

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Header />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 p-8 min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        {/* Hero Section with Gradient Background */}
        <div className="mb-10 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-3xl p-10 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-110 hover:rotate-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-5xl font-extrabold text-blue-600 dark:text-blue-400 mb-3 tracking-tight">
            Welcome to Academic Compass
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl leading-relaxed">
            {isPublisher 
              ? 'Review and publish timetables. Ensure quality and approve schedules for distribution.'
              : 'Revolutionary Automated timetable generation with stylish interface. Create, review, and publish optimized schedules through intelligent workflows.'}
          </p>
          
          <div className="flex flex-wrap gap-3">
            {isCreator && (
              <>
                <button 
                  onClick={() => router.push('/faculty/nep-curriculum')}
                  className="group bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
                  </svg>
                  <span>NEP Bucket Builder</span>
                </button>
                
                <button 
                  onClick={() => router.push('/faculty/ai-timetable-creator')}
                  className="group bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                  </svg>
                  <span>Create with AI Assistant</span>
                </button>
                
                <button 
                  onClick={() => router.push('/faculty/hybrid-scheduler')}
                  className="group bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"/>
                  </svg>
                  <span>Advanced Hybrid Scheduler</span>
                </button>
              </>
            )}
            
            {isPublisher && (
              <button 
                onClick={() => router.push('/faculty/review-queue')}
                className="group bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1"
              >
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                </svg>
                <span>Review Queue</span>
                {pendingReviewCount > 0 && (
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    {pendingReviewCount}
                  </span>
                )}
              </button>
            )}
            
            <button 
              onClick={() => router.push('/faculty/timetables')}
              className="group bg-white text-gray-800 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 flex items-center space-x-2 shadow-md hover:shadow-lg border border-gray-200 transform hover:scale-105 hover:-translate-y-1"
            >
              <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
              </svg>
              <span>View Timetables</span>
            </button>
          </div>
        </div>

        {/* Stats Cards - Updated with modern design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Active Timetables */}
          <div className="group bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md hover:shadow-2xl border border-gray-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 cursor-pointer">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
                {loading ? (
                  <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-10 w-16 rounded"></div>
                ) : (
                  stats.activeTimetables
                )}
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Timetables</div>
            </div>
          </div>

          {/* Quality Score */}
          <div className="group bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md hover:shadow-2xl border border-gray-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 cursor-pointer">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
                {loading ? (
                  <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-10 w-16 rounded"></div>
                ) : (
                  `${stats.avgFitnessScore}%`
                )}
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Quality Score</div>
            </div>
          </div>

          {/* Faculty Members */}
          <div className="group bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md hover:shadow-2xl border border-gray-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 cursor-pointer">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
              </div>
              <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
                {loading ? (
                  <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-10 w-16 rounded"></div>
                ) : (
                  stats.facultyCount
                )}
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Faculty Members</div>
            </div>
          </div>

          {/* Avg. Generation Time */}
          <div className="group bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md hover:shadow-2xl border border-gray-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 cursor-pointer">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
                {loading ? (
                  <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-10 w-16 rounded"></div>
                ) : (
                  stats.avgGenerationTime
                )}
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Generation Time</div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Recent Timetables */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md hover:shadow-xl border border-gray-100 dark:border-slate-700 transition-all duration-300">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Recent Timetables</h3>
            <div className="space-y-4">
              {loading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-2xl animate-pulse">
                      <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                    </div>
                  ))}
                </>
              ) : recentTimetables.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No recent timetables found
                </div>
              ) : (
                recentTimetables.map((tt) => (
                  <div 
                    key={tt.id}
                    onClick={() => router.push(`/faculty/timetables?id=${tt.id}`)}
                    className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl hover:shadow-md transition-all duration-300 transform hover:scale-[1.02] cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{tt.title}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{formatTimeAgo(tt.created_at)}</div>
                    </div>
                    <span className={`${getStatusBadge(tt.status).className} text-xs font-bold px-3 py-1.5 rounded-full shadow-sm`}>
                      {getStatusBadge(tt.status).text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md hover:shadow-xl border border-gray-100 dark:border-slate-700 transition-all duration-300">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Quick Statistics</h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200 cursor-pointer group">
                <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Total Classes Scheduled</span>
                <span className="font-bold text-gray-900 dark:text-white text-xl">
                  {loading ? (
                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-6 w-12 rounded"></div>
                  ) : (
                    stats.totalClassesScheduled
                  )}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200 cursor-pointer group">
                <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Conflict Resolution Rate</span>
                <span className="font-bold text-green-600 dark:text-green-400 text-xl">
                  {loading ? (
                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-6 w-16 rounded"></div>
                  ) : (
                    `${stats.conflictResolutionRate}%`
                  )}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200 cursor-pointer group">
                <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Room Utilization</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-xl">
                  {loading ? (
                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-6 w-12 rounded"></div>
                  ) : (
                    `${stats.roomUtilization}%`
                  )}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200 cursor-pointer group">
                <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Faculty Satisfaction</span>
                <span className="font-bold text-purple-600 dark:text-purple-400 text-xl">
                  {loading ? (
                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-6 w-12 rounded"></div>
                  ) : (
                    `${stats.facultySatisfaction}/5`
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity - Enhanced Design */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md hover:shadow-xl border border-gray-100 dark:border-slate-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Activity</h3>
            <button className="group text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 transform hover:scale-105">
              View All →
            </button>
          </div>
          
          <div className="space-y-5">
            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start space-x-4 p-4 rounded-2xl animate-pulse">
                    <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-2xl"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No recent activity found
              </div>
            ) : (
              recentActivities.map((activity) => {
                const iconColor = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="group flex items-start space-x-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-300 cursor-pointer">
                    <div className={`w-12 h-12 bg-gradient-to-br ${iconColor} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                      <svg className={`w-6 h-6 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                        {activity.type === 'timetable_published' && (
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        )}
                        {activity.type === 'modification_request' && (
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                        )}
                        {activity.type === 'optimization_completed' && (
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                        )}
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white font-medium leading-relaxed">
                        <span className={`font-bold ${iconColor}`}>{activity.title}</span> {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatTimeAgo(activity.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        </main>
      </div>
    </>
  );
}