'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CardLoader } from '@/components/ui/PageLoader';
import { BookOpen, Plus, Edit, Trash2, X, Search, RefreshCw, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import CollegeAdminLayout from '@/components/admin/CollegeAdminLayout';
import { useSemesterMode } from '@/contexts/SemesterModeContext';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface Department { id: string; name: string; code: string; }
interface Course { id: string; title: string; code: string; }
interface BatchRef { id: string; name: string; }
interface Batch { id: string; name: string; department_id: string; semester: number; }
interface Subject {
    id: string;
    code: string;
    name: string;
    credits_per_week: number;
    credit_value?: number;
    semester?: number;
    subject_type: string;
    nep_category?: string;
    department_id: string;
    course_id?: string;
    is_active: boolean;
    departments?: Department | null;
    batches?: BatchRef[];
}

const SubjectsPage: React.FC = () => {
    const { showConfirm } = useConfirm();
    const router = useRouter();
    const { semesterMode, activeSemesters, modeLabel } = useSemesterMode();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [semesterFilter, setSemesterFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [allBatches, setAllBatches] = useState<Batch[]>([]);
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
    const [showAllSemsBatches, setShowAllSemsBatches] = useState(false);

    const [form, setForm] = useState({
        code: '', name: '', credits_per_week: 4, credit_value: 0, semester: 1, department_id: '', course_id: '',
        subject_type: 'THEORY', nep_category: 'CORE', is_active: true
    });

    useEffect(() => { fetchData(); }, []);

    // When the global semester mode changes, reset individual semester filter to 'all'
    useEffect(() => {
        setSemesterFilter('all');
    }, [semesterMode]);

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
            const q = user.college_id ? `?college_id=${user.college_id}` : '';
            const [subjectRes, deptRes, courseRes, batchRes] = await Promise.all([
                fetch(`/api/admin/subjects${q}`, { headers }),
                fetch(`/api/admin/departments${q}`, { headers }),
                fetch(`/api/admin/courses${q}`, { headers }),
                fetch(`/api/admin/batches${q}${q ? '&' : '?'}include_inactive=true`, { headers })
            ]);
            if (subjectRes.ok) setSubjects((await subjectRes.json()).subjects || []);
            if (deptRes.ok) setDepartments((await deptRes.json()).departments || []);
            if (courseRes.ok) setCourses((await courseRes.json()).courses || []);
            if (batchRes.ok) setAllBatches((await batchRes.json()).batches || []);
        } catch { toast.error('Error loading data'); } finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.code || !form.name) { toast.error('Code and name required'); return; }
        setSubmitting(true);
        try {
            const headers = getAuthHeaders();
            if (!headers) return;
            const url = editingSubject ? `/api/admin/subjects/${editingSubject.id}` : '/api/admin/subjects';
            const payload = editingSubject ? { ...form, batch_ids: selectedBatchIds } : form;
            const res = await fetch(url, { method: editingSubject ? 'PUT' : 'POST', headers, body: JSON.stringify(payload) });
            if (res.ok) { toast.success(editingSubject ? 'Updated' : 'Created'); setShowForm(false); setEditingSubject(null); resetForm(); fetchData(); }
            else { const err = await res.json(); toast.error(err.error || 'Failed'); }
        } catch { toast.error('Error'); } finally { setSubmitting(false); }
    };

    const resetForm = () => {
        setEditingSubject(null);
        setSelectedBatchIds([]);
        setShowAllSemsBatches(false);
        setForm({ code: '', name: '', credits_per_week: 4, credit_value: 0, semester: 1, department_id: '', course_id: '', subject_type: 'THEORY', nep_category: 'CORE', is_active: true });
    };

    const handleEdit = (subject: Subject) => {
        setEditingSubject(subject);
        setSelectedBatchIds(subject.batches?.map(b => b.id) || []);
        setShowAllSemsBatches(false);
        setForm({
            code: subject.code, name: subject.name, credits_per_week: subject.credits_per_week,
            credit_value: subject.credit_value ?? 0, semester: subject.semester || 1,
            department_id: subject.department_id || '', course_id: subject.course_id || '',
            subject_type: subject.subject_type, nep_category: subject.nep_category || 'CORE', is_active: subject.is_active
        });
        setShowForm(true);
    };

    const handleDelete = (subject: Subject) => {
        showConfirm({
            title: 'Delete Subject',
            message: `Are you sure you want to delete subject "${subject.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    const headers = getAuthHeaders();
                    if (!headers) return;
                    let res = await fetch(`/api/admin/subjects/${subject.id}`, { method: 'DELETE', headers });

                    // If subject has references, ask user to force delete
                    if (res.status === 409) {
                        const data = await res.json();
                        if (data.hasReferences) {
                            let confirmMsg = data.error + '\n\n';
                            if (data.hasLockedMajor) {
                                confirmMsg += '⚠️ WARNING: This subject has locked MAJOR selections by students (NEP 2020). Force deleting will permanently remove those enrollments.\n\n';
                            }
                            confirmMsg += 'Do you want to force delete this subject and remove ALL related data (enrollments, scheduled classes, batch assignments)?';
                            const forceConfirm = confirm(confirmMsg);
                            if (!forceConfirm) return;
                            res = await fetch(`/api/admin/subjects/${subject.id}?force=true`, { method: 'DELETE', headers });
                        }
                    }

                    if (res.ok) { toast.success('Deleted'); setSubjects(prev => prev.filter(s => s.id !== subject.id)); }
                    else { const data = await res.json().catch(() => ({})); toast.error(data.error || 'Failed to delete'); }
                } catch { toast.error('Error'); }
            }
        });
    };

    // Get unique semesters from subjects — only those valid in the current mode
    const uniqueSemesters = [...new Set(subjects.map(s => s.semester).filter(Boolean))]
        .filter(sem => semesterMode === 'all' || activeSemesters.includes(sem!))
        .sort((a, b) => (a || 0) - (b || 0));

    const filteredSubjects = subjects.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = departmentFilter === 'all' || s.department_id === departmentFilter;
        const matchesSem = semesterFilter === 'all' || s.semester?.toString() === semesterFilter;
        // Always filter by the active semester mode
        const matchesMode = semesterMode === 'all' || (s.semester != null && activeSemesters.includes(s.semester));
        return matchesSearch && matchesDept && matchesSem && matchesMode;
    });

    const shortBatchLabel = (name: string) => {
        // "CSE-DS Batch 2024 - Sem 3 (2025-26)" → "CSE-DS S3 '24"
        const deptMatch = name.match(/^([-\w]+)\s+Batch/);
        const semMatch = name.match(/Sem\s+(\d+)/i);
        const yearMatch = name.match(/Batch\s+(\d{4})/i);
        const dept = deptMatch?.[1] || name.slice(0, 8);
        const sem = semMatch?.[1] || '?';
        const year = yearMatch?.[1]?.slice(2) || '';
        return year ? `${dept} S${sem} '${year}` : `${dept} S${sem}`;
    };

    const getTypeColor = (type: string) => {
        switch (type) { case 'LAB': return 'bg-purple-100 text-purple-700'; case 'PRACTICAL': return 'bg-orange-100 text-orange-700'; case 'TUTORIAL': return 'bg-blue-100 text-blue-700'; default: return 'bg-gray-100 text-gray-700'; }
    };

    const getCategoryColor = (category?: string) => {
        switch (category) {
            case 'MAJOR': return 'bg-indigo-100 text-indigo-700';
            case 'MINOR': return 'bg-teal-100 text-teal-700';
            case 'MULTIDISCIPLINARY': return 'bg-cyan-100 text-cyan-700';
            case 'AEC': return 'bg-amber-100 text-amber-700';
            case 'VAC': return 'bg-lime-100 text-lime-700';
            case 'CORE': return 'bg-green-100 text-green-700';
            case 'PEDAGOGY': return 'bg-pink-100 text-pink-700';
            case 'INTERNSHIP': return 'bg-red-100 text-red-700';
            case 'Major I': return 'bg-violet-100 text-violet-700';
            case 'Major II': return 'bg-purple-100 text-purple-700';
            case 'CORE COMPLETELY': return 'bg-emerald-100 text-emerald-700';
            case 'CORE PARTIAL': return 'bg-sky-100 text-sky-700';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    return (
        <CollegeAdminLayout activeTab="subjects">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div><h1 className="text-4xl font-bold text-gray-900 mb-2">Subjects</h1><p className="text-gray-600">Manage course subjects and curriculum</p></div>
                    <div className="flex gap-3">
                        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
                        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg"><Plus size={18} /> Add Subject</button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex gap-4 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search subjects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none" />
                        </div>
                        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl min-w-[180px]">
                            <option value="all">All Departments</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl min-w-[150px]">
                            <option value="all">All Semesters</option>
                            {uniqueSemesters.map(sem => <option key={sem} value={sem?.toString()}>Semester {sem}</option>)}
                        </select>
                    </div>
                    {/* Active semester mode banner */}
                    {semesterMode !== 'all' && (
                        <div className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${semesterMode === 'odd' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-violet-50 text-violet-700 border border-violet-200'
                            }`}>
                            <span className="w-2 h-2 rounded-full animate-pulse inline-block bg-current"></span>
                            Active mode: <strong className="ml-1">{modeLabel}</strong>
                            <span className="ml-1 text-xs opacity-70">— showing semesters {activeSemesters.join(', ')} only. Change via header toggle.</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#48BB78]/10"><BookOpen size={24} className="text-[#48BB78]" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{filteredSubjects.length}</p><p className="text-sm text-gray-500">Total Subjects</p></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gray-100"><BookOpen size={24} className="text-gray-600" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{filteredSubjects.filter(s => s.subject_type === 'THEORY').length}</p><p className="text-sm text-gray-500">Theory</p></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-100"><BookOpen size={24} className="text-purple-600" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{filteredSubjects.filter(s => s.subject_type === 'LAB').length}</p><p className="text-sm text-gray-500">Labs</p></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-amber-100"><Award size={24} className="text-amber-600" /></div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {filteredSubjects.reduce((sum, s) => sum + (s.credits_per_week || 0), 0)}
                            </p>
                            <p className="text-sm text-gray-500">
                                Total Credits
                                {semesterFilter !== 'all' ? ` · Sem ${semesterFilter}` : ''}
                                {departmentFilter !== 'all' ? ` · ${departments.find(d => d.id === departmentFilter)?.code || ''}` : ''}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {loading ? <CardLoader message="Loading subjects..." subMessage="Fetching subject list" /> : filteredSubjects.length === 0 ? <div className="text-center py-12 text-gray-500">No subjects found</div> : (
                        <table className="w-full">
                            <thead className="bg-gray-50"><tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Hrs/Wk</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Credits</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Category</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Batches</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSubjects.map((subject, i) => (
                                    <motion.tr key={subject.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                                        <td className="px-6 py-4"><span className="font-mono px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">{subject.code}</span></td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{subject.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{subject.credits_per_week}</td>
                                        <td className="px-6 py-4 font-semibold text-indigo-700">{subject.credit_value ?? '—'}</td>
                                        <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(subject.subject_type)}`}>{subject.subject_type}</span></td>
                                        <td className="px-6 py-4">
                                            {subject.nep_category
                                                ? <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(subject.nep_category)}`}>{subject.nep_category}</span>
                                                : <span className="text-gray-400 italic text-xs">—</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4"><span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">{subject.departments?.name || '-'}</span></td>
                                        <td className="px-6 py-4">
                                            {!subject.batches || subject.batches.length === 0
                                                ? <span className="px-2 py-1 bg-orange-50 text-orange-500 rounded text-xs font-medium">Unassigned</span>
                                                : <div className="flex flex-wrap gap-1">
                                                    {subject.batches.slice(0, 3).map(b => (
                                                        <span key={b.id} title={b.name} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium whitespace-nowrap">
                                                            {shortBatchLabel(b.name)}
                                                        </span>
                                                    ))}
                                                    {subject.batches.length > 3 && (
                                                        <span title={subject.batches.slice(3).map(b => b.name).join('\n')} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-medium cursor-default">
                                                            +{subject.batches.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            }
                                        </td>
                                        <td className="px-6 py-4"><div className="flex gap-2">
                                            <button onClick={() => handleEdit(subject)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(subject)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                        </div></td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {showForm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 sticky top-0">
                                <h3 className="text-lg font-bold text-gray-800">{editingSubject ? 'Edit Subject' : 'Add Subject'}</h3>
                                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Code *</label><input className="w-full px-4 py-2 border rounded-lg" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Hrs / Week <span className="text-gray-400 text-xs">(scheduling)</span></label><input type="number" min={1} className="w-full px-4 py-2 border rounded-lg" value={form.credits_per_week} onChange={(e) => setForm({ ...form, credits_per_week: parseInt(e.target.value) })} /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Credit Value <span className="text-gray-400 text-xs">(display)</span></label><input type="number" min={0} step={0.5} className="w-full px-4 py-2 border rounded-lg" value={form.credit_value} onChange={(e) => setForm({ ...form, credit_value: parseFloat(e.target.value) || 0 })} /></div>
                                </div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input className="w-full px-4 py-2 border rounded-lg" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                        <select className="w-full px-4 py-2 border rounded-lg" value={form.subject_type} onChange={(e) => setForm({ ...form, subject_type: e.target.value })}>
                                            <option value="THEORY">Theory</option><option value="LAB">Lab</option><option value="PRACTICAL">Practical</option><option value="TUTORIAL">Tutorial</option>
                                        </select>
                                    </div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">NEP Category</label>
                                        <select className="w-full px-4 py-2 border rounded-lg" value={form.nep_category} onChange={(e) => setForm({ ...form, nep_category: e.target.value })}>
                                            <option value="CORE">Core</option><option value="MAJOR">Major</option><option value="MINOR">Minor</option><option value="MULTIDISCIPLINARY">Multidisciplinary</option><option value="AEC">AEC</option><option value="VAC">VAC</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                                        <select className="w-full px-4 py-2 border rounded-lg" value={form.semester} onChange={(e) => setForm({ ...form, semester: parseInt(e.target.value) })}>
                                            <option value={1}>Semester 1</option>
                                            <option value={2}>Semester 2</option>
                                            <option value={3}>Semester 3</option>
                                            <option value={4}>Semester 4</option>
                                            <option value={5}>Semester 5</option>
                                            <option value={6}>Semester 6</option>
                                            <option value={7}>Semester 7</option>
                                            <option value={8}>Semester 8</option>
                                        </select>
                                    </div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select className="w-full px-4 py-2 border rounded-lg" value={form.is_active ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                    <select className="w-full px-4 py-2 border rounded-lg" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                                        <option value="">Select</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                                    <select className="w-full px-4 py-2 border rounded-lg" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
                                        <option value="">Select</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                </div>
                                {editingSubject && (
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Batch Assignment
                                                <span className="ml-1 text-xs text-gray-400">({selectedBatchIds.length} selected)</span>
                                            </label>
                                            <button type="button" onClick={() => setShowAllSemsBatches(p => !p)} className="text-xs text-indigo-600 hover:underline">
                                                {showAllSemsBatches ? `Sem ${form.semester} only` : 'Show all semesters'}
                                            </button>
                                        </div>
                                        <div className="border rounded-lg max-h-44 overflow-y-auto">
                                            {allBatches.filter(b => showAllSemsBatches || b.semester === form.semester).length === 0
                                                ? <p className="text-xs text-gray-400 px-3 py-3 text-center">No batches found for Semester {form.semester}</p>
                                                : allBatches
                                                    .filter(b => showAllSemsBatches || b.semester === form.semester)
                                                    .map(b => (
                                                        <label key={b.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedBatchIds.includes(b.id)}
                                                                onChange={(e) => setSelectedBatchIds(prev =>
                                                                    e.target.checked ? [...prev, b.id] : prev.filter(id => id !== b.id)
                                                                )}
                                                                className="rounded accent-indigo-600"
                                                            />
                                                            <span className="text-sm text-gray-700 flex-1">{b.name}</span>
                                                            {selectedBatchIds.includes(b.id) && <span className="text-xs text-indigo-500 font-medium">✓</span>}
                                                        </label>
                                                    ))
                                            }
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                                    <button type="submit" disabled={submitting} className="px-8 py-2.5 bg-[#4D869C] text-white font-bold rounded-xl disabled:opacity-50">{submitting ? 'Saving...' : editingSubject ? 'Update' : 'Add'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </div>
        </CollegeAdminLayout>
    );
};

export default SubjectsPage;
