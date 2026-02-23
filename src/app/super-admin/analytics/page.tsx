'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Building2,
    Users,
    Calendar,
    ClipboardList,
    Key,
    Activity,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';

interface Stats {
    colleges: number;
    admins: number;
    demoRequests: number;
    tokens: number;
    activeColleges: number;
    pendingRequests: number;
    contactedRequests: number;
    demoCompletedRequests: number;
    registeredRequests: number;
    usedTokens: number;
    expiredTokens: number;
}

const AnalyticsPage: React.FC = () => {
    const [stats, setStats] = useState<Stats>({
        colleges: 0,
        admins: 0,
        demoRequests: 0,
        tokens: 0,
        activeColleges: 0,
        pendingRequests: 0,
        contactedRequests: 0,
        demoCompletedRequests: 0,
        registeredRequests: 0,
        usedTokens: 0,
        expiredTokens: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const [collegeRes, adminRes, demoRes, tokenRes] = await Promise.all([
                fetch('/api/super-admin/colleges').catch(() => ({ ok: false, json: () => Promise.resolve({ colleges: [] }) } as Response)),
                fetch('/api/super-admin/college-admins').catch(() => ({ ok: false, json: () => Promise.resolve({ admins: [] }) } as Response)),
                fetch('/api/super-admin/demo-requests').catch(() => ({ ok: false, json: () => Promise.resolve({ requests: [] }) } as Response)),
                fetch('/api/super-admin/registration-tokens').catch(() => ({ ok: false, json: () => Promise.resolve({ tokens: [] }) } as Response))
            ]);

            const [collegeData, adminData, demoData, tokenData] = await Promise.all([
                collegeRes.ok ? collegeRes.json() : { colleges: [] },
                adminRes.ok ? adminRes.json() : { admins: [] },
                demoRes.ok ? demoRes.json() : { requests: [] },
                tokenRes.ok ? tokenRes.json() : { tokens: [] }
            ]);

            const colleges = collegeData.colleges || [];
            const requests = demoData.requests || [];
            const tokens = tokenData.tokens || [];

            setStats({
                colleges: colleges.length,
                admins: (adminData.admins || []).length,
                demoRequests: requests.length,
                tokens: tokens.length,
                activeColleges: colleges.filter((c: any) => c.is_active).length,
                pendingRequests: requests.filter((r: any) => r.status === 'pending').length,
                contactedRequests: requests.filter((r: any) => r.status === 'contacted').length,
                demoCompletedRequests: requests.filter((r: any) => r.status === 'demo_completed').length,
                registeredRequests: requests.filter((r: any) => r.status === 'registered').length,
                usedTokens: tokens.filter((t: any) => t.is_used).length,
                expiredTokens: tokens.filter((t: any) => !t.is_used && new Date(t.expires_at) < new Date()).length
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    // Calculate percentages for demo request status
    const getPercentage = (count: number) => {
        if (stats.demoRequests === 0) return 0;
        return Math.round((count / stats.demoRequests) * 100);
    };

    // Calculate growth indicators (comparing active vs inactive)
    const getGrowthIndicator = (active: number, total: number) => {
        if (total === 0) return { change: '0%', positive: true };
        const percentage = Math.round((active / total) * 100);
        return { change: `${percentage}%`, positive: percentage >= 50 };
    };

    const metrics = [
        {
            label: 'Total Colleges',
            value: stats.colleges,
            icon: Building2,
            color: '#4D869C',
            ...getGrowthIndicator(stats.activeColleges, stats.colleges)
        },
        {
            label: 'Active Colleges',
            value: stats.activeColleges,
            icon: Activity,
            color: '#48BB78',
            change: stats.colleges > 0 ? `${Math.round((stats.activeColleges / stats.colleges) * 100)}%` : '0%',
            positive: true
        },
        {
            label: 'College Admins',
            value: stats.admins,
            icon: Users,
            color: '#7AB2B2',
            change: stats.colleges > 0 ? `${(stats.admins / stats.colleges).toFixed(1)}/college` : '0',
            positive: true
        },
        {
            label: 'Demo Requests',
            value: stats.demoRequests,
            icon: ClipboardList,
            color: '#5A67D8',
            change: `${stats.pendingRequests} pending`,
            positive: stats.pendingRequests < stats.demoRequests / 2
        },
        {
            label: 'Pending Requests',
            value: stats.pendingRequests,
            icon: Calendar,
            color: '#ED8936',
            change: `${getPercentage(stats.pendingRequests)}%`,
            positive: stats.pendingRequests === 0
        },
        {
            label: 'Registration Tokens',
            value: stats.tokens,
            icon: Key,
            color: '#9F7AEA',
            change: `${stats.usedTokens} used`,
            positive: true
        }
    ];

    const requestStatusData = [
        { label: 'Pending', count: stats.pendingRequests, color: 'bg-yellow-500' },
        { label: 'Contacted', count: stats.contactedRequests, color: 'bg-blue-500' },
        { label: 'Demo Completed', count: stats.demoCompletedRequests, color: 'bg-indigo-500' },
        { label: 'Registered', count: stats.registeredRequests, color: 'bg-green-500' }
    ];

    return (
        <SuperAdminLayout activeTab="analytics">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics</h1>
                        <p className="text-gray-600">System-wide insights and statistics</p>
                    </div>
                    <button
                        onClick={fetchStats}
                        className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {metrics.map((metric, index) => (
                        <motion.div
                            key={metric.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-2xl shadow-lg p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 rounded-xl" style={{ backgroundColor: `${metric.color}15` }}>
                                    <metric.icon size={24} style={{ color: metric.color }} />
                                </div>
                                <div className={`flex items-center gap-1 text-sm font-medium ${metric.positive ? 'text-green-600' : 'text-orange-600'}`}>
                                    {metric.positive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    {metric.change}
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900 mb-1">
                                {loading ? '...' : metric.value}
                            </h3>
                            <p className="text-sm text-gray-600">{metric.label}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Token Status */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Key size={24} className="text-[#9F7AEA]" />
                            Token Status Distribution
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Active</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500" style={{ width: stats.tokens > 0 ? `${((stats.tokens - stats.usedTokens - stats.expiredTokens) / stats.tokens) * 100}%` : '0%' }}></div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{stats.tokens - stats.usedTokens - stats.expiredTokens}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Used</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: stats.tokens > 0 ? `${(stats.usedTokens / stats.tokens) * 100}%` : '0%' }}></div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{stats.usedTokens}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Expired</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500" style={{ width: stats.tokens > 0 ? `${(stats.expiredTokens / stats.tokens) * 100}%` : '0%' }}></div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{stats.expiredTokens}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Request Status Distribution */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <ClipboardList size={24} className="text-[#5A67D8]" />
                            Demo Request Status
                        </h2>
                        <div className="space-y-4">
                            {requestStatusData.map((item) => (
                                <div key={item.label} className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div className={`h-full ${item.color}`} style={{ width: `${getPercentage(item.count)}%` }}></div>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900 min-w-[40px] text-right">{getPercentage(item.count)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {stats.demoRequests === 0 && (
                            <p className="text-center text-gray-500 text-sm mt-4">No demo requests yet</p>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-[#4D869C] to-[#7AB2B2] rounded-2xl p-6 text-white">
                        <Building2 size={32} className="mb-4 opacity-80" />
                        <h3 className="text-2xl font-bold">{loading ? '...' : stats.activeColleges}/{stats.colleges}</h3>
                        <p className="text-white/80">Active Colleges</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#5A67D8] to-[#9F7AEA] rounded-2xl p-6 text-white">
                        <ClipboardList size={32} className="mb-4 opacity-80" />
                        <h3 className="text-2xl font-bold">{loading ? '...' : stats.registeredRequests}/{stats.demoRequests}</h3>
                        <p className="text-white/80">Converted to Registered</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#ED8936] to-[#F6AD55] rounded-2xl p-6 text-white">
                        <Key size={32} className="mb-4 opacity-80" />
                        <h3 className="text-2xl font-bold">{loading ? '...' : stats.usedTokens}/{stats.tokens}</h3>
                        <p className="text-white/80">Tokens Used</p>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">System Health</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-green-50 rounded-xl text-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                            <p className="text-sm font-medium text-green-700">Database</p>
                            <p className="text-xs text-green-600">Connected</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl text-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                            <p className="text-sm font-medium text-green-700">API</p>
                            <p className="text-xs text-green-600">Operational</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl text-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                            <p className="text-sm font-medium text-green-700">Auth</p>
                            <p className="text-xs text-green-600">Active</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl text-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                            <p className="text-sm font-medium text-green-700">Storage</p>
                            <p className="text-xs text-green-600">Available</p>
                        </div>
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
};

export default AnalyticsPage;
