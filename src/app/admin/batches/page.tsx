'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Layers, Plus, Edit, Trash2, X, Search, RefreshCw, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import CollegeAdminLayout from '@/components/admin/CollegeAdminLayout';
import { useSemesterMode } from '@/contexts/SemesterModeContext';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface Department { id: string; name: string; code: string; }
interface Course { id: string; title: string; code: string; }
interface Batch {
    id: string;
    name: string;
    semester: number;
    section: string;
    academic_year: string;
    expected_strength: number;
    actual_strength: number;
    is_active: boolean;
    department_id: string;
    course_id?: string;
    departments?: Department | null;
    courses?: Course | null;
}

const BatchesPage: React.FC = () => {
    const router = useRouter();
    const { semesterMode, activeSemesters, modeLabel } = useSemesterMode();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [semesterFilter, setSemesterFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        department_id: '',
        course_id: '',
        semester: 1,
        section: 'A',
        academic_year: '2025-26',
        expected_strength: 60,
        actual_strength: 0,
        is_active: true
    });

    useEffect(() => { fetchData(); }, []);

    useEffect(() => { setSemesterFilter('all'); }, [semesterMode]);

    const getAuthHeaders = () => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return null; }
        return { 'Authorization': `Bearer ${Buffer.from(userData).toString('base64')}`, 'Content-Type': 'application/json' };
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const userData = localStorage.getItem('user');
            if (!userData) return;
            const user = JSON.parse(userData);
            const headers = getAuthHeaders();
            if (!headers) return;
            const q = user.college_id ? `?college_id=${user.college_id}&refresh=1` : '?refresh=1';
            const [batchRes, deptRes, courseRes] = await Promise.all([
                fetch(`/api/admin/batches${q}`, { headers }),
                fetch(`/api/admin/departments${q}`, { headers }),
                fetch(`/api/admin/courses${q}`, { headers })
            ]);
            if (batchRes.ok) setBatches((await batchRes.json()).batches || []);
            if (deptRes.ok) setDepartments((await deptRes.json()).departments || []);
            if (courseRes.ok) setCourses((await courseRes.json()).courses || []);
        } catch { toast.error('Error loading data'); } finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.department_id) { toast.error('Department required'); return; }
        setSubmitting(true);
        try {
            const headers = getAuthHeaders();
            if (!headers) return;
            const url = editingBatch ? `/api/admin/batches/${editingBatch.id}` : '/api/admin/batches';
            const res = await fetch(url, { method: editingBatch ? 'PUT' : 'POST', headers, body: JSON.stringify(form) });
            if (res.ok) { toast.success(editingBatch ? 'Updated' : 'Created'); setShowForm(false); setEditingBatch(null); resetForm(); fetchData(); }
            else { const err = await res.json(); toast.error(err.error || 'Failed'); }
        } catch { toast.error('Error'); } finally { setSubmitting(false); }
    };

    const resetForm = () => setForm({ department_id: '', course_id: '', semester: 1, section: 'A', academic_year: '2025-26', expected_strength: 60, actual_strength: 0, is_active: true });

    const handleEdit = (batch: Batch) => {
        setEditingBatch(batch);
        setForm({ department_id: batch.department_id, course_id: batch.course_id || '', semester: batch.semester, section: batch.section, academic_year: batch.academic_year, expected_strength: batch.expected_strength, actual_strength: batch.actual_strength, is_active: batch.is_active });
        setShowForm(true);
    };

    const { showConfirm } = useConfirm();

    const handleDeleteBatch = (batch: Batch) => {
        showConfirm({
            title: 'Delete Batch',
            message: `Are you sure you want to delete batch "${batch.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    const headers = getAuthHeaders();
                    if (!headers) return;
                    const res = await fetch(`/api/admin/batches?id=${batch.id}`, { method: 'DELETE', headers });
                    if (res.ok) {
                        toast.success('Deleted');
                        setBatches(prev => prev.filter(b => b.id !== batch.id));
                    }
                } catch {
                    toast.error('Error');
                }
            }
        });
    };

    const uniqueSemesters = [...new Set(batches.map(b => b.semester))]
        .filter(sem => semesterMode === 'all' || activeSemesters.includes(sem))
        .sort((a, b) => a - b);

    const filteredBatches = batches.filter(b => {
        const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.section.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = departmentFilter === 'all' || b.department_id === departmentFilter;
        const matchesSem = semesterFilter === 'all' || b.semester.toString() === semesterFilter;
        const matchesMode = semesterMode === 'all' || activeSemesters.includes(b.semester);
        return matchesSearch && matchesDept && matchesSem && matchesMode;
    });

    return (
        <CollegeAdminLayout activeTab="batches">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div><h1 className="text-4xl font-bold text-gray-900 mb-2">Batches</h1><p className="text-gray-600">Manage student batches and sections</p></div>
                    <div className="flex gap-3">
                        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
                        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg"><Plus size={18} /> Add Batch</button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex gap-4 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search batches..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none" />
                        </div>
                        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl min-w-[180px]">
                            <option value="all">All Departments</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl min-w-[150px]">
                            <option value="all">All Semesters</option>
                            {uniqueSemesters.map(sem => <option key={sem} value={sem.toString()}>Semester {sem}</option>)}
                        </select>
                    </div>
                    {semesterMode !== 'all' && (
                        <div className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${semesterMode === 'odd' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-violet-50 text-violet-700 border border-violet-200'
                            }`}>
                            <span className="w-2 h-2 rounded-full animate-pulse inline-block bg-current"></span>
                            Active mode: <strong className="ml-1">{modeLabel}</strong>
                            <span className="ml-1 text-xs opacity-70">— showing semesters {activeSemesters.join(', ')} only.</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#ED8936]/10"><Layers size={24} className="text-[#ED8936]" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{filteredBatches.length}</p><p className="text-sm text-gray-500">Total Batches</p></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-100"><Layers size={24} className="text-green-600" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{filteredBatches.filter(b => b.is_active).length}</p><p className="text-sm text-gray-500">Active</p></div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : filteredBatches.length === 0 ? <div className="text-center py-12 text-gray-500">No batches found</div> : (
                        <table className="w-full">
                            <thead className="bg-gray-50"><tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Course</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Semester</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Strength</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredBatches.map((batch, i) => (
                                    <motion.tr key={batch.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{batch.name}</td>
                                        <td className="px-6 py-4"><span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">{batch.departments?.name || '-'}</span></td>
                                        <td className="px-6 py-4 text-gray-600">{batch.courses?.title || '-'}</td>
                                        <td className="px-6 py-4"><span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Sem {batch.semester}</span></td>
                                        <td className="px-6 py-4 text-gray-600">{batch.actual_strength}/{batch.expected_strength}</td>
                                        <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${batch.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{batch.is_active ? 'Active' : 'Inactive'}</span></td>
                                        <td className="px-6 py-4"><div className="flex gap-2">
                                            <button onClick={() => handleEdit(batch)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                                            <button onClick={() => handleDeleteBatch(batch)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
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
                                <h3 className="text-lg font-bold text-gray-800">{editingBatch ? 'Edit Batch' : 'Add Batch'}</h3>
                                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                                    <select className="w-full px-4 py-2 border rounded-lg" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} required>
                                        <option value="">Select</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                                    <select className="w-full px-4 py-2 border rounded-lg" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
                                        <option value="">Select</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Semester</label><input type="number" min="1" max="8" className="w-full px-4 py-2 border rounded-lg" value={form.semester} onChange={(e) => setForm({ ...form, semester: parseInt(e.target.value) })} /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Section</label><input className="w-full px-4 py-2 border rounded-lg" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Expected Strength</label><input type="number" className="w-full px-4 py-2 border rounded-lg" value={form.expected_strength} onChange={(e) => setForm({ ...form, expected_strength: parseInt(e.target.value) })} /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label><input className="w-full px-4 py-2 border rounded-lg" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} /></div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                                    <button type="submit" disabled={submitting} className="px-8 py-2.5 bg-[#4D869C] text-white font-bold rounded-xl disabled:opacity-50">{submitting ? 'Saving...' : editingBatch ? 'Update' : 'Add'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </div>
        </CollegeAdminLayout>
    );
};

export default BatchesPage;
