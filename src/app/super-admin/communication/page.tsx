'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Bell,
    Megaphone,
    Send,
    AlertTriangle,
    Info,
    CheckCircle2,
    Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';

interface College {
    id: string;
    name: string;
    code: string;
}

const SuperAdminCommunicationPage: React.FC = () => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'system_alert' | 'announcement'>('system_alert');
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [colleges, setColleges] = useState<College[]>([]);

    // Form states
    const [alertForm, setAlertForm] = useState({
        title: '',
        message: '',
        priority: 'normal',
        expiresAt: '',
        targetCollegeId: '' // Empty = All Colleges
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return;
        }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetchColleges(parsedUser);
    }, []);

    const fetchColleges = async (user: any) => {
        try {
            const authToken = Buffer.from(JSON.stringify(user)).toString('base64');
            const res = await fetch('/api/super-admin/colleges', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setColleges(data.colleges || data.data || []);
            }
        } catch (e) {
            console.error('Failed to fetch colleges', e);
        }
    };

    const handleSystemAlertSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const authToken = Buffer.from(JSON.stringify(user)).toString('base64');
            const res = await fetch('/api/admin/system-alerts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    title: alertForm.title,
                    message: alertForm.message,
                    priority: alertForm.priority,
                    expiresAt: alertForm.expiresAt || undefined,
                    collegeId: alertForm.targetCollegeId || null // Null for Global
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(alertForm.targetCollegeId ? 'Alert sent to specific college' : 'Global System Alert broadcasted!');
                setAlertForm({ title: '', message: '', priority: 'normal', expiresAt: '', targetCollegeId: '' });
            } else {
                toast.error(data.error || 'Failed to send alert');
            }
        } catch (error) {
            toast.error('Error sending system alert');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SuperAdminLayout activeTab="communication">
            <div className="space-y-6 max-w-5xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Communication Hub</h1>
                    <p className="text-gray-600">Broadcast system-wide alerts and notifications to all colleges or specific institutes</p>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-sm p-2 flex gap-2 w-fit border border-gray-100">
                    <button
                        onClick={() => setActiveTab('system_alert')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'system_alert'
                            ? 'bg-[#4D869C] text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <AlertTriangle size={18} />
                        System Alerts
                    </button>
                    {/* Placeholder for Announcements if needed later, focusing on Alerts per request */}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
                    >
                        <form onSubmit={handleSystemAlertSubmit} className="space-y-6">
                            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                                <div className="p-3 bg-red-50 rounded-xl text-red-500">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Send Platform-Wide Alert</h2>
                                    <p className="text-sm text-gray-500">Alerts appear as critical popup notifications for users</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all font-medium"
                                        value={alertForm.targetCollegeId}
                                        onChange={e => setAlertForm({ ...alertForm, targetCollegeId: e.target.value })}
                                    >
                                        <option value="">🌍 All Colleges (Global Broadcast)</option>
                                        {colleges.map(college => (
                                            <option key={college.id} value={college.id}>🏫 {college.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1 ml-1">
                                        {alertForm.targetCollegeId
                                            ? "Alert will be sent only to users in the selected college."
                                            : "⚠️ Alert will be sent to ALL users in ALL colleges."}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Alert Title</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g., Scheduled System Maintenance"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                                            value={alertForm.title}
                                            onChange={e => setAlertForm({ ...alertForm, title: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                        <select
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                                            value={alertForm.priority}
                                            onChange={e => setAlertForm({ ...alertForm, priority: e.target.value })}
                                        >
                                            <option value="normal">Normal</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message Content</label>
                                    <textarea
                                        required
                                        rows={5}
                                        placeholder="Enter the detailed alert message..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none resize-none transition-all"
                                        value={alertForm.message}
                                        onChange={e => setAlertForm({ ...alertForm, message: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (Optional)</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                                        value={alertForm.expiresAt}
                                        onChange={e => setAlertForm({ ...alertForm, expiresAt: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
                                >
                                    {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Send size={18} />}
                                    Broadcast Global Alert
                                </button>
                            </div>
                        </form>
                    </motion.div>

                    {/* Info Section */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-6"
                    >
                        <div className="bg-[#4D869C] rounded-2xl shadow-lg p-6 text-white">
                            <Info size={32} className="mb-4 opacity-80" />
                            <h3 className="text-xl font-bold mb-2">Platform Controls</h3>
                            <ul className="space-y-3 opacity-90 text-sm">
                                <li className="flex gap-2">
                                    <span className="font-bold">•</span>
                                    Global Alerts reach every user in every college. Use with caution.
                                </li>
                                <li className="flex gap-2">
                                    <span className="font-bold">•</span>
                                    Great for "System Maintenance", "Security Updates", or "Platform Global Announcements".
                                </li>
                                <li className="flex gap-2">
                                    <span className="font-bold">•</span>
                                    Target specific colleges if the issue is isolated to one tenant.
                                </li>
                            </ul>
                        </div>
                    </motion.div>
                </div>
            </div>
        </SuperAdminLayout>
    );
};

export default SuperAdminCommunicationPage;
