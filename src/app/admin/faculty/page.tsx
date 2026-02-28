'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Users,
    Plus,
    Edit,
    Trash2,
    X,
    Search,
    RefreshCw,
    Mail,
    Phone,
    Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import CollegeAdminLayout from '@/components/admin/CollegeAdminLayout';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface Department {
    id: string;
    name: string;
    code: string;
}

interface Faculty {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    college_uid: string;
    phone?: string;
    role: string;
    faculty_type?: string;
    department_id: string | null;
    is_active: boolean;
    departments?: Department | null;
}

const FacultyPage: React.FC = () => {
    const { showConfirm } = useConfirm();
    const router = useRouter();
    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'faculty',
        faculty_type: 'general',
        department_id: '',
        is_active: true
    });

    useEffect(() => {
        fetchData();
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

    const fetchData = async () => {
        try {
            setLoading(true);
            const userData = localStorage.getItem('user');
            if (!userData) {
                router.push('/login');
                return;
            }
            const user = JSON.parse(userData);
            const headers = getAuthHeaders();
            if (!headers) return;

            const queryParam = user.college_id ? `?college_id=${user.college_id}` : '';

            const [facultyRes, deptRes] = await Promise.all([
                fetch(`/api/admin/faculty${queryParam}`, { headers }),
                fetch(`/api/admin/departments${queryParam}`, { headers })
            ]);

            if (facultyRes.ok) {
                const data = await facultyRes.json();
                setFaculty(data.faculty || []);
            }
            if (deptRes.ok) {
                const data = await deptRes.json();
                setDepartments(data.departments || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Error loading data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.first_name || !form.last_name || !form.email) {
            toast.error('Name and email are required');
            return;
        }

        setSubmitting(true);
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const url = editingFaculty
                ? `/api/admin/faculty/${editingFaculty.id}`
                : '/api/admin/faculty';

            const res = await fetch(url, {
                method: editingFaculty ? 'PUT' : 'POST',
                headers,
                body: JSON.stringify(form)
            });

            if (res.ok) {
                toast.success(editingFaculty ? 'Faculty updated successfully' : 'Faculty created successfully');
                setShowForm(false);
                setEditingFaculty(null);
                resetForm();
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to save faculty');
            }
        } catch (error) {
            toast.error('Error saving faculty');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setForm({
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            role: 'faculty',
            faculty_type: 'general',
            department_id: '',
            is_active: true
        });
    };

    const handleEdit = (fac: Faculty) => {
        setEditingFaculty(fac);
        setForm({
            first_name: fac.first_name,
            last_name: fac.last_name,
            email: fac.email,
            phone: fac.phone || '',
            role: fac.role,
            faculty_type: fac.faculty_type || 'general',
            department_id: fac.department_id || '',
            is_active: fac.is_active
        });
        setShowForm(true);
    };

    const handleDelete = (fac: Faculty) => {
        showConfirm({
            title: 'Delete Faculty',
            message: `Are you sure you want to delete faculty member "${fac.first_name} ${fac.last_name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    const headers = getAuthHeaders();
                    if (!headers) return;

                    const res = await fetch(`/api/admin/faculty/${fac.id}`, {
                        method: 'DELETE',
                        headers
                    });

                    if (res.ok) {
                        toast.success('Faculty deleted successfully');
                        setFaculty(prev => prev.filter(f => f.id !== fac.id));
                    } else {
                        const err = await res.json();
                        toast.error(err.error || 'Failed to delete faculty');
                    }
                } catch (error) {
                    toast.error('Error deleting faculty');
                }
            }
        });
    };

    const filteredFaculty = faculty.filter(f => {
        const matchesSearch = `${f.first_name} ${f.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = departmentFilter === 'all' || f.department_id === departmentFilter;
        return matchesSearch && matchesDept;
    });

    const getFacultyTypeColor = (type: string) => {
        switch (type) {
            case 'creator': return 'bg-purple-100 text-purple-700';
            case 'publisher': return 'bg-blue-100 text-blue-700';
            case 'guest': return 'bg-orange-100 text-orange-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <CollegeAdminLayout activeTab="faculty">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Faculty</h1>
                        <p className="text-gray-600">Manage faculty members and their roles</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors bg-white"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                        <button
                            onClick={() => { setEditingFaculty(null); resetForm(); setShowForm(true); }}
                            className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                        >
                            <Plus size={18} />
                            Add Faculty
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search faculty..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                            />
                        </div>
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none min-w-[200px]"
                            aria-label="Filter by department"
                        >
                            <option value="all">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#7AB2B2]/10">
                            <Users size={24} className="text-[#7AB2B2]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{filteredFaculty.length}</p>
                            <p className="text-sm text-gray-500">Total Faculty</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-100">
                            <Users size={24} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{filteredFaculty.filter(f => f.is_active).length}</p>
                            <p className="text-sm text-gray-500">Active</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Loading faculty...</div>
                    ) : filteredFaculty.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No faculty found</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredFaculty.map((fac, index) => (
                                    <motion.tr
                                        key={fac.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#4D869C] text-white flex items-center justify-center font-bold">
                                                    {fac.first_name[0]}{fac.last_name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{fac.first_name} {fac.last_name}</p>
                                                    <p className="text-xs text-gray-500">{fac.college_uid}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{fac.email}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                                                {fac.departments?.name || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getFacultyTypeColor(fac.faculty_type || 'general')}`}>
                                                {fac.faculty_type || 'general'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${fac.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {fac.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(fac)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(fac)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Add/Edit Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0">
                                <h3 className="text-lg font-bold text-gray-800">
                                    {editingFaculty ? 'Edit Faculty' : 'Add New Faculty'}
                                </h3>
                                <button onClick={() => { setShowForm(false); setEditingFaculty(null); }} className="text-gray-400 hover:text-gray-600" title="Close">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                                        <input
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                            placeholder="First Name"
                                            value={form.first_name}
                                            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                                        <input
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                            placeholder="Last Name"
                                            value={form.last_name}
                                            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        placeholder="email@example.com"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        placeholder="+91 XXXXXXXXXX"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        value={form.department_id}
                                        onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                                        aria-label="Department"
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Faculty Type</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        value={form.faculty_type}
                                        onChange={(e) => setForm({ ...form, faculty_type: e.target.value })}
                                        aria-label="Faculty type"
                                    >
                                        <option value="general">General</option>
                                        <option value="creator">Creator</option>
                                        <option value="publisher">Publisher</option>
                                        <option value="guest">Guest</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={form.is_active}
                                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                        className="w-4 h-4 text-[#4D869C] rounded focus:ring-[#4D869C]"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setShowForm(false); setEditingFaculty(null); }}
                                        className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-8 py-2.5 bg-[#4D869C] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                                    >
                                        {submitting ? 'Saving...' : editingFaculty ? 'Update' : 'Add Faculty'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </div>
        </CollegeAdminLayout>
    );
};

export default FacultyPage;
