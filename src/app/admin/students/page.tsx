'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Users, Plus, Edit, Trash2, X, Search, RefreshCw, GraduationCap, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import CollegeAdminLayout from '@/components/admin/CollegeAdminLayout';

interface Department { id: string; name: string; code: string; }
interface Course { id: string; title: string; code: string; }
interface Batch { id: string; name: string; semester: number; section: string; }
interface Student {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    college_uid: string;
    student_id?: string;
    phone?: string;
    admission_year: number;
    current_semester: number;
    course_id?: string;
    department_id?: string;
    batch_id?: string;
    is_active: boolean;
    departments?: Department | null;
    batch?: Batch | null;
}

const StudentsPage: React.FC = () => {
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '', phone: '', student_id: '', password: '',
        admission_year: new Date().getFullYear(), current_semester: 1, course_id: '', department_id: '', batch_id: '', is_active: true
    });

    useEffect(() => { fetchData(); }, []);

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
            const q = user.college_id ? `?college_id=${user.college_id}&limit=1000` : '?limit=1000';
            const [studentRes, deptRes, courseRes, batchRes] = await Promise.all([
                fetch(`/api/admin/students${q}`, { headers }),
                fetch(`/api/admin/departments${q}`, { headers }),
                fetch(`/api/admin/courses${q}`, { headers }),
                fetch(`/api/admin/batches${q}`, { headers })
            ]);
            if (studentRes.ok) setStudents((await studentRes.json()).students || []);
            if (deptRes.ok) setDepartments((await deptRes.json()).departments || []);
            if (courseRes.ok) setCourses((await courseRes.json()).courses || []);
            if (batchRes.ok) setBatches((await batchRes.json()).batches || []);
        } catch { toast.error('Error loading data'); } finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.first_name || !form.last_name || !form.email) { toast.error('Name and email required'); return; }
        setSubmitting(true);
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            // If editing, we might need to update batch separately or rely on API to handle it
            // The modified POST/PUT API should handle batch_id
            const url = editingStudent ? `/api/admin/students/${editingStudent.id}` : '/api/admin/students';

            // Note: For Update (PUT), the API might not yet support batch_id update directly in the student update payload
            // But we can try. If it fails, we might need a separate call to batch-enrollment endpoint.
            // However, for CREATE (POST), we added support.

            // Let's rely on standard flow. If PUT doesn't support batch update, we'll need to add it to the PUT endpoint too.
            // Assume for now we only support it fully on CREATE, or update the PUT endpoint next.
            // Actually, I'll update the component to make a separate call for batch enrollment if editing

            const res = await fetch(url, { method: editingStudent ? 'PUT' : 'POST', headers, body: JSON.stringify(form) });

            if (res.ok) {
                const data = await res.json();

                // If editing and batch changed, update enrollment separately if needed
                if (editingStudent && form.batch_id !== editingStudent.batch_id) {
                    await fetch('/api/admin/students/batch-enrollment', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ student_id: editingStudent.id, batch_id: form.batch_id })
                    });
                }

                toast.success(editingStudent ? 'Updated' : 'Created');
                setShowForm(false);
                setEditingStudent(null);
                resetForm();
                fetchData();
            }
            else { const err = await res.json(); toast.error(err.error || 'Failed'); }
        } catch { toast.error('Error'); } finally { setSubmitting(false); }
    };

    const resetForm = () => setForm({ first_name: '', last_name: '', email: '', phone: '', student_id: '', password: '', admission_year: new Date().getFullYear(), current_semester: 1, course_id: '', department_id: '', batch_id: '', is_active: true });

    const handleEdit = (student: Student) => {
        setEditingStudent(student);
        setForm({
            first_name: student.first_name, last_name: student.last_name, email: student.email, phone: student.phone || '',
            student_id: student.student_id || '', password: '', admission_year: student.admission_year, current_semester: student.current_semester,
            course_id: student.course_id || '', department_id: student.department_id || '', batch_id: student.batch_id || '', is_active: student.is_active
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete student?')) return;
        try {
            const headers = getAuthHeaders();
            if (!headers) return;
            const res = await fetch(`/api/admin/students/${id}`, { method: 'DELETE', headers });
            if (res.ok) { toast.success('Deleted'); setStudents(prev => prev.filter(s => s.id !== id)); }
        } catch { toast.error('Error'); }
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase()) || s.college_uid.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = departmentFilter === 'all' || s.department_id === departmentFilter;
        return matchesSearch && matchesDept;
    });

    return (
        <CollegeAdminLayout activeTab="students">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div><h1 className="text-4xl font-bold text-gray-900 mb-2">Students</h1><p className="text-gray-600">Manage student records and information</p></div>
                    <div className="flex gap-3">
                        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
                        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg"><Plus size={18} /> Add Student</button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none" />
                        </div>
                        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl min-w-[200px]">
                            <option value="all">All Departments</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#F56565]/10"><Users size={24} className="text-[#F56565]" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{filteredStudents.length}</p><p className="text-sm text-gray-500">Total Students</p></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-100"><Users size={24} className="text-green-600" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{filteredStudents.filter(s => s.is_active).length}</p><p className="text-sm text-gray-500">Active</p></div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : filteredStudents.length === 0 ? <div className="text-center py-12 text-gray-500">No students found</div> : (
                        <table className="w-full">
                            <thead className="bg-gray-50"><tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Semester</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Batch</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.map((student, i) => (
                                    <motion.tr key={student.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#F56565] text-white flex items-center justify-center font-bold">{student.first_name[0]}{student.last_name[0]}</div>
                                                <div><p className="font-medium text-gray-900">{student.first_name} {student.last_name}</p><p className="text-xs text-gray-500">{student.college_uid}</p></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{student.email}</td>
                                        <td className="px-6 py-4"><span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">{student.departments?.name || '-'}</span></td>
                                        <td className="px-6 py-4"><span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">Sem {student.current_semester}</span></td>
                                        <td className="px-6 py-4"><span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">{student.batch?.name ? `${student.batch.name} (${student.batch.section})` : '-'}</span></td>
                                        <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${student.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{student.is_active ? 'Active' : 'Inactive'}</span></td>
                                        <td className="px-6 py-4"><div className="flex gap-2">
                                            <button onClick={() => handleEdit(student)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(student.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
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
                                <h3 className="text-lg font-bold text-gray-800">{editingStudent ? 'Edit Student' : 'Add Student'}</h3>
                                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label><input className="w-full px-4 py-2 border rounded-lg" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label><input className="w-full px-4 py-2 border rounded-lg" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required /></div>
                                </div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" className="w-full px-4 py-2 border rounded-lg" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input className="w-full px-4 py-2 border rounded-lg" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label><input className="w-full px-4 py-2 border rounded-lg" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} /></div>
                                </div>
                                {!editingStudent && <div><label className="block text-sm font-medium text-gray-700 mb-1">Password *</label><input type="password" className="w-full px-4 py-2 border rounded-lg" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingStudent} /></div>}
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Admission Year</label><input type="number" className="w-full px-4 py-2 border rounded-lg" value={form.admission_year} onChange={(e) => setForm({ ...form, admission_year: parseInt(e.target.value) })} /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Semester</label><input type="number" min="1" max="8" className="w-full px-4 py-2 border rounded-lg" value={form.current_semester} onChange={(e) => setForm({ ...form, current_semester: parseInt(e.target.value) })} /></div>
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
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                                    <select className="w-full px-4 py-2 border rounded-lg" value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })}>
                                        <option value="">Select Batch/Section</option>
                                        {batches.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {b.name} - Section {b.section} (Sem {b.semester})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 text-[#4D869C] rounded" />
                                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                                    <button type="submit" disabled={submitting} className="px-8 py-2.5 bg-[#4D869C] text-white font-bold rounded-xl disabled:opacity-50">{submitting ? 'Saving...' : editingStudent ? 'Update' : 'Add'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </div>
        </CollegeAdminLayout>
    );
};

export default StudentsPage;
