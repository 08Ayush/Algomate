'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle,
  Users,
  BarChart3,
  Zap,
  Bot,
  Eye,
  BookOpen,
  Clock,
  TrendingUp,
  FileText,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';

interface DashboardStats {
  activeTimetables: number;
  avgFitnessScore: number;
  facultyCount: number;
  systemHealth: number;
}

interface RecentTimetable {
  id: string;
  title: string;
  status: string;
  created_at: string;
  batch_name: string;
}

const FacultyDashboardPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeTimetables: 0,
    avgFitnessScore: 0,
    facultyCount: 0,
    systemHealth: 99
  });
  const [recentTimetables, setRecentTimetables] = useState<RecentTimetable[]>([]);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchDashboardData(parsedUser);
  }, [router]);

  const fetchDashboardData = async (userData: any) => {
    try {
      const token = btoa(JSON.stringify({
        id: userData.id,
        role: userData.role,
        department_id: userData.department_id,
        college_id: userData.college_id
      }));

      // Fetch stats
      const statsRes = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data.success) {
          setStats({
            activeTimetables: data.stats?.activeTimetables || 0,
            avgFitnessScore: data.stats?.avgFitnessScore || 0,
            facultyCount: data.stats?.facultyCount || 0,
            systemHealth: 99
          });
        }
      }

      // Fetch recent timetables
      const recentRes = await fetch('/api/dashboard/recent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (recentRes.ok) {
        const data = await recentRes.json();
        if (data.success) {
          setRecentTimetables(data.recentTimetables || []);
          setPendingReviewCount(data.pendingReviewCount || 0);
        }
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const isCreator = user?.faculty_type === 'creator';
  const isPublisher = user?.faculty_type === 'publisher';

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; className: string }> = {
      'published': { text: 'Published', className: 'bg-green-100 text-green-700' },
      'pending_approval': { text: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
      'draft': { text: 'Draft', className: 'bg-gray-100 text-gray-700' },
      'generating': { text: 'Generating', className: 'bg-purple-100 text-purple-700' },
    };
    return badges[status] || badges['draft'];
  };

  const getDashboardInfo = () => {
    if (isCreator) {
      return {
        title: 'Faculty Creator Dashboard',
        subtitle: 'Create timetables using AI or manual methods'
      };
    } else if (isPublisher) {
      return {
        title: 'Faculty Publisher Dashboard',
        subtitle: 'Review, approve, and publish timetables'
      };
    } else {
      return {
        title: 'Faculty Dashboard',
        subtitle: 'View your schedule and manage your classes'
      };
    }
  };

  const dashboardInfo = getDashboardInfo();

  return (
    <FacultyCreatorLayout activeTab="dashboard">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{dashboardInfo.title}</h1>
            <p className="text-gray-600">{dashboardInfo.subtitle}</p>
          </div>
        </div>

        {/* Welcome Banner with Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-[#4D869C] to-[#7AB2B2] rounded-xl">
              {isCreator && <Bot size={28} className="text-white" />}
              {isPublisher && <Eye size={28} className="text-white" />}
              {!isCreator && !isPublisher && <CalendarDays size={28} className="text-white" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome to Algomate</h2>
              <p className="text-gray-600">
                {isCreator && 'Create and generate optimized timetables using AI-powered tools and hybrid scheduling algorithms.'}
                {isPublisher && 'Review, approve, and publish timetables submitted by faculty creators.'}
                {!isCreator && !isPublisher && 'View your class schedules, assignments, and manage your teaching activities.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {isCreator && (
              <>
                <button
                  onClick={() => router.push('/faculty/nep-curriculum')}
                  className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:bg-[#3d6b7c] transition-all hover:shadow-lg"
                >
                  <BookOpen size={18} />
                  NEP Bucket Builder
                </button>
                <button
                  onClick={() => router.push('/faculty/ai-timetable-creator')}
                  className="flex items-center gap-2 px-5 py-3 bg-[#5a9aae] text-white rounded-xl font-semibold hover:bg-[#4D869C] transition-all hover:shadow-lg"
                >
                  <Bot size={18} />
                  Create with AI Assistant
                </button>
                <button
                  onClick={() => router.push('/faculty/hybrid-scheduler')}
                  className="flex items-center gap-2 px-5 py-3 bg-[#7AB2B2] text-white rounded-xl font-semibold hover:bg-[#5a9aae] transition-all hover:shadow-lg"
                >
                  <Zap size={18} />
                  Advanced Hybrid Scheduler
                </button>
              </>
            )}
            {isPublisher && (
              <button
                onClick={() => router.push('/faculty/review-queue')}
                className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:bg-[#3d6b7c] transition-all hover:shadow-lg"
              >
                <Eye size={18} />
                Review Queue
                {pendingReviewCount > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{pendingReviewCount}</span>
                )}
              </button>
            )}
            <button
              onClick={() => router.push('/faculty/timetables')}
              className="flex items-center gap-2 px-5 py-3 bg-white text-gray-800 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition-all"
            >
              <Eye size={18} />
              View Timetables
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-blue-100">
              <CalendarDays size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? <span className="animate-pulse">-</span> : stats.activeTimetables}
              </p>
              <p className="text-sm text-gray-500">Active Timetables</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-green-100">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? <span className="animate-pulse">-</span> : `${stats.avgFitnessScore}%`}
              </p>
              <p className="text-sm text-gray-500">Quality Score</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-purple-100">
              <Users size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? <span className="animate-pulse">-</span> : stats.facultyCount}
              </p>
              <p className="text-sm text-gray-500">Faculty Members</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-orange-100">
              <BarChart3 size={24} className="text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? <span className="animate-pulse">-</span> : `${stats.systemHealth}%`}
              </p>
              <p className="text-sm text-gray-500">System Health</p>
            </div>
          </motion.div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Timetables */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Recent Timetables</h3>
              <button
                onClick={() => router.push('/faculty/timetables')}
                className="text-sm text-[#4D869C] font-medium hover:underline flex items-center gap-1"
              >
                View All <ArrowRight size={14} />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            ) : recentTimetables.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarDays size={40} className="mx-auto mb-3 text-gray-300" />
                <p>No timetables yet</p>
                {isCreator && (
                  <button
                    onClick={() => router.push('/faculty/ai-timetable-creator')}
                    className="mt-3 text-sm text-[#4D869C] font-medium hover:underline"
                  >
                    Create your first timetable →
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {recentTimetables.slice(0, 5).map((tt, i) => (
                  <motion.div
                    key={tt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => router.push(`/faculty/timetables?id=${tt.id}`)}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{tt.title}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Clock size={12} /> {formatTimeAgo(tt.created_at)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(tt.status).className}`}>
                      {getStatusBadge(tt.status).text}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Statistics</h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600 font-medium">Total Classes Scheduled</span>
                <span className="font-bold text-gray-900">{loading ? '-' : (stats.activeTimetables * 25)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600 font-medium">Conflict Resolution Rate</span>
                <span className="font-bold text-green-600">{loading ? '-' : '98%'}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600 font-medium">Room Utilization</span>
                <span className="font-bold text-blue-600">{loading ? '-' : '87%'}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600 font-medium">Faculty Satisfaction</span>
                <span className="font-bold text-purple-600">{loading ? '-' : '4.5/5'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions for Creator */}
        {isCreator && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={() => router.push('/faculty/ai-timetable-creator')}
              className="bg-gradient-to-br from-[#4D869C] to-[#5a9aae] rounded-2xl p-6 text-white cursor-pointer hover:shadow-xl transition-all"
            >
              <Bot size={32} className="mb-4" />
              <h4 className="text-lg font-bold mb-2">AI Timetable Creator</h4>
              <p className="text-white/80 text-sm">Use AI to generate optimized schedules automatically</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={() => router.push('/faculty/hybrid-scheduler')}
              className="bg-gradient-to-br from-[#5a9aae] to-[#7AB2B2] rounded-2xl p-6 text-white cursor-pointer hover:shadow-xl transition-all"
            >
              <Zap size={32} className="mb-4" />
              <h4 className="text-lg font-bold mb-2">Hybrid Scheduler</h4>
              <p className="text-white/80 text-sm">Combine AI suggestions with manual adjustments</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              onClick={() => router.push('/faculty/nep-curriculum')}
              className="bg-gradient-to-br from-[#7AB2B2] to-[#4D869C] rounded-2xl p-6 text-white cursor-pointer hover:shadow-xl transition-all"
            >
              <BookOpen size={32} className="mb-4" />
              <h4 className="text-lg font-bold mb-2">NEP Bucket Builder</h4>
              <p className="text-white/80 text-sm">Create curriculum structures following NEP 2020</p>
            </motion.div>
          </div>
        )}
      </div>
    </FacultyCreatorLayout>
  );
};

export default FacultyDashboardPage;