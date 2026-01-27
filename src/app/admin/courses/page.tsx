'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { GraduationCap, Plus, Edit, Trash2, X, Search, RefreshCw, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import CollegeAdminLayout from '@/components/admin/CollegeAdminLayout';

interface Course {
    id: string;
    title: string;
    code: string;
    nature_of_course?: string;
    intake: number;
    duration_years?: number;
    created_at: string;
}

const CoursesPage: React.FC = () => {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        title: '',
        code: '',
        nature_of_course: '',
        intake: 60,
        duration_years: 4
    });

    useEffect(() => { fetchCourses(); }, []);

    const getAuthHeaders = () => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return null; }
        return { 'Authorization': `Bearer ${Buffer.from(userData).toString('base64')}`, 'Content-Type': 'application/json' };
    };

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const userData = localStorage.getItem('user');
            if (!userData) return;
            const user = JSON.parse(userData);
            const headers = getAuthHeaders();
            if (!headers) return;
            const q = user.college_id ? `?college_id=${user.college_id}` : '';
            const res = await fetch(`/api/admin/courses${q}`, { headers });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setCourses(data);
                } else {
                    setCourses(data.courses || []);
                }
            }
        } catch { toast.error('Error loading courses'); } finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.code) { toast.error('Title and code required'); return; }
        setSubmitting(true);
        try {
            const headers = getAuthHeaders();
            if (!headers) return;
            const url = editingCourse ? `/api/admin/courses/${editingCourse.id}` : '/api/admin/courses';
            const res = await fetch(url, { method: editingCourse ? 'PUT' : 'POST', headers, body: JSON.stringify(form) });
            if (res.ok) { toast.success(editingCourse ? 'Updated' : 'Created'); setShowForm(false); setEditingCourse(null); resetForm(); fetchCourses(); }
            else { const err = await res.json(); toast.error(err.error || 'Failed'); }
        } catch { toast.error('Error'); } finally { setSubmitting(false); }
    };

    const resetForm = () => setForm({ title: '', code: '', nature_of_course: '', intake: 60, duration_years: 4 });

    const handleEdit = (course: Course) => {
        setEditingCourse(course);
        setForm({ title: course.title, code: course.code, nature_of_course: course.nature_of_course || '', intake: course.intake, duration_years: course.duration_years || 4 });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete course?')) return;
        try {
            const headers = getAuthHeaders();
            if (!headers) return;
            const res = await fetch(`/api/admin/courses/${id}`, { method: 'DELETE', headers });
            if (res.ok) { toast.success('Deleted'); setCourses(prev => prev.filter(c => c.id !== id)); }
        } catch { toast.error('Error'); }
    };

    const filteredCourses = courses.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <CollegeAdminLayout activeTab="courses">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div><h1 className="text-4xl font-bold text-gray-900 mb-2">Courses</h1><p className="text-gray-600">Manage academic programs and degree courses</p></div>
                    <div className="flex gap-3">
                        <button onClick={fetchCourses} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
                        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg"><Plus size={18} /> Add Course</button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="relative">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search courses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#9F7AEA]/10"><GraduationCap size={24} className="text-[#9F7AEA]" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{courses.length}</p><p className="text-sm text-gray-500">Total Courses</p></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-100"><Clock size={24} className="text-blue-600" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{courses.reduce((acc, c) => acc + (c.duration_years || 0), 0) / courses.length || 0}</p><p className="text-sm text-gray-500">Avg Duration (yrs)</p></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-100"><GraduationCap size={24} className="text-green-600" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{courses.reduce((acc, c) => acc + c.intake, 0)}</p><p className="text-sm text-gray-500">Total Intake</p></div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : filteredCourses.length === 0 ? <div className="text-center py-12 text-gray-500">No courses found</div> : (
                        <table className="w-full">
                            <thead className="bg-gray-50"><tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Title</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Nature</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Duration</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Intake</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCourses.map((course, i) => (
                                    <motion.tr key={course.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-[#9F7AEA]/10"><GraduationCap size={18} className="text-[#9F7AEA]" /></div>
                                                <span className="font-medium text-gray-900">{course.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><span className="font-mono px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">{course.code}</span></td>
                                        <td className="px-6 py-4"><span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">{course.nature_of_course || '-'}</span></td>
                                        <td className="px-6 py-4 text-gray-600">{course.duration_years} years</td>
                                        <td className="px-6 py-4 text-gray-600 font-semibold">{course.intake}</td>
                                        <td className="px-6 py-4"><div className="flex gap-2">
                                            <button onClick={() => handleEdit(course)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(course.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                        </div></td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {showForm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-800">{editingCourse ? 'Edit Course' : 'Add Course'}</h3>
                                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input className="w-full px-4 py-2 border rounded-lg" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Code *</label><input className="w-full px-4 py-2 border rounded-lg" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Nature</label><input className="w-full px-4 py-2 border rounded-lg" value={form.nature_of_course} onChange={(e) => setForm({ ...form, nature_of_course: e.target.value })} placeholder="e.g., Professional" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Duration (years)</label><input type="number" min="1" max="6" className="w-full px-4 py-2 border rounded-lg" value={form.duration_years} onChange={(e) => setForm({ ...form, duration_years: parseInt(e.target.value) })} /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Intake</label><input type="number" className="w-full px-4 py-2 border rounded-lg" value={form.intake} onChange={(e) => setForm({ ...form, intake: parseInt(e.target.value) })} /></div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                                    <button type="submit" disabled={submitting} className="px-8 py-2.5 bg-[#4D869C] text-white font-bold rounded-xl disabled:opacity-50">{submitting ? 'Saving...' : editingCourse ? 'Update' : 'Add'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </div>
        </CollegeAdminLayout>
    );
};

export default CoursesPage;
