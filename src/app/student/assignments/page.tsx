'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CardLoader } from '@/components/ui/PageLoader';
import {
    FileText,
    Calendar,
    Clock,
    CheckCircle,
    AlertCircle,
    Download,
    Upload,
    Eye,
    ChevronDown,
    Filter,
    Search,
    BookOpen,
    AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import StudentLayout from '@/components/student/StudentLayout';

interface Assignment {
    id: string;
    title: string;
    description: string;
    subject_name: string;
    subject_code: string;
    faculty_name: string;
    due_date: string;
    created_at: string;
    max_marks: number;
    submission_type: 'file' | 'text' | 'both';
    status: 'pending' | 'submitted' | 'graded' | 'overdue';
    submission?: {
        id: string;
        submitted_at: string;
        marks?: number;
        feedback?: string;
    };
}

export default function StudentAssignments() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded' | 'overdue'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [showSubmitModal, setShowSubmitModal] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return;
        }
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role !== 'student') {
            router.push('/login');
            return;
        }
        setUser(parsedUser);
        fetchAssignments(parsedUser);
    }, [router]);

    const fetchAssignments = async (user: any) => {
        try {
            setLoading(true);
            const token = btoa(JSON.stringify({
                id: user.id, user_id: user.id, role: user.role,
                college_id: user.college_id, department_id: user.department_id
            }));
            const authHeaders = { 'Authorization': `Bearer ${token}` };

            // First, get batch info from dashboard
            const dashRes = await fetch(`/api/student/dashboard?userId=${user.id}&role=student`, { headers: authHeaders });
            if (!dashRes.ok) {
                throw new Error('Failed to get batch info');
            }
            const dashData = await dashRes.json();
            const batchId = dashData.additionalData?.batchId;

            if (!batchId) {
                console.log('No batch assigned to student');
                setAssignments([]);
                setLoading(false);
                return;
            }

            // Fetch assignments for student's batch
            const response = await fetch(`/api/student/assignments?batchId=${batchId}`, {
                headers: authHeaders
            });

            if (response.ok) {
                const data = await response.json();
                // Map to expected format
                const mappedAssignments = (data.assignments || []).map((a: any) => ({
                    id: a.id,
                    title: a.title,
                    description: a.description,
                    subject_name: a.subjects?.name || 'N/A',
                    subject_code: a.subjects?.code || '',
                    faculty_name: a.faculty_name || '',
                    due_date: a.end_time || a.due_date,
                    created_at: a.created_at,
                    max_marks: a.total_marks || 100,
                    submission_type: 'file',
                    status: a.has_submitted ? (a.submission?.score ? 'graded' : 'submitted') :
                        (new Date(a.end_time || a.due_date) < new Date() ? 'overdue' : 'pending'),
                    submission: a.submission ? {
                        id: a.submission.id,
                        submitted_at: a.submission.submitted_at,
                        marks: a.submission.score,
                        feedback: ''
                    } : undefined
                }));
                setAssignments(mappedAssignments);
            } else {
                setAssignments([]);
            }
        } catch (error) {
            console.error('Error:', error);
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted':
                return { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle };
            case 'graded':
                return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle };
            case 'overdue':
                return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle };
            default:
                return { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock };
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDaysRemaining = (dueDate: string) => {
        if (!dueDate) return null;
        const now = new Date();
        const due = new Date(dueDate);
        const diff = due.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    const filteredAssignments = assignments.filter(assignment => {
        const matchesFilter = filter === 'all' || assignment.status === filter;
        const matchesSearch =
            assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            assignment.subject_name?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const stats = {
        total: assignments.length,
        pending: assignments.filter(a => a.status === 'pending').length,
        submitted: assignments.filter(a => a.status === 'submitted').length,
        graded: assignments.filter(a => a.status === 'graded').length,
        overdue: assignments.filter(a => a.status === 'overdue').length
    };

    if (loading) {
        return (
            <StudentLayout activeTab="assignments">
                <CardLoader message="Loading Assignments" subMessage="Fetching your tasks and submissions..." />
            </StudentLayout>
        );
    }

    return (
        <StudentLayout activeTab="assignments">
            <div className="space-y-6 pb-20 lg:pb-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Assignments</h1>
                    <p className="text-gray-500 mt-1">View and submit your assignments</p>
                </motion.div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
                    {[
                        { label: 'Total', value: stats.total, color: 'from-[#4D869C] to-[#7AB2B2]' },
                        { label: 'Pending', value: stats.pending, color: 'from-amber-500 to-amber-600' },
                        { label: 'Submitted', value: stats.submitted, color: 'from-blue-500 to-blue-600' },
                        { label: 'Graded', value: stats.graded, color: 'from-green-500 to-green-600' },
                        { label: 'Overdue', value: stats.overdue, color: 'from-red-500 to-red-600' },
                    ].map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-sm"
                        >
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                                <FileText size={20} className="text-white" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                            <p className="text-sm text-gray-500">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search assignments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4D869C] focus:border-transparent"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
                        {['all', 'pending', 'submitted', 'graded', 'overdue'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${filter === f
                                    ? 'bg-[#4D869C] text-white'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-[#4D869C]'
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Assignments List */}
                {filteredAssignments.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No Assignments Found</h3>
                        <p className="text-gray-500">
                            {filter === 'all'
                                ? "You don't have any assignments yet."
                                : `No ${filter} assignments found.`}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredAssignments.map((assignment, index) => {
                            const statusStyle = getStatusColor(assignment.status);
                            const StatusIcon = statusStyle.icon;
                            const daysRemaining = getDaysRemaining(assignment.due_date);

                            return (
                                <motion.div
                                    key={assignment.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white rounded-xl lg:rounded-2xl p-5 lg:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-start gap-3">
                                                <div className="w-12 h-12 bg-gradient-to-br from-[#4D869C] to-[#7AB2B2] rounded-xl flex items-center justify-center flex-shrink-0">
                                                    <FileText size={24} className="text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h3 className="font-bold text-gray-900 text-lg">{assignment.title}</h3>
                                                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${statusStyle.bg} ${statusStyle.text} flex items-center gap-1 flex-shrink-0`}>
                                                            <StatusIcon size={12} />
                                                            {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {assignment.subject_name} ({assignment.subject_code})
                                                    </p>
                                                </div>
                                            </div>

                                            {assignment.description && (
                                                <p className="text-gray-600 mt-3 line-clamp-2">{assignment.description}</p>
                                            )}

                                            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    Due: {formatDate(assignment.due_date)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <BookOpen size={14} />
                                                    {assignment.max_marks} marks
                                                </span>
                                                {assignment.faculty_name && (
                                                    <span className="text-gray-400">
                                                        By {assignment.faculty_name}
                                                    </span>
                                                )}
                                            </div>

                                            {daysRemaining !== null && assignment.status === 'pending' && (
                                                <div className={`mt-3 text-sm font-medium ${daysRemaining <= 0 ? 'text-red-600' : daysRemaining <= 2 ? 'text-amber-600' : 'text-green-600'}`}>
                                                    {daysRemaining <= 0
                                                        ? '⚠️ Past due!'
                                                        : daysRemaining === 1
                                                            ? '⏰ Due tomorrow'
                                                            : `📅 ${daysRemaining} days remaining`}
                                                </div>
                                            )}

                                            {assignment.submission && (
                                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                    <p className="text-sm text-gray-600">
                                                        <CheckCircle size={14} className="inline mr-1 text-green-500" />
                                                        Submitted: {formatDate(assignment.submission.submitted_at)}
                                                    </p>
                                                    {assignment.submission.marks !== undefined && (
                                                        <p className="text-sm font-bold text-gray-900 mt-1">
                                                            Marks: {assignment.submission.marks}/{assignment.max_marks}
                                                        </p>
                                                    )}
                                                    {assignment.submission.feedback && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            Feedback: {assignment.submission.feedback}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex lg:flex-col gap-2">
                                            {assignment.status === 'pending' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedAssignment(assignment);
                                                        setShowSubmitModal(true);
                                                    }}
                                                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4D869C] text-white rounded-xl font-medium text-sm hover:bg-[#3d6b7c] transition-colors"
                                                >
                                                    <Upload size={16} />
                                                    Submit
                                                </button>
                                            )}
                                            <button
                                                onClick={() => router.push(`/student/assignments/${assignment.id}`)}
                                                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
                                            >
                                                <Eye size={16} />
                                                View
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Submit Modal Placeholder */}
                {showSubmitModal && selectedAssignment && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900">Submit Assignment</h3>
                                <p className="text-gray-500 mt-1">{selectedAssignment.title}</p>
                            </div>
                            <div className="p-6">
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                                    <Upload size={40} className="mx-auto text-gray-400 mb-3" />
                                    <p className="text-gray-600 font-medium">Drop your file here or click to browse</p>
                                    <p className="text-gray-400 text-sm mt-1">PDF, DOC, DOCX up to 10MB</p>
                                    <input type="file" className="hidden" />
                                    <button className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                                        Browse Files
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                                <button
                                    onClick={() => {
                                        setShowSubmitModal(false);
                                        setSelectedAssignment(null);
                                    }}
                                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        toast.success('Assignment submitted successfully!');
                                        setShowSubmitModal(false);
                                        setSelectedAssignment(null);
                                    }}
                                    className="px-4 py-2.5 bg-[#4D869C] text-white rounded-xl font-medium hover:bg-[#3d6b7c] transition-colors"
                                >
                                    Submit
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </StudentLayout>
    );
}
