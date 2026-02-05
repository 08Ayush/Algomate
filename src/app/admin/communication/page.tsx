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
    Calendar,
    Clock,
    CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import CollegeAdminLayout from '@/components/admin/CollegeAdminLayout';

const CommunicationPage: React.FC = () => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'system_alert' | 'announcement'>('system_alert');
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Form states
    const [alertForm, setAlertForm] = useState({
        title: '',
        message: '',
        priority: 'normal',
        expiresAt: ''
    });

    const [announcementForm, setAnnouncementForm] = useState({
        title: '',
        content: '',
        priority: 'normal',
        expiresAt: '',
        audienceType: 'college', // college, department
        targetId: ''
    });

    const [departments, setDepartments] = useState<any[]>([]);
    const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return;
        }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetchDepartments(parsedUser);
        fetchRecentActivity(parsedUser);
    }, []);

    const fetchRecentActivity = async (currentUser: any) => {
        try {
            const authToken = Buffer.from(JSON.stringify(currentUser)).toString('base64');
            const res = await fetch(`/api/announcements?limit=5`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRecentAnnouncements(data.announcements || []);
            }
        } catch (e) {
            console.error('Failed to fetch recent activity', e);
        }
    };

    const fetchDepartments = async (user: any) => {
        try {
            const authToken = Buffer.from(JSON.stringify(user)).toString('base64');
            const res = await fetch(`/api/admin/departments?college_id=${user.college_id}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDepartments(data.departments || []);
            }
        } catch (e) {
            console.error('Failed to fetch departments', e);
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
                    collegeId: user.college_id
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success('System alert broadcasted successfully');
                setAlertForm({ title: '', message: '', priority: 'normal', expiresAt: '' });
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

    const handleAnnouncementSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const authToken = Buffer.from(JSON.stringify(user)).toString('base64');

            // Map audience to API format
            // Assuming the API handles creation via POST to /api/announcements
            // The API logic for announcements might vary, checking known patterns
            const payload = {
                title: announcementForm.title,
                content: announcementForm.content,
                priority: announcementForm.priority,
                expiresAt: announcementForm.expiresAt || undefined,
                targetType: announcementForm.audienceType,
                targetId: announcementForm.audienceType === 'college' ? user.college_id : announcementForm.targetId,
                notifyStudents: true,
                notifyFaculty: true
            };

            const res = await fetch('/api/announcements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                toast.success('Announcement published successfully');
                setAnnouncementForm({
                    title: '',
                    content: '',
                    priority: 'normal',
                    expiresAt: '',
                    audienceType: 'college',
                    targetId: ''
                });
                fetchRecentActivity(user);
            } else {
                toast.error(data.error || 'Failed to publish announcement');
            }
        } catch (error) {
            toast.error('Error publishing announcement');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <CollegeAdminLayout activeTab="communication">
            <div className="space-y-6 max-w-5xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Communication Hub</h1>
                    <p className="text-gray-600">Broadcast messages, alerts, and announcements to your institute</p>
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
                    <button
                        onClick={() => setActiveTab('announcement')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'announcement'
                            ? 'bg-[#4D869C] text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Megaphone size={18} />
                        Announcements
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
                    >
                        {activeTab === 'system_alert' ? (
                            <form onSubmit={handleSystemAlertSubmit} className="space-y-6">
                                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                                    <div className="p-3 bg-red-50 rounded-xl text-red-500">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Send System Alert</h2>
                                        <p className="text-sm text-gray-500">Alerts appear as popup notifications for all users</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Alert Title</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g., Emergency Maintenance"
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
                                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
                                    >
                                        {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Send size={18} />}
                                        Broadcast Alert
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleAnnouncementSubmit} className="space-y-6">
                                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                                    <div className="p-3 bg-blue-50 rounded-xl text-[#4D869C]">
                                        <Megaphone size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Post Announcement</h2>
                                        <p className="text-sm text-gray-500">Announcements appear on the dashboard feed</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g., Annual Sports Day"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                                                value={announcementForm.title}
                                                onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                            <select
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                                                value={announcementForm.priority}
                                                onChange={e => setAnnouncementForm({ ...announcementForm, priority: e.target.value })}
                                            >
                                                <option value="normal">Normal</option>
                                                <option value="high">High</option>
                                                <option value="urgent">Urgent</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <select
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                                                value={announcementForm.audienceType}
                                                onChange={e => setAnnouncementForm({ ...announcementForm, audienceType: e.target.value })}
                                            >
                                                <option value="college">Entire College</option>
                                                <option value="department">Specific Department</option>
                                            </select>

                                            {announcementForm.audienceType === 'department' && (
                                                <select
                                                    required
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                                                    value={announcementForm.targetId}
                                                    onChange={e => setAnnouncementForm({ ...announcementForm, targetId: e.target.value })}
                                                >
                                                    <option value="">Select Department</option>
                                                    {departments.map(dept => (
                                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                                        <textarea
                                            required
                                            rows={5}
                                            placeholder="Enter announcement details..."
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none resize-none transition-all"
                                            value={announcementForm.content}
                                            onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until (Optional)</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                                            value={announcementForm.expiresAt}
                                            onChange={e => setAnnouncementForm({ ...announcementForm, expiresAt: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
                                    >
                                        {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Send size={18} />}
                                        Publish Announcement
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.div>

                    {/* Preview / Info Section */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-6"
                    >
                        <div className="bg-[#4D869C] rounded-2xl shadow-lg p-6 text-white">
                            <Info size={32} className="mb-4 opacity-80" />
                            <h3 className="text-xl font-bold mb-2">Best Practices</h3>
                            <ul className="space-y-3 opacity-90 text-sm">
                                <li className="flex gap-2">
                                    <span className="font-bold">•</span>
                                    Use 'Urgent' priority only for critical issues like server maintenance or emergency holidays.
                                </li>
                                <li className="flex gap-2">
                                    <span className="font-bold">•</span>
                                    System alerts are obtrusive; use Announcements for general news.
                                </li>
                                <li className="flex gap-2">
                                    <span className="font-bold">•</span>
                                    Always set an expiry date for time-sensitive alerts to avoid stale notifications.
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <CheckCircle2 size={20} className="text-green-500" />
                                Recent Activity
                            </h3>
                            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
                                {recentAnnouncements.length === 0 ? (
                                    <div className="text-center text-gray-400 py-8 text-sm">
                                        No recent activity
                                    </div>
                                ) : (
                                    recentAnnouncements.map((item) => (
                                        <div key={item.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                                            <p className="font-medium text-gray-800 text-sm truncate" title={item.title}>{item.title}</p>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className={`capitalize text-xs px-2 py-0.5 rounded-full ${item.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                                                    item.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                                                        'bg-blue-50 text-blue-600'
                                                    }`}>
                                                    {item.priority}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </CollegeAdminLayout>
    );
};

export default CommunicationPage;
