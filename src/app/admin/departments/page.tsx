'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CardLoader } from '@/components/ui/PageLoader';
import {
    Building2,
    Plus,
    Edit,
    Trash2,
    X,
    Search,
    RefreshCw,
    Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import CollegeAdminLayout from '@/components/admin/CollegeAdminLayout';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface Department {
    id: string;
    name: string;
    code: string;
    description?: string;
    head_of_department?: string;
    created_at: string;
    college_id?: string;
}

const DepartmentsPage: React.FC = () => {
    const { showConfirm } = useConfirm();
    const router = useRouter();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        name: '',
        code: '',
        description: ''
    });

    useEffect(() => {
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
            const res = await fetch(`/api/admin/departments${queryParam}`, { headers });

            if (res.ok) {
                const data = await res.json();
                setDepartments(data.departments || []);
            } else {
                toast.error('Failed to fetch departments');
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
            toast.error('Error loading departments');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.code) {
            toast.error('Name and code are required');
            return;
        }

        setSubmitting(true);
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const url = editingDept
                ? `/api/admin/departments/${editingDept.id}`
                : '/api/admin/departments';

            const res = await fetch(url, {
                method: editingDept ? 'PUT' : 'POST',
                headers,
                body: JSON.stringify(form)
            });

            if (res.ok) {
                toast.success(editingDept ? 'Department updated successfully' : 'Department created successfully');
                setShowForm(false);
                setEditingDept(null);
                setForm({ name: '', code: '', description: '' });
                fetchDepartments();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to save department');
            }
        } catch (error) {
            toast.error('Error saving department');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (dept: Department) => {
        setEditingDept(dept);
        setForm({
            name: dept.name,
            code: dept.code,
            description: dept.description || ''
        });
        setShowForm(true);
    };

    const handleDelete = (dept: Department) => {
        showConfirm({
            title: 'Delete Department',
            message: `Are you sure you want to delete department "${dept.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    const headers = getAuthHeaders();
                    if (!headers) return;

                    const res = await fetch(`/api/admin/departments/${dept.id}`, {
                        method: 'DELETE',
                        headers
                    });

                    if (res.ok) {
                        toast.success('Department deleted successfully');
                        setDepartments(prev => prev.filter(d => d.id !== dept.id));
                    } else {
                        const err = await res.json();
                        toast.error(err.error || 'Failed to delete department');
                    }
                } catch (error) {
                    toast.error('Error deleting department');
                }
            }
        });
    };

    const filteredDepartments = departments.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <CollegeAdminLayout activeTab="departments">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Departments</h1>
                        <p className="text-gray-600">Manage college departments and their details</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchDepartments}
                            className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors bg-white"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                        <button
                            onClick={() => { setEditingDept(null); setForm({ name: '', code: '', description: '' }); setShowForm(true); }}
                            className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                        >
                            <Plus size={18} />
                            Add Department
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="relative">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search departments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[#4D869C]/10">
                            <Building2 size={24} className="text-[#4D869C]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{filteredDepartments.length}</p>
                            <p className="text-sm text-gray-500">Total Departments</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {loading ? (
                        <CardLoader message="Loading departments..." subMessage="Fetching department list" />
                    ) : filteredDepartments.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No departments found</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Description</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredDepartments.map((dept, index) => (
                                    <motion.tr
                                        key={dept.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-[#4D869C]/10">
                                                    <Building2 size={18} className="text-[#4D869C]" />
                                                </div>
                                                <span className="font-medium text-gray-900">{dept.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">{dept.code}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{dept.description || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(dept)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(dept)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-800">
                                    {editingDept ? 'Edit Department' : 'Add New Department'}
                                </h3>
                                <button onClick={() => { setShowForm(false); setEditingDept(null); }} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        placeholder="Department Name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        placeholder="DEPT-CODE"
                                        value={form.code}
                                        onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none resize-none h-20"
                                        placeholder="Department description..."
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setShowForm(false); setEditingDept(null); }}
                                        className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-8 py-2.5 bg-[#4D869C] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                                    >
                                        {submitting ? 'Saving...' : editingDept ? 'Update' : 'Add Department'}
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

export default DepartmentsPage;
