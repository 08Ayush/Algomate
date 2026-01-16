'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Calendar,
  Users,
  BarChart3,
  ClipboardList,
  Key,
  TrendingUp,
  ArrowRight,
  Activity,
  Clock,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';

interface DashboardStats {
  colleges: number;
  admins: number;
  demoRequests: number;
  tokens: number;
  calendars: number;
  pendingRequests: number;
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

const SuperAdminDashboard: React.FC = () => {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    colleges: 0,
    admins: 0,
    demoRequests: 0,
    tokens: 0,
    calendars: 0,
    pendingRequests: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [collegeRes, adminRes, demoRes, tokenRes, calendarRes] = await Promise.all([
        fetch('/api/super-admin/colleges').catch(() => ({ ok: false, json: () => Promise.resolve({ colleges: [] }) } as Response)),
        fetch('/api/super-admin/college-admins').catch(() => ({ ok: false, json: () => Promise.resolve({ admins: [] }) } as Response)),
        fetch('/api/super-admin/demo-requests').catch(() => ({ ok: false, json: () => Promise.resolve({ requests: [] }) } as Response)),
        fetch('/api/super-admin/registration-tokens').catch(() => ({ ok: false, json: () => Promise.resolve({ tokens: [] }) } as Response)),
        fetch('/api/super-admin/calendars').catch(() => ({ ok: false, json: () => Promise.resolve({ calendars: [] }) } as Response))
      ]);

      const [collegeData, adminData, demoData, tokenData, calendarData] = await Promise.all([
        collegeRes.ok ? collegeRes.json() : { colleges: [] },
        adminRes.ok ? adminRes.json() : { admins: [] },
        demoRes.ok ? demoRes.json() : { requests: [] },
        tokenRes.ok ? tokenRes.json() : { tokens: [] },
        calendarRes.ok ? calendarRes.json() : { calendars: [] }
      ]);

      const requests = demoData.requests || [];

      setStats({
        colleges: collegeData.colleges?.length || 0,
        admins: adminData.admins?.length || 0,
        demoRequests: requests.length,
        tokens: tokenData.tokens?.length || 0,
        calendars: calendarData.calendars?.length || 0,
        pendingRequests: requests.filter((r: any) => r.status === 'pending').length
      });

      // Generate recent activity from the data
      const activities: RecentActivity[] = [];

      // Recent colleges
      (collegeData.colleges || []).slice(0, 2).forEach((c: any) => {
        activities.push({
          id: c.id,
          type: 'college',
          message: `College "${c.name}" registered`,
          timestamp: c.created_at
        });
      });

      // Recent demo requests
      (demoData.requests || []).slice(0, 2).forEach((r: any) => {
        activities.push({
          id: r.id,
          type: 'demo',
          message: `Demo request from "${r.institution_name}"`,
          timestamp: r.created_at
        });
      });

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 5));

    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const quickLinks = [
    { icon: Building2, label: 'Colleges', value: stats.colleges, color: '#4D869C', path: '/super-admin/colleges', description: 'Manage institutions' },
    { icon: Users, label: 'College Admins', value: stats.admins, color: '#7AB2B2', path: '/super-admin/college-admins', description: 'Manage administrators' },
    { icon: ClipboardList, label: 'Demo Requests', value: stats.demoRequests, color: '#5A67D8', path: '/super-admin/demo-requests', description: 'Review demo requests' },
    { icon: Key, label: 'Registration Tokens', value: stats.tokens, color: '#ED8936', path: '/super-admin/registration-tokens', description: 'Generate tokens' },
    { icon: Calendar, label: 'Calendars', value: stats.calendars, color: '#48BB78', path: '/super-admin/calendars', description: 'Academic calendars' },
    { icon: BarChart3, label: 'Analytics', value: '-', color: '#9F7AEA', path: '/super-admin/analytics', description: 'View insights' },
  ];

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'college': return Building2;
      case 'demo': return ClipboardList;
      case 'token': return Key;
      default: return Activity;
    }
  };

  return (
    <SuperAdminLayout activeTab="dashboard">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h1>
            <p className="text-gray-600">Overview of your academic management system</p>
          </div>
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickLinks.slice(0, 4).map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => router.push(item.path)}
              className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${item.color}20` }}>
                  <item.icon size={24} style={{ color: item.color }} />
                </div>
                <TrendingUp size={20} className="text-green-500" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">
                {loading ? '...' : item.value}
              </h3>
              <p className="text-sm text-gray-600 font-medium">{item.label}</p>
              <div className="mt-4 flex items-center text-xs text-gray-400 group-hover:text-[#4D869C] transition-colors">
                View details <ArrowRight size={14} className="ml-1" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pending Alert */}
        {stats.pendingRequests > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 flex items-center justify-between text-white"
          >
            <div className="flex items-center gap-3">
              <Clock size={24} />
              <div>
                <p className="font-bold">{stats.pendingRequests} Pending Demo Request{stats.pendingRequests > 1 ? 's' : ''}</p>
                <p className="text-white/80 text-sm">Review and respond to new inquiries</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/super-admin/demo-requests')}
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
            >
              View Requests <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {/* Quick Actions Grid */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickLinks.map((item, index) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(item.path)}
                className="flex flex-col items-center p-4 rounded-xl hover:bg-gray-50 transition-all group border border-gray-100"
              >
                <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: `${item.color}15` }}>
                  <item.icon size={24} style={{ color: item.color }} />
                </div>
                <span className="text-sm font-medium text-gray-700 text-center">{item.label}</span>
                <span className="text-xs text-gray-400 mt-1 text-center">{item.description}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity size={48} className="mx-auto mb-4 opacity-30" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <Icon size={18} className="text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{activity.message}</p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                    <CheckCircle2 size={16} className="text-green-500" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;
