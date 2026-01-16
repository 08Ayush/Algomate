'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ClipboardList, Plus, Edit, Trash2, X, Search, RefreshCw, BookOpen, Eye, CheckCircle, XCircle, Users, Pen } from 'lucide-react';
import toast from 'react-hot-toast';
import CollegeAdminLayout from '@/components/admin/CollegeAdminLayout';

interface Department { id: string; name: string; code: string; }
interface Batch { id: string; name: string; semester: number; section: string; academic_year: string; department_id: string; departments?: { name: string } | null; }
interface Subject { id: string; code: string; name: string; semester?: number; department_id: string; }
interface BucketSubject { subject_id: string; subjects: Subject | null; }
interface Bucket {
    id: string;
    bucket_name: string;
    batch_id: string;
    min_selection: number;
    max_selection: number;
    is_common_slot: boolean;
    is_published: boolean;
    is_live_for_creators?: boolean;
    is_live_for_students?: boolean;
    submission_deadline?: string;
    bucket_subjects?: BucketSubject[];
    batches?: Batch | null;
}

const BucketsPage: React.FC = () => {
    const router = useRouter();
    const [buckets, setBuckets] = useState<Bucket[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [semesterFilter, setSemesterFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editingBucket, setEditingBucket] = useState<Bucket | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

    const [form, setForm] = useState({
        bucket_name: '', batch_id: '', min_selection: 1, max_selection: 1, is_common_slot: true
    });

    useEffect(() => { fetchData(); }, []);

    const getAuthHeaders = () => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return null; }
        return { 'Authorization': `Bearer ${Buffer.from(userData).toString('base64')}`, 'Content-Type': 'application/json' };
    };

    const getUserId = () => {
        const userData = localStorage.getItem('user');
        if (!userData) return null;
        return JSON.parse(userData).id;
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
            const [bucketRes, batchRes, deptRes, subjectRes] = await Promise.all([
                fetch(`/api/admin/buckets${q}`, { headers }),
                fetch(`/api/admin/batches${q}`, { headers }),
                fetch(`/api/admin/departments${q}`, { headers }),
                fetch(`/api/admin/subjects${q}`, { headers })
            ]);
            if (bucketRes.ok) setBuckets((await bucketRes.json()).buckets || []);
            if (batchRes.ok) setBatches((await batchRes.json()).batches || []);
            if (deptRes.ok) setDepartments((await deptRes.json()).departments || []);
            if (subjectRes.ok) setSubjects((await subjectRes.json()).subjects || []);
        } catch { toast.error('Error loading data'); } finally { setLoading(false); }
    };

    // Extract subjects from bucket_subjects junction table
    const getBucketSubjects = (bucket: Bucket): Subject[] => {
        if (!bucket.bucket_subjects) return [];
        return bucket.bucket_subjects
            .filter(bs => bs.subjects)
            .map(bs => bs.subjects as Subject);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.bucket_name || !form.batch_id) { toast.error('Name and batch required'); return; }
        setSubmitting(true);
        try {
            const headers = getAuthHeaders();
            if (!headers) return;
            const url = editingBucket ? `/api/admin/buckets/${editingBucket.id}` : '/api/admin/buckets';
            const payload = { ...form, subject_ids: selectedSubjects };
            const res = await fetch(url, { method: editingBucket ? 'PUT' : 'POST', headers, body: JSON.stringify(payload) });
            if (res.ok) { toast.success(editingBucket ? 'Updated' : 'Created'); setShowForm(false); setEditingBucket(null); resetForm(); fetchData(); }
            else { const err = await res.json(); toast.error(err.error || 'Failed'); }
        } catch { toast.error('Error'); } finally { setSubmitting(false); }
    };

    const resetForm = () => { setForm({ bucket_name: '', batch_id: '', min_selection: 1, max_selection: 1, is_common_slot: true }); setSelectedSubjects([]); };

    const handleEdit = (bucket: Bucket) => {
        setEditingBucket(bucket);
        setForm({ bucket_name: bucket.bucket_name, batch_id: bucket.batch_id, min_selection: bucket.min_selection, max_selection: bucket.max_selection, is_common_slot: bucket.is_common_slot });
        const bucketSubjects = getBucketSubjects(bucket);
        setSelectedSubjects(bucketSubjects.map(s => s.id));
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete bucket?')) return;
        try {
            const headers = getAuthHeaders();
            if (!headers) return;
            const res = await fetch(`/api/admin/buckets/${id}`, { method: 'DELETE', headers });
            if (res.ok) { toast.success('Deleted'); setBuckets(prev => prev.filter(b => b.id !== id)); }
        } catch { toast.error('Error'); }
    };

    const handlePublish = async (id: string) => {
        try {
            const headers = getAuthHeaders();
            if (!headers) return;
            const res = await fetch(`/api/admin/buckets/${id}/publish`, { method: 'POST', headers });
            if (res.ok) { toast.success('Published'); fetchData(); }
            else { const err = await res.json(); toast.error(err.error || 'Failed to publish'); }
        } catch { toast.error('Error publishing'); }
    };

    const handleUnpublish = async (id: string) => {
        if (!confirm('Unpublish this bucket? Students will no longer be able to see it.')) return;
        try {
            const headers = getAuthHeaders();
            if (!headers) return;
            const res = await fetch(`/api/admin/buckets/${id}/unpublish`, { method: 'POST', headers });
            if (res.ok) { toast.success('Unpublished'); fetchData(); }
            else { const err = await res.json(); toast.error(err.error || 'Failed to unpublish'); }
        } catch { toast.error('Error unpublishing'); }
    };

    // Toggle Live for Creators
    const handleToggleLiveForCreators = async (bucket: Bucket) => {
        const newState = !bucket.is_live_for_creators;
        try {
            const headers = getAuthHeaders();
            if (!headers) return;
            const adminId = getUserId();
            const res = await fetch(`/api/admin/buckets/${bucket.id}/live-for-creators`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ is_live: newState, admin_id: adminId })
            });
            if (res.ok) {
                toast.success(newState ? 'Now live for creators!' : 'Disabled for creators');
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to update');
            }
        } catch { toast.error('Error updating'); }
    };

    // Toggle Live for Students
    const handleToggleLiveForStudents = async (bucket: Bucket) => {
        const newState = !bucket.is_live_for_students;
        try {
            const headers = getAuthHeaders();
            if (!headers) return;
            const adminId = getUserId();
            const res = await fetch(`/api/admin/buckets/${bucket.id}/live-for-students`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ is_live: newState, admin_id: adminId })
            });
            if (res.ok) {
                toast.success(newState ? 'Now live for students!' : 'Disabled for students');
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to update');
            }
        } catch { toast.error('Error updating'); }
    };

    // Get unique semesters from batches
    const uniqueSemesters = [...new Set(batches.map(b => b.semester))].sort((a, b) => a - b);

    const filteredBuckets = buckets.filter(b => {
        const matchesSearch = b.bucket_name.toLowerCase().includes(searchQuery.toLowerCase());
        const batch = batches.find(bt => bt.id === b.batch_id);
        const matchesDept = departmentFilter === 'all' || batch?.department_id === departmentFilter;
        const matchesSem = semesterFilter === 'all' || batch?.semester.toString() === semesterFilter;
        return matchesSearch && matchesDept && matchesSem;
    });

    return (
        <CollegeAdminLayout activeTab="buckets">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div><h1 className="text-4xl font-bold text-gray-900 mb-2">Elective Buckets</h1><p className="text-gray-600">Manage elective subject groupings for student choices</p></div>
                    <div className="flex gap-3">
                        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
                        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg"><Plus size={18} /> Add Bucket</button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex gap-4 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search buckets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none" />
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#5A67D8]/10"><ClipboardList size={24} className="text-[#5A67D8]" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{buckets.length}</p><p className="text-sm text-gray-500">Total Buckets</p></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-orange-100"><Pen size={24} className="text-orange-600" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{buckets.filter(b => b.is_live_for_creators).length}</p><p className="text-sm text-gray-500">Live for Creators</p></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-100"><Users size={24} className="text-blue-600" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{buckets.filter(b => b.is_live_for_students).length}</p><p className="text-sm text-gray-500">Live for Students</p></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-100"><CheckCircle size={24} className="text-green-600" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{buckets.filter(b => b.is_published).length}</p><p className="text-sm text-gray-500">Published</p></div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : filteredBuckets.length === 0 ? <div className="text-center py-12 text-gray-500">No buckets found</div> : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50"><tr>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase">Batch</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase">Subjects</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase">Selection</th>
                                    <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase">Live for Creators</th>
                                    <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase">Live for Students</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredBuckets.map((bucket, i) => {
                                        const bucketSubjects = getBucketSubjects(bucket);
                                        return (
                                            <motion.tr key={bucket.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-[#5A67D8]/10"><ClipboardList size={18} className="text-[#5A67D8]" /></div>
                                                        <span className="font-medium text-gray-900">{bucket.bucket_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4"><span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">{bucket.batches?.name || '-'}</span></td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {bucketSubjects.length === 0 ? (
                                                            <span className="text-gray-400 text-sm italic">No subjects</span>
                                                        ) : (
                                                            <>
                                                                {bucketSubjects.slice(0, 2).map(s => <span key={s.id} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{s.code}</span>)}
                                                                {bucketSubjects.length > 2 && <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">+{bucketSubjects.length - 2}</span>}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-gray-600 font-medium">{bucket.min_selection}-{bucket.max_selection}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleLiveForCreators(bucket)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${bucket.is_live_for_creators
                                                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                            }`}
                                                        title={bucket.is_live_for_creators ? 'Click to disable' : 'Click to enable'}
                                                    >
                                                        <Pen size={12} />
                                                        {bucket.is_live_for_creators ? 'ON' : 'OFF'}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleLiveForStudents(bucket)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${bucket.is_live_for_students
                                                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                            }`}
                                                        title={bucket.is_live_for_students ? 'Click to disable' : 'Click to enable'}
                                                    >
                                                        <Users size={12} />
                                                        {bucket.is_live_for_students ? 'ON' : 'OFF'}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${bucket.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{bucket.is_published ? 'Published' : 'Draft'}</span></td>
                                                <td className="px-4 py-4"><div className="flex gap-1">
                                                    {!bucket.is_published ? (
                                                        <button onClick={() => handlePublish(bucket.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Publish"><CheckCircle size={16} /></button>
                                                    ) : (
                                                        <button onClick={() => handleUnpublish(bucket.id)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg" title="Unpublish"><XCircle size={16} /></button>
                                                    )}
                                                    <button onClick={() => handleEdit(bucket)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                                                    <button onClick={() => handleDelete(bucket.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                                </div></td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {showForm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 sticky top-0">
                                <h3 className="text-lg font-bold text-gray-800">{editingBucket ? 'Edit Bucket' : 'Add Bucket'}</h3>
                                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Bucket Name *</label><input className="w-full px-4 py-2 border rounded-lg" value={form.bucket_name} onChange={(e) => setForm({ ...form, bucket_name: e.target.value })} required /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                                    <select className="w-full px-4 py-2 border rounded-lg" value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })} required>
                                        <option value="">Select Batch</option>
                                        {batches.map(b => <option key={b.id} value={b.id}>{b.name} - Sem {b.semester} ({b.academic_year})</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Min Selection</label><input type="number" min="1" className="w-full px-4 py-2 border rounded-lg" value={form.min_selection} onChange={(e) => setForm({ ...form, min_selection: parseInt(e.target.value) })} /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Selection</label><input type="number" min="1" className="w-full px-4 py-2 border rounded-lg" value={form.max_selection} onChange={(e) => setForm({ ...form, max_selection: parseInt(e.target.value) })} /></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" id="is_common_slot" checked={form.is_common_slot} onChange={(e) => setForm({ ...form, is_common_slot: e.target.checked })} className="w-4 h-4 text-[#4D869C] rounded" />
                                    <label htmlFor="is_common_slot" className="text-sm font-medium text-gray-700">Common Slot (all subjects at same time)</label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Subjects</label>
                                    <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                                        {subjects.length === 0 ? (
                                            <p className="text-gray-400 text-sm text-center py-4">No subjects available</p>
                                        ) : (
                                            subjects.map(s => (
                                                <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                                    <input type="checkbox" checked={selectedSubjects.includes(s.id)} onChange={(e) => {
                                                        if (e.target.checked) setSelectedSubjects(prev => [...prev, s.id]);
                                                        else setSelectedSubjects(prev => prev.filter(id => id !== s.id));
                                                    }} className="w-4 h-4 text-[#4D869C] rounded" />
                                                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{s.code}</span>
                                                    <span className="text-sm text-gray-700">{s.name}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                                    <button type="submit" disabled={submitting} className="px-8 py-2.5 bg-[#4D869C] text-white font-bold rounded-xl disabled:opacity-50">{submitting ? 'Saving...' : editingBucket ? 'Update' : 'Add'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </div>
        </CollegeAdminLayout>
    );
};

export default BucketsPage;
