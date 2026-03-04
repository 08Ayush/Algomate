'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CardLoader } from '@/components/ui/PageLoader';
import { FileText, Plus, Search, RefreshCw, Eye, Edit, Trash2, Clock, Users, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface Assignment {
    id: string;
    title: string;
    type: string;
    description?: string;
    total_marks: number;
    due_date?: string;
    is_draft: boolean;
    is_published: boolean;
    created_at: string;
    batch_name?: string;
    subject_name?: string;
    batches?: { name: string };
    subjects?: { name: string };
}

const AssignmentsPage: React.FC = () => {
    const router = useRouter();
    const { showConfirm } = useConfirm();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => { fetchAssignments(); }, []);

    const getAuthHeaders = () => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return null; }
        const user = JSON.parse(userData);
        return {
            'Authorization': `Bearer ${Buffer.from(JSON.stringify({ user_id: user.id, id: user.id, role: user.role, college_id: user.college_id })).toString('base64')}`,
            'Content-Type': 'application/json'
        };
    };

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const headers = getAuthHeaders();
            if (!headers) return;
            const res = await fetch('/api/assignments', { headers });
            if (res.ok) {
                const data = await res.json();
                const userData = localStorage.getItem('user');
                const user = userData ? JSON.parse(userData) : null;
                // Show all assignments for now to debug visibility
                const myAssignments = (data.assignments || data.data || []);
                setAssignments(myAssignments);
            }
        } catch { toast.error('Error loading assignments'); } finally { setLoading(false); }
    };

    const handleDelete = (assignment: Assignment) => {
        showConfirm({
            title: 'Delete Assignment',
            message: `Are you sure you want to delete the assignment "${assignment.title}"? This action cannot be undone.`,
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    const headers = getAuthHeaders();
                    if (!headers) return;
                    const res = await fetch(`/api/assignments/${assignment.id}`, { method: 'DELETE', headers });
                    if (res.ok) {
                        toast.success('Assignment deleted');
                        setAssignments(prev => prev.filter(a => a.id !== assignment.id));
                    }
                } catch { toast.error('Error deleting'); }
            }
        });
    };

    const filteredAssignments = assignments.filter(a => {
        const matchesSearch = a.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'published' && a.is_published) ||
            (statusFilter === 'draft' && a.is_draft) ||
            (statusFilter === 'unpublished' && !a.is_draft && !a.is_published);
        return matchesSearch && matchesStatus;
    });

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            'homework': 'bg-blue-100 text-blue-700',
            'quiz': 'bg-purple-100 text-purple-700',
            'project': 'bg-green-100 text-green-700',
            'exam': 'bg-red-100 text-red-700',
            'lab': 'bg-orange-100 text-orange-700',
        };
        return colors[type?.toLowerCase()] || 'bg-gray-100 text-gray-700';
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <FacultyCreatorLayout activeTab="assignments">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Assignments</h1>
                        <p className="text-gray-600">Create and manage student assignments</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fetchAssignments} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => router.push('/faculty/assignments/create')} className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg">
                            <Plus size={18} /> New Assignment
                        </button>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex gap-4 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search assignments..."
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
                            <option value="draft">Draft</option>
                            <option value="unpublished">Unpublished</option>
                        </select>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-100"><FileText size={24} className="text-blue-600" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{assignments.length}</p><p className="text-sm text-gray-500">Total Assignments</p></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-100"><CheckCircle size={24} className="text-green-600" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{assignments.filter(a => a.is_published).length}</p><p className="text-sm text-gray-500">Published</p></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-yellow-100"><Clock size={24} className="text-yellow-600" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{assignments.filter(a => a.is_draft).length}</p><p className="text-sm text-gray-500">Drafts</p></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-100"><Users size={24} className="text-purple-600" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{assignments.reduce((sum, a) => sum + (a.total_marks || 0), 0)}</p><p className="text-sm text-gray-500">Total Marks</p></div>
                    </div>
                </div>

                {/* Assignments Table */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {loading ? (
                        <CardLoader message="Loading assignments..." subMessage="Fetching your created assignments" />
                    ) : filteredAssignments.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <FileText size={40} className="mx-auto mb-3 text-gray-300" />
                            <p>No assignments found</p>
                            <button
                                onClick={() => router.push('/faculty/assignments/create')}
                                className="mt-3 text-sm text-[#4D869C] font-medium hover:underline"
                            >
                                Create your first assignment →
                            </button>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Assignment</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Batch</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Marks</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Due Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredAssignments.map((assignment, i) => (
                                    <motion.tr key={assignment.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-blue-50">
                                                    <FileText size={18} className="text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{assignment.title}</p>
                                                    <p className="text-sm text-gray-500">{assignment.subject_name || assignment.subjects?.name || ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTypeColor(assignment.type)}`}>
                                                {assignment.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{assignment.batch_name || assignment.batches?.name || '-'}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{assignment.total_marks}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(assignment.due_date || '')}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${assignment.is_published ? 'bg-green-100 text-green-700' : assignment.is_draft ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {assignment.is_published ? 'Published' : assignment.is_draft ? 'Draft' : 'Unpublished'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => router.push(`/faculty/assignments/${assignment.id}/report`)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><Eye size={16} /></button>
                                                <button onClick={() => router.push(`/faculty/assignments/${assignment.id}/edit`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                                                <button onClick={() => handleDelete(assignment)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </FacultyCreatorLayout>
    );
};

export default AssignmentsPage;
