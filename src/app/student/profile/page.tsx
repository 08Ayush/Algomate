'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    User,
    Mail,
    Phone,
    Building2,
    GraduationCap,
    Calendar,
    BookOpen,
    Hash,
    Edit3,
    Save,
    X,
    Camera,
    Shield,
    Trophy
} from 'lucide-react';
import toast from 'react-hot-toast';
import StudentLayout from '@/components/student/StudentLayout';

interface ProfileData {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    college_uid: string;
    student_id?: string;
    current_semester: number;
    admission_year: number;
    cgpa?: number;
    course?: {
        title: string;
        code: string;
    };
    college?: {
        name: string;
        has_departments?: boolean;
    };
    department?: {
        id: string;
        name: string;
        code: string;
    };
    batch?: {
        id: string;
        name: string;
        semester: number;
        section: string;
        academic_year: string;
    };
}

export default function StudentProfile() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        cgpa: ''
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return;
        }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetchProfile(parsedUser);
    }, [router]);

    const fetchProfile = async (user: any) => {
        try {
            setLoading(true);
            const token = btoa(JSON.stringify({
                id: user.id, user_id: user.id, role: user.role,
                college_id: user.college_id, department_id: user.department_id
            }));
            const response = await fetch(`/api/student/profile?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setProfile(data.profile);
                setFormData({
                    first_name: data.profile.first_name || '',
                    last_name: data.profile.last_name || '',
                    phone: data.profile.phone || '',
                    cgpa: data.profile.cgpa ? data.profile.cgpa.toString() : ''
                });
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const token = btoa(JSON.stringify({
                id: user.id, user_id: user.id, role: user.role,
                college_id: user.college_id, department_id: user.department_id
            }));
            const response = await fetch('/api/student/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    userId: user.id,
                    ...formData
                })
            });

            if (response.ok) {
                const data = await response.json();
                setProfile(data.profile);

                // Update localStorage
                const updatedUser = { ...user, ...formData };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);

                setEditing(false);
                toast.success('Profile updated successfully');
            } else {
                toast.error('Failed to update profile');
            }
        } catch (error) {
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <StudentLayout activeTab="profile">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4D869C] border-t-transparent"></div>
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout activeTab="profile">
            <div className="space-y-6 pb-20 lg:pb-8 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">My Profile</h1>
                        <p className="text-gray-500 mt-1">Manage your account information</p>
                    </div>
                    {!editing ? (
                        <button
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#4D869C] text-white rounded-xl font-medium hover:bg-[#3d6b7c] transition-colors"
                        >
                            <Edit3 size={18} />
                            <span className="hidden lg:inline">Edit Profile</span>
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditing(false)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                            >
                                <X size={18} />
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#4D869C] text-white rounded-xl font-medium hover:bg-[#3d6b7c] transition-colors disabled:opacity-50"
                            >
                                <Save size={18} />
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>

                    <div className="relative flex flex-col lg:flex-row items-center lg:items-start gap-6">
                        <div className="relative">
                            <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl bg-white/20 flex items-center justify-center text-4xl lg:text-5xl font-bold">
                                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                            </div>
                            <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                                <Camera size={18} className="text-[#4D869C]" />
                            </button>
                        </div>

                        <div className="text-center lg:text-left">
                            <h2 className="text-2xl lg:text-3xl font-bold">
                                {profile?.first_name} {profile?.last_name}
                            </h2>
                            <p className="text-white/80 mt-1">{profile?.email}</p>
                            <div className="flex flex-wrap justify-center lg:justify-start gap-2 mt-4">
                                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                                    {profile?.college_uid}
                                </span>
                                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                                    Semester {profile?.current_semester}
                                </span>
                                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                                    {profile?.course?.code || 'Student'}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Personal Information */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <User size={20} className="text-[#4D869C]" />
                            Personal Information
                        </h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-500 block mb-1">First Name</label>
                                    {editing ? (
                                        <input
                                            type="text"
                                            value={formData.first_name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4D869C]"
                                        />
                                    ) : (
                                        <p className="font-medium text-gray-900">{profile?.first_name}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500 block mb-1">Last Name</label>
                                    {editing ? (
                                        <input
                                            type="text"
                                            value={formData.last_name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4D869C]"
                                        />
                                    ) : (
                                        <p className="font-medium text-gray-900">{profile?.last_name}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Email Address</label>
                                <div className="flex items-center gap-2">
                                    <Mail size={16} className="text-gray-400" />
                                    <p className="font-medium text-gray-900">{profile?.email}</p>
                                    <Shield size={14} className="text-green-500" />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Phone Number</label>
                                {editing ? (
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4D869C]"
                                        placeholder="Enter phone number"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Phone size={16} className="text-gray-400" />
                                        <p className="font-medium text-gray-900">{profile?.phone || 'Not added'}</p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-sm text-gray-500 block mb-1">CGPA</label>
                                {editing ? (
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="10"
                                        value={formData.cgpa}
                                        onChange={(e) => setFormData(prev => ({ ...prev, cgpa: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4D869C]"
                                        placeholder="e.g. 8.5"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Trophy size={16} className="text-gray-400" />
                                        <p className="font-medium text-gray-900">{profile?.cgpa || 'Not added'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Academic Information */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <GraduationCap size={20} className="text-[#4D869C]" />
                            Academic Information
                        </h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-500 block mb-1">College UID</label>
                                    <div className="flex items-center gap-2">
                                        <Hash size={16} className="text-gray-400" />
                                        <p className="font-medium text-gray-900">{profile?.college_uid}</p>
                                    </div>
                                </div>
                                {profile?.batch && (
                                    <div>
                                        <label className="text-sm text-gray-500 block mb-1">Batch</label>
                                        <div className="flex items-center gap-2">
                                            <GraduationCap size={16} className="text-gray-400" />
                                            <p className="font-medium text-gray-900">
                                                {profile.batch.name}
                                                {profile.batch.section && ` - Section ${profile.batch.section}`}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Course</label>
                                <div className="flex items-center gap-2">
                                    <BookOpen size={16} className="text-gray-400" />
                                    <p className="font-medium text-gray-900">
                                        {profile?.course?.title || 'N/A'}
                                        {profile?.course?.code && ` (${profile.course.code})`}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-500 block mb-1">Current Semester</label>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-gray-400" />
                                        <p className="font-medium text-gray-900">Semester {profile?.current_semester}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500 block mb-1">Admission Year</label>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-gray-400" />
                                        <p className="font-medium text-gray-900">{profile?.admission_year || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-500 block mb-1">College</label>
                                <div className="flex items-center gap-2">
                                    <Building2 size={16} className="text-gray-400" />
                                    <p className="font-medium text-gray-900">{profile?.college?.name || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Show Department if college has departments */}
                            {profile?.department && (
                                <div>
                                    <label className="text-sm text-gray-500 block mb-1">Department</label>
                                    <div className="flex items-center gap-2">
                                        <Building2 size={16} className="text-gray-400" />
                                        <p className="font-medium text-gray-900">
                                            {profile.department.name}
                                            {profile.department.code && ` (${profile.department.code})`}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Academic Year */}
                            {profile?.batch?.academic_year && (
                                <div>
                                    <label className="text-sm text-gray-500 block mb-1">Academic Year</label>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-gray-400" />
                                        <p className="font-medium text-gray-900">{profile.batch.academic_year}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Quick Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-r from-[#CDE8E5] to-[#EEF7FF] rounded-2xl p-6 border border-[#7AB2B2]/30"
                >
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Semester', value: profile?.current_semester || '?', color: 'text-[#4D869C]' },
                            { label: 'Course', value: profile?.course?.code || 'N/A', color: 'text-purple-600' },
                            { label: 'Year', value: profile?.admission_year || 'N/A', color: 'text-pink-600' },
                            { label: 'CGPA', value: profile?.cgpa ? parseFloat(String(profile.cgpa)).toFixed(2) : '-', color: 'text-green-600' },
                        ].map((stat, index) => (
                            <div key={stat.label} className="text-center">
                                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                <p className="text-sm text-gray-500">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </motion.div >
            </div >
        </StudentLayout >
    );
}
