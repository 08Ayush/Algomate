'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    DoorOpen,
    Plus,
    Edit,
    Trash2,
    X,
    Search,
    RefreshCw,
    Monitor,
    Cpu
} from 'lucide-react';
import toast from 'react-hot-toast';
import CollegeAdminLayout from '@/components/admin/CollegeAdminLayout';

interface Department {
    id: string;
    name: string;
    code: string;
}

interface Classroom {
    id: string;
    name: string;
    building?: string;
    floor_number?: number;
    capacity: number;
    type: string;
    has_projector: boolean;
    has_ac: boolean;
    has_computers: boolean;
    is_available: boolean;
    department_id?: string | null;
    department_name?: string | null;
    department_code?: string | null;
}

const ClassroomsPage: React.FC = () => {
    const router = useRouter();
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        name: '',
        department_id: '',
        floor_number: 1,
        capacity: 30,
        type: 'Lecture Hall',
        has_projector: false,
        has_ac: false,
        has_computers: false,
        is_available: true
    });

    useEffect(() => {
        fetchClassrooms();
        fetchDepartments();
    }, []);

    const getAuthHeaders = () => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return null;
        }
        const authToken = Buffer.from(userData).toString('base64');
        return {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        };
    };

    const fetchDepartments = async () => {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) return;
            const user = JSON.parse(userData);
            const headers = getAuthHeaders();
            if (!headers) return;

            const queryParam = user.college_id ? `?college_id=${user.college_id}` : '';
            const res = await fetch(`/api/admin/departments${queryParam}`, { headers });
            if (res.ok) {
                const data = await res.json();
                // Handle both array and object responses
                if (Array.isArray(data)) {
                    setDepartments(data);
                } else {
                    setDepartments(data.departments || data.data || []);
                }
            }
        } catch (error) {
            console.error('Error loading departments:', error);
        }
    };

    const fetchClassrooms = async () => {
        try {
            setLoading(true);
            const userData = localStorage.getItem('user');
            if (!userData) return;
            const user = JSON.parse(userData);
            const headers = getAuthHeaders();
            if (!headers) return;

            const queryParam = user.college_id ? `?college_id=${user.college_id}` : '';
            const res = await fetch(`/api/admin/classrooms${queryParam}`, { headers });

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setClassrooms(data);
                } else {
                    setClassrooms(data.classrooms || []);
                }
            }
        } catch (error) {
            toast.error('Error loading classrooms');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name) {
            toast.error('Name is required');
            return;
        }

        setSubmitting(true);
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const userData = localStorage.getItem('user');
            const user = userData ? JSON.parse(userData) : null;

            const url = editingClassroom
                ? `/api/admin/classrooms/${editingClassroom.id}`
                : '/api/admin/classrooms';

            const payload = {
                ...form,
                college_id: user?.college_id,
                department_id: form.department_id || null
            };

            const res = await fetch(url, {
                method: editingClassroom ? 'PUT' : 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success(editingClassroom ? 'Classroom updated' : 'Classroom created');
                setShowForm(false);
                setEditingClassroom(null);
                resetForm();
                fetchClassrooms();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to save');
            }
        } catch (error) {
            toast.error('Error saving classroom');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setForm({
            name: '',
            department_id: '',
            floor_number: 1,
            capacity: 30,
            type: 'Lecture Hall',
            has_projector: false,
            has_ac: false,
            has_computers: false,
            is_available: true
        });
    };

    const handleEdit = (classroom: Classroom) => {
        setEditingClassroom(classroom);
        setForm({
            name: classroom.name,
            department_id: classroom.department_id || '',
            floor_number: classroom.floor_number || 1,
            capacity: classroom.capacity,
            type: classroom.type,
            has_projector: classroom.has_projector,
            has_ac: classroom.has_ac,
            has_computers: classroom.has_computers,
            is_available: classroom.is_available
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this classroom?')) return;
        try {
            const headers = getAuthHeaders();
            if (!headers) return;
            const res = await fetch(`/api/admin/classrooms/${id}`, { method: 'DELETE', headers });
            if (res.ok) {
                toast.success('Deleted');
                setClassrooms(prev => prev.filter(c => c.id !== id));
            }
        } catch (error) {
            toast.error('Error deleting');
        }
    };

    const filteredClassrooms = classrooms.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === 'all' || c.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Lab': return 'bg-purple-100 text-purple-700';
            case 'Seminar Room': return 'bg-blue-100 text-blue-700';
            case 'Auditorium': return 'bg-orange-100 text-orange-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <CollegeAdminLayout activeTab="classrooms">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Classrooms</h1>
                        <p className="text-gray-600">Manage classrooms, labs, and facilities</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fetchClassrooms} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => { resetForm(); setEditingClassroom(null); setShowForm(true); }} className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg">
                            <Plus size={18} /> Add Classroom
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search classrooms..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none" />
                        </div>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl min-w-[180px]">
                            <option value="all">All Types</option>
                            <option value="Lecture Hall">Lecture Hall</option>
                            <option value="Lab">Lab</option>
                            <option value="Seminar Room">Seminar Room</option>
                            <option value="Auditorium">Auditorium</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#5A67D8]/10"><DoorOpen size={24} className="text-[#5A67D8]" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{filteredClassrooms.length}</p><p className="text-sm text-gray-500">Total Rooms</p></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-100"><Cpu size={24} className="text-purple-600" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{filteredClassrooms.filter(c => c.type === 'Lab').length}</p><p className="text-sm text-gray-500">Labs</p></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-100"><Monitor size={24} className="text-green-600" /></div>
                        <div><p className="text-2xl font-bold text-gray-900">{filteredClassrooms.filter(c => c.has_projector).length}</p><p className="text-sm text-gray-500">With Projector</p></div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : filteredClassrooms.length === 0 ? <div className="text-center py-12 text-gray-500">No classrooms found</div> : (
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Capacity</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Facilities</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredClassrooms.map((room, i) => (
                                    <motion.tr key={room.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{room.name}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {room.department_name
                                                ? <span className="inline-flex items-center gap-1">
                                                    <span className="font-medium text-gray-800">{room.department_name}</span>
                                                    {room.department_code && <span className="text-xs text-gray-400">({room.department_code})</span>}
                                                </span>
                                                : <span className="text-gray-400 italic text-sm">No Department</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{room.capacity}</td>
                                        <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(room.type)}`}>{room.type}</span></td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1">
                                                {room.has_projector && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">Projector</span>}
                                                {room.has_ac && <span className="px-2 py-0.5 bg-cyan-50 text-cyan-600 rounded text-xs">AC</span>}
                                                {room.has_computers && <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">Computers</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEdit(room)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                                                <button onClick={() => handleDelete(room.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
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
                                <h3 className="text-lg font-bold text-gray-800">{editingClassroom ? 'Edit Classroom' : 'Add Classroom'}</h3>
                                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                        <input className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                        <select
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                            value={form.department_id}
                                            onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                                        >
                                            <option value="">-- No Department --</option>
                                            {departments.map(dept => (
                                                <option key={dept.id} value={dept.id}>
                                                    {dept.name} ({dept.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                                        <input type="number" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                        <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                            <option>Lecture Hall</option>
                                            <option>Lab</option>
                                            <option>Seminar Room</option>
                                            <option>Tutorial Room</option>
                                            <option>Auditorium</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={form.has_projector} onChange={(e) => setForm({ ...form, has_projector: e.target.checked })} className="w-4 h-4 text-[#4D869C] rounded" /><span className="text-sm text-gray-700">Projector</span></label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={form.has_ac} onChange={(e) => setForm({ ...form, has_ac: e.target.checked })} className="w-4 h-4 text-[#4D869C] rounded" /><span className="text-sm text-gray-700">AC</span></label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={form.has_computers} onChange={(e) => setForm({ ...form, has_computers: e.target.checked })} className="w-4 h-4 text-[#4D869C] rounded" /><span className="text-sm text-gray-700">Computers</span></label>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                                    <button type="submit" disabled={submitting} className="px-8 py-2.5 bg-[#4D869C] text-white font-bold rounded-xl disabled:opacity-50">{submitting ? 'Saving...' : editingClassroom ? 'Update' : 'Add'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </div>
        </CollegeAdminLayout>
    );
};

export default ClassroomsPage;
