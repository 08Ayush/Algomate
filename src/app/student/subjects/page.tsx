'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    BookOpen,
    Clock,
    Users,
    GraduationCap,
    Beaker,
    BookText,
    Search,
    Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import StudentLayout from '@/components/student/StudentLayout';

interface Subject {
    id: string;
    name: string;
    code: string;
    credits_per_week: number;
    credit_value?: number;
    subject_type: string;
    nep_category?: string;
    semester: number;
    description?: string;
    is_allotted?: boolean;
    allotment_bucket?: string;
}

export default function StudentSubjects() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return;
        }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetchSubjects(parsedUser);
    }, [router]);

    const fetchSubjects = async (user: any) => {
        try {
            setLoading(true);

            // First get batch info
            const dashRes = await fetch(`/api/student/dashboard?userId=${user.id}&role=student`);
            if (!dashRes.ok) throw new Error('Failed to fetch dashboard');
            const dashData = await dashRes.json();

            const semester = dashData.additionalData?.batch?.semester || user.current_semester;
            const departmentId = dashData.additionalData?.batch?.department_id || user.department_id;
            const courseId = dashData.additionalData?.batch?.course_id || user.course_id;
            const batchId = dashData.additionalData?.batchId;

            // Fetch subjects specifically for this semester, department, and course
            const subjectsRes = await fetch(
                `/api/student/available-subjects?studentId=${user.id}&semester=${semester}&departmentId=${departmentId || ''}&courseId=${courseId || ''}`
            );

            let allSubjects: any[] = [];

            if (subjectsRes.ok) {
                const subjectsData = await subjectsRes.json();
                // Filter to only show subjects for the exact semester
                // Also exclude MINOR/MAJOR subjects - they should only show when allotted
                const filteredSubjects = (subjectsData.subjects || []).filter(
                    (s: any) => {
                        const matchesSemester = s.semester === semester || s.semester === parseInt(semester);
                        // Hide MINOR and MAJOR subjects - they will be added separately if allotted
                        const isElectiveCategory = ['MINOR', 'MAJOR', 'OE', 'SEC', 'VAC', 'AEC'].includes(s.nep_category);
                        return matchesSemester && !isElectiveCategory;
                    }
                );
                allSubjects = filteredSubjects;
            }

            // Also fetch allotted subjects from elective buckets - these WILL be shown
            if (batchId) {
                const bucketsRes = await fetch(
                    `/api/student/elective-buckets?studentId=${user.id}&batchId=${batchId}`
                );

                if (bucketsRes.ok) {
                    const bucketsData = await bucketsRes.json();
                    // Get subjects that have been allotted to this student
                    (bucketsData.buckets || []).forEach((bucket: any) => {
                        const allottedChoices = (bucket.student_choices || []).filter(
                            (c: any) => c.is_allotted === true || c.allotment_status === 'allotted'
                        );

                        allottedChoices.forEach((choice: any) => {
                            const subject = bucket.subjects.find((s: any) => s.id === choice.subject_id);
                            if (subject) {
                                // Check if already in the list
                                const exists = allSubjects.find((s: any) => s.id === subject.id);
                                if (!exists) {
                                    allSubjects.push({
                                        ...subject,
                                        is_allotted: true,
                                        allotment_bucket: bucket.bucket_name,
                                        selection_type: subject.nep_category || 'ELECTIVE',
                                        is_selectable: true,
                                        is_priority: true,
                                        reason: `Allotted from ${bucket.bucket_name}`
                                    });
                                } else {
                                    // Mark existing subject as allotted
                                    exists.is_allotted = true;
                                    exists.allotment_bucket = bucket.bucket_name;
                                }
                            }
                        });
                    });
                }
            }

            setSubjects(allSubjects);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load subjects');
        } finally {
            setLoading(false);
        }
    };

    const getSubjectIcon = (type: string) => {
        switch (type) {
            case 'LAB':
            case 'PRACTICAL':
                return Beaker;
            case 'TUTORIAL':
                return Users;
            default:
                return BookText;
        }
    };

    const getSubjectColor = (type: string) => {
        switch (type) {
            case 'LAB':
            case 'PRACTICAL':
                return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' };
            case 'TUTORIAL':
                return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
            default:
                return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'MAJOR':
                return 'bg-purple-100 text-purple-700';
            case 'MINOR':
                return 'bg-pink-100 text-pink-700';
            case 'CORE':
                return 'bg-blue-100 text-blue-700';
            case 'AEC':
            case 'VAC':
                return 'bg-green-100 text-green-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const filteredSubjects = subjects.filter(subject => {
        const matchesSearch = subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            subject.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterType === 'all' || subject.subject_type === filterType;
        return matchesSearch && matchesFilter;
    });

    const stats = {
        total: subjects.length,
        theory: subjects.filter(s => s.subject_type === 'THEORY').length,
        lab: subjects.filter(s => s.subject_type === 'LAB' || s.subject_type === 'PRACTICAL').length,
        totalCredits: subjects.reduce((sum, s) => sum + (s.credit_value || s.credits_per_week || 0), 0)
    };

    if (loading) {
        return (
            <StudentLayout activeTab="subjects">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4D869C] border-t-transparent"></div>
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout activeTab="subjects">
            <div className="space-y-6 pb-20 lg:pb-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">My Subjects</h1>
                    <p className="text-gray-500 mt-1">Semester {user?.current_semester || '?'} curriculum</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    {[
                        { label: 'Total Subjects', value: stats.total, icon: BookOpen, color: 'from-[#4D869C] to-[#7AB2B2]' },
                        { label: 'Theory', value: stats.theory, icon: BookText, color: 'from-purple-500 to-pink-500' },
                        { label: 'Lab/Practical', value: stats.lab, icon: Beaker, color: 'from-orange-500 to-red-500' },
                        { label: 'Total Credits', value: stats.totalCredits, icon: GraduationCap, color: 'from-green-500 to-emerald-500' },
                    ].map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-sm"
                        >
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                                <stat.icon size={20} className="text-white" />
                            </div>
                            <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</p>
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
                            placeholder="Search subjects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4D869C] focus:border-transparent"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['all', 'THEORY', 'LAB', 'PRACTICAL', 'TUTORIAL'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${filterType === type
                                    ? 'bg-[#4D869C] text-white'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-[#4D869C]'
                                    }`}
                            >
                                {type === 'all' ? 'All' : type.charAt(0) + type.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Subjects Grid */}
                {filteredSubjects.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                        <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 font-medium">No subjects found</p>
                        <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filteredSubjects.map((subject, index) => {
                            const Icon = getSubjectIcon(subject.subject_type);
                            const color = getSubjectColor(subject.subject_type);

                            return (
                                <motion.div
                                    key={subject.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`bg-white rounded-xl lg:rounded-2xl p-5 border ${color.border} hover:shadow-md transition-shadow`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
                                            <Icon size={24} className={color.text} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className="font-bold text-gray-900">{subject.name}</h3>
                                                    <p className="text-sm text-gray-500">{subject.code}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${color.bg} ${color.text}`}>
                                                    {subject.subject_type}
                                                </span>
                                            </div>

                                            {subject.description && (
                                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{subject.description}</p>
                                            )}

                                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                                                <span className="flex items-center gap-1 text-sm text-gray-500">
                                                    <Clock size={14} />
                                                    {subject.credits_per_week || subject.credit_value || 0} hrs/week
                                                </span>
                                                {subject.credit_value && (
                                                    <span className="flex items-center gap-1 text-sm text-gray-500">
                                                        <GraduationCap size={14} />
                                                        {subject.credit_value} credits
                                                    </span>
                                                )}
                                                {subject.nep_category && (
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(subject.nep_category)}`}>
                                                        {subject.nep_category}
                                                    </span>
                                                )}
                                                {subject.is_allotted && (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                                                        ✓ Allotted
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </StudentLayout>
    );
}
