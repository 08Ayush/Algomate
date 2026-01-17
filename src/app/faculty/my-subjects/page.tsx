'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { BookOpen, Search, RefreshCw, Clock, Users, GraduationCap, MapPin, Award, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';

interface Subject {
    id: string;
    name: string;
    code: string;
    subject_type: string;
    // Optional schedule info if we ever merge it back
    schedules?: any[];
}

const MySubjectsPage: React.FC = () => {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return;
        }
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role !== 'faculty') {
            router.push('/login');
            return;
        }
        setUser(parsedUser);
        fetchSubjects(parsedUser);
    }, [router]);

    const fetchSubjects = async (userData: any) => {
        try {
            setLoading(true);
            const token = btoa(JSON.stringify({
                id: userData.id,
                user_id: userData.id,
                role: userData.role,
                college_id: userData.college_id,
                department_id: userData.department_id
            }));

            // This API now returns subjects based on faculty qualifications
            const response = await fetch('/api/faculty/assigned-subjects-batches', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                setSubjects(data.subjects || []);
            } else {
                toast.error('Failed to load subjects');
            }
        } catch (error) {
            console.error('Error fetching subjects:', error);
            toast.error('Error loading subjects');
        } finally {
            setLoading(false);
        }
    };

    const filteredSubjects = subjects.filter((s) =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const labSubjectsCount = subjects.filter(s => s.subject_type === 'LAB' || s.subject_type === 'PRACTICAL').length;

    return (
        <FacultyCreatorLayout activeTab="my-subjects">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Subjects</h1>
                        <p className="text-gray-600">View subjects you are qualified to teach</p>
                    </div>
                    <button
                        onClick={() => user && fetchSubjects(user)}
                        className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Search */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="relative">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search subjects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-100"><BookOpen size={24} className="text-blue-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{subjects.length}</p>
                            <p className="text-sm text-gray-500">Qualified Subjects</p>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-100"><Award size={24} className="text-purple-600" /></div>
                        <div>
                            {/* Placeholder for 'Primary' count if we had it, or just generic */}
                            <p className="text-2xl font-bold text-gray-900">{subjects.filter(s => s.subject_type === 'THEORY').length}</p>
                            <p className="text-sm text-gray-500">Theory Subjects</p>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-orange-100"><MapPin size={24} className="text-orange-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{labSubjectsCount}</p>
                            <p className="text-sm text-gray-500">Lab/Practical Subjects</p>
                        </div>
                    </motion.div>
                </div>

                {/* Subjects Grid */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {loading ? (
                        <div className="text-center py-16">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4D869C] border-t-transparent mx-auto"></div>
                            <p className="mt-4 text-gray-500">Loading subjects...</p>
                        </div>
                    ) : filteredSubjects.length === 0 ? (
                        <div className="text-center py-16">
                            <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No subjects found</h3>
                            <p className="text-gray-500">You don't have any subjects assigned based on qualifications yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                            {filteredSubjects.map((subject, i) => (
                                <motion.div
                                    key={subject.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-all border border-gray-100"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-xl ${subject.subject_type === 'LAB' || subject.subject_type === 'PRACTICAL'
                                                    ? 'bg-purple-100 text-purple-600'
                                                    : 'bg-blue-100 text-blue-600'
                                                }`}>
                                                <BookOpen size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg">{subject.name}</h3>
                                                <p className="text-sm text-gray-500 font-mono">{subject.code}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${subject.subject_type === 'LAB' || subject.subject_type === 'PRACTICAL'
                                                ? 'bg-purple-50 text-purple-700 border-purple-100'
                                                : 'bg-blue-50 text-blue-700 border-blue-100'
                                            }`}>
                                            {subject.subject_type || 'THEORY'}
                                        </span>
                                        <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100 flex items-center gap-1">
                                            <CheckCircle size={10} /> Qualified
                                        </span>
                                    </div>

                                    {/* Footer / Actions could go here */}
                                    {/* <button className="w-full mt-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                                        View Details
                                    </button> */}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </FacultyCreatorLayout>
    );
};

export default MySubjectsPage;
