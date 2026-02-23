'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    CalendarDays, Search, RefreshCw, Eye, Trash2, CheckCircle, Clock, AlertCircle,
    Send, Bell, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';
import { useSemesterMode } from '@/contexts/SemesterModeContext';

interface Timetable {
    id: string;
    title: string;
    status: string;
    created_at: string;
    updated_at?: string;
    batch?: {
        name: string;
        semester: number;
        section: string;
    };
    batch_name?: string; // Keep for backward compatibility if needed
    semester?: number;
    academic_year?: string;
    fitness_score?: number;
    created_by?: string;
}

const TimetablesPage: React.FC = () => {
    const router = useRouter();
    const { semesterMode, activeSemesters, modeLabel } = useSemesterMode();
    const [user, setUser] = useState<any>(null);
    const [timetables, setTimetables] = useState<Timetable[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [semesterFilter, setSemesterFilter] = useState('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const isCreator = user?.faculty_type === 'creator';
    const isPublisher = user?.faculty_type === 'publisher';

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return;
        }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetchTimetables(parsedUser);
    }, [router]);

    useEffect(() => { setSemesterFilter('all'); }, [semesterMode]);

    const getAuthHeaders = () => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return null; }
        return { 'Authorization': `Bearer ${Buffer.from(userData).toString('base64')}`, 'Content-Type': 'application/json' };
    };

    const fetchTimetables = async (userData?: any) => {
        try {
            setLoading(true);
            const currentUser = userData || user;
            if (!currentUser) return;
            const headers = getAuthHeaders();
            if (!headers) return;

            // Fetch all timetables for the user's college - don't filter by department
            const res = await fetch(`/api/timetables`, { headers });
            if (res.ok) {
                const data = await res.json();
                setTimetables(data.timetables || data.data || []);
            }
        } catch { toast.error('Error loading timetables'); } finally { setLoading(false); }
    };

    const submitForReview = async (timetableId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Submit this timetable for review by publisher?')) return;

        setActionLoading(timetableId);
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const res = await fetch(`/api/timetables/${timetableId}/submit`, {
                method: 'POST',
                headers
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Timetable submitted for review!');
                fetchTimetables();
            } else {
                toast.error(data.error || 'Failed to submit');
            }
        } catch (error) {
            console.error('Error submitting timetable:', error);
            toast.error('Failed to submit timetable');
        } finally {
            setActionLoading(null);
        }
    };

    const deleteTimetable = async (timetableId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this timetable? This action cannot be undone.')) return;

        setActionLoading(timetableId);
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const res = await fetch(`/api/timetables/${timetableId}/delete`, {
                method: 'DELETE',
                headers
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Timetable deleted successfully!');
                setTimetables(prev => prev.filter(t => t.id !== timetableId));
            } else {
                toast.error(data.error || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting timetable:', error);
            toast.error('Failed to delete timetable');
        } finally {
            setActionLoading(null);
        }
    };

    const unpublishTimetable = async (timetableId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to unpublish this timetable? It will be reverted to draft status.')) return;

        setActionLoading(timetableId);
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const res = await fetch(`/api/timetables/${timetableId}/unpublish`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ reason: 'Unpublished by publisher' })
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Timetable unpublished successfully!');
                fetchTimetables();
            } else {
                toast.error(data.error || 'Failed to unpublish');
            }
        } catch (error) {
            console.error('Error unpublishing timetable:', error);
            toast.error('Failed to unpublish timetable');
        } finally {
            setActionLoading(null);
        }
    };

    const notifyStudents = async (timetableId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        toast.success('Students will be notified about the timetable!');
        // TODO: Implement notification API call
    };

    // Unique semesters from timetables for the dropdown
    const uniqueSemesters = [...new Set(
        timetables.map(t => t.batch?.semester || t.semester).filter(Boolean)
    )]
        .filter(sem => semesterMode === 'all' || activeSemesters.includes(sem!))
        .sort((a, b) => (a || 0) - (b || 0));

    const filteredTimetables = timetables.filter(t => {
        const matchesSearch = t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.batch?.name || t.batch_name)?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
        const ttSem = t.batch?.semester || t.semester;
        const matchesSem = semesterFilter === 'all' || ttSem?.toString() === semesterFilter;
        const matchesMode = semesterMode === 'all' || (ttSem != null && activeSemesters.includes(ttSem));
        return matchesSearch && matchesStatus && matchesSem && matchesMode;
    });

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'published': 'bg-green-100 text-green-700',
            'pending_approval': 'bg-yellow-100 text-yellow-700',
            'draft': 'bg-gray-100 text-gray-700',
            'generating': 'bg-purple-100 text-purple-700',
            'approved': 'bg-blue-100 text-blue-700',
            'rejected': 'bg-red-100 text-red-700',
        };
        return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-700';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'published': return <CheckCircle size={14} />;
            case 'pending_approval': return <Clock size={14} />;
            case 'generating': return <AlertCircle size={14} />;
            case 'rejected': return <XCircle size={14} />;
            default: return null;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <FacultyCreatorLayout activeTab="timetables">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Timetables</h1>
                        <p className="text-gray-600">View and manage generated timetables</p>
                    </div>
                    <button onClick={() => fetchTimetables()} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Search & Filters */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex gap-4 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search timetables..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-xl min-w-[150px]"
                        >
                            <option value="all">All Status</option>
                            <option value="published">Published</option>
                            <option value="pending_approval">Pending</option>
                            <option value="draft">Draft</option>
                            <option value="generating">Generating</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <select
                            value={semesterFilter}
                            onChange={(e) => setSemesterFilter(e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-xl min-w-[150px]"
                        >
                            <option value="all">All Semesters</option>
                            {uniqueSemesters.map(sem => (
                                <option key={sem} value={sem?.toString()}>Semester {sem}</option>
                            ))}
                        </select>
                    </div>
                    {semesterMode !== 'all' && (
                        <div className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${semesterMode === 'odd' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-violet-50 text-violet-700 border border-violet-200'
                            }`}>
                            <span className="w-2 h-2 rounded-full animate-pulse inline-block bg-current"></span>
                            Active mode: <strong className="ml-1">{modeLabel}</strong>
                            <span className="ml-1 text-xs opacity-70">— Sem {activeSemesters.join(', ')} only.</span>
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg p-5 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-100"><CalendarDays size={22} className="text-blue-600" /></div>
                        <div><p className="text-xl font-bold text-gray-900">{timetables.length}</p><p className="text-sm text-gray-500">Total</p></div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl shadow-lg p-5 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-100"><CheckCircle size={22} className="text-green-600" /></div>
                        <div><p className="text-xl font-bold text-gray-900">{timetables.filter(t => t.status === 'published').length}</p><p className="text-sm text-gray-500">Published</p></div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-lg p-5 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-yellow-100"><Clock size={22} className="text-yellow-600" /></div>
                        <div><p className="text-xl font-bold text-gray-900">{timetables.filter(t => t.status === 'pending_approval').length}</p><p className="text-sm text-gray-500">Pending</p></div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl shadow-lg p-5 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gray-100"><AlertCircle size={22} className="text-gray-600" /></div>
                        <div><p className="text-xl font-bold text-gray-900">{timetables.filter(t => t.status === 'draft').length}</p><p className="text-sm text-gray-500">Drafts</p></div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-lg p-5 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-red-100"><XCircle size={22} className="text-red-600" /></div>
                        <div><p className="text-xl font-bold text-gray-900">{timetables.filter(t => t.status === 'rejected').length}</p><p className="text-sm text-gray-500">Rejected</p></div>
                    </motion.div>
                </div>

                {/* Timetables List */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {loading ? (
                        <div className="text-center py-16">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4D869C] border-t-transparent mx-auto"></div>
                            <p className="mt-4 text-gray-500">Loading timetables...</p>
                        </div>
                    ) : filteredTimetables.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <CalendarDays size={48} className="mx-auto mb-4 text-gray-300" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No timetables found</h3>
                            <p>No timetables match your search criteria.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredTimetables.map((tt, i) => (
                                <motion.div
                                    key={tt.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="p-5 hover:bg-gray-50 transition-all cursor-pointer flex items-center gap-4"
                                    onClick={() => router.push(`/faculty/timetables/${tt.id}`)}
                                >
                                    {/* Icon */}
                                    <div className="p-3 rounded-xl bg-blue-50 shrink-0">
                                        <CalendarDays size={24} className="text-blue-600" />
                                    </div>

                                    {/* Main Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-bold text-gray-900 truncate">{tt.title}</h3>
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(tt.status)}`}>
                                                {getStatusIcon(tt.status)}
                                                {tt.status?.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 truncate">
                                            Batch: {tt.batch?.name || tt.batch_name || 'N/A'} • Semester: {tt.semester || 'N/A'} • Year: {tt.academic_year || 'N/A'}
                                        </p>
                                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                                            {tt.fitness_score && (
                                                <span className="text-green-600 font-medium">Fitness: {tt.fitness_score}%</span>
                                            )}
                                            <span>Created: {formatDate(tt.created_at)}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* View Button - Always visible */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); router.push(`/faculty/timetables/${tt.id}`); }}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                                        >
                                            <Eye size={14} />
                                        </button>

                                        {/* Submit Button - Only for Creator, only for Draft */}
                                        {isCreator && tt.status === 'draft' && (
                                            <button
                                                onClick={(e) => submitForReview(tt.id, e)}
                                                disabled={actionLoading === tt.id}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-[#4D869C] text-white rounded-lg text-sm font-medium hover:shadow-md disabled:opacity-50"
                                            >
                                                <Send size={14} /> Submit
                                            </button>
                                        )}

                                        {/* Notify Students - Only for Publisher, only for Published */}
                                        {isPublisher && tt.status === 'published' && (
                                            <button
                                                onClick={(e) => notifyStudents(tt.id, e)}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-[#4D869C] text-white rounded-lg text-sm font-medium hover:shadow-md"
                                            >
                                                <Bell size={14} /> Notify Students
                                            </button>
                                        )}

                                        {/* Unpublish Button - Only for Publisher, only for Published */}
                                        {isPublisher && tt.status === 'published' && (
                                            <button
                                                onClick={(e) => unpublishTimetable(tt.id, e)}
                                                disabled={actionLoading === tt.id}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:shadow-md disabled:opacity-50"
                                            >
                                                <XCircle size={14} /> Unpublish
                                            </button>
                                        )}

                                        {/* Delete Button - For Creator/Publisher, only for Draft */}
                                        {(isCreator || isPublisher) && tt.status === 'draft' && (
                                            <button
                                                onClick={(e) => deleteTimetable(tt.id, e)}
                                                disabled={actionLoading === tt.id}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:shadow-md disabled:opacity-50"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </FacultyCreatorLayout>
    );
};

export default TimetablesPage;
