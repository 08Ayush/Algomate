'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Building2,
    Plus,
    Edit,
    Trash2,
    Search,
    X,
    Check,
    ChevronDown,
    AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';

interface College {
    id: string;
    name: string;
    code: string;
    email?: string;
    phone: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    website?: string;
    academicYear: string;
    calendar: string;
    departments: number;
    users: number;
    status: string;
}

interface NewCollege {
    name: string;
    code: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    website: string;
    academicYear: string;
    calendar: string;
    status: string;
    country: string;
}

const CollegesPage: React.FC = () => {
    const [colleges, setColleges] = useState<College[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingCollege, setEditingCollege] = useState<College | null>(null);
    const [deletingCollege, setDeletingCollege] = useState<College | null>(null);

    const [newCollege, setNewCollege] = useState<NewCollege>({
        name: '',
        code: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        website: '',
        academicYear: '2025-26',
        calendar: 'semester',
        status: 'Active',
        country: 'India'
    });

    useEffect(() => {
        fetchColleges();
    }, []);

    const fetchColleges = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/super-admin/colleges');
            if (res.ok) {
                const data = await res.json();
                const mapped = (data.colleges || []).map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    code: c.code,
                    email: c.email || '',
                    phone: c.phone || '',
                    address: c.address || '',
                    city: c.city || '',
                    state: c.state || '',
                    pincode: c.pincode || '',
                    website: c.website || '',
                    academicYear: c.academic_year || '2025-26',
                    calendar: c.semester_system || 'semester',
                    departments: c._count?.departments || 0,
                    users: c._count?.users || 0,
                    status: c.is_active ? 'Active' : 'Inactive'
                }));
                setColleges(mapped);
            }
        } catch (error) {
            toast.error('Failed to fetch colleges');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCollege = async () => {
        if (!newCollege.name || !newCollege.code) {
            toast.error('Name and Code are required');
            return;
        }
        try {
            const res = await fetch('/api/super-admin/colleges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newCollege.name,
                    code: newCollege.code,
                    email: newCollege.email,
                    phone: newCollege.phone,
                    address: newCollege.address,
                    city: newCollege.city,
                    state: newCollege.state,
                    country: newCollege.country,
                    pincode: newCollege.pincode,
                    website: newCollege.website,
                    academic_year: newCollege.academicYear,
                    semester_system: newCollege.calendar,
                    is_active: newCollege.status === 'Active'
                })
            });

            if (res.ok) {
                toast.success('College added successfully');
                setShowAddModal(false);
                resetForm();
                fetchColleges();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to add college');
            }
        } catch (e) {
            toast.error('Error adding college');
        }
    };

    const handleEditCollege = async (college: College) => {
        setEditingCollege(college);
        setNewCollege({
            name: college.name,
            code: college.code,
            email: college.email || '',
            phone: college.phone,
            address: college.address || '',
            city: college.city || '',
            state: college.state || '',
            pincode: college.pincode || '',
            website: college.website || '',
            academicYear: college.academicYear,
            calendar: college.calendar,
            status: college.status,
            country: 'India'
        });
        setShowEditModal(true);

        // Fetch full details
        try {
            const res = await fetch(`/api/super-admin/colleges/${college.id}`);
            if (res.ok) {
                const data = await res.json();
                const full = data.college;
                setNewCollege({
                    name: full.name,
                    code: full.code,
                    email: full.email || '',
                    phone: full.phone || '',
                    address: full.address || '',
                    city: full.city || '',
                    state: full.state || '',
                    pincode: full.pincode || '',
                    website: full.website || '',
                    academicYear: full.academic_year || '2025-26',
                    calendar: full.semester_system || 'semester',
                    status: full.is_active ? 'Active' : 'Inactive',
                    country: full.country || 'India'
                });
            }
        } catch (e) {
            console.error('Error fetching college details');
        }
    };

    const handleUpdateCollege = async () => {
        if (!editingCollege) return;
        try {
            const res = await fetch(`/api/super-admin/colleges/${editingCollege.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newCollege.name,
                    code: newCollege.code,
                    email: newCollege.email,
                    phone: newCollege.phone,
                    address: newCollege.address,
                    city: newCollege.city,
                    state: newCollege.state,
                    country: newCollege.country,
                    pincode: newCollege.pincode,
                    website: newCollege.website,
                    academic_year: newCollege.academicYear,
                    semester_system: newCollege.calendar,
                    is_active: newCollege.status === 'Active'
                })
            });

            if (res.ok) {
                toast.success('College updated successfully');
                setShowEditModal(false);
                resetForm();
                fetchColleges();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to update college');
            }
        } catch (e) {
            toast.error('Error updating college');
        }
    };

    const handleDeleteCollege = async () => {
        if (!deletingCollege) return;
        try {
            const res = await fetch(`/api/super-admin/colleges/${deletingCollege.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('College deleted successfully');
                setShowDeleteModal(false);
                setDeletingCollege(null);
                fetchColleges();
            } else {
                toast.error('Failed to delete college');
            }
        } catch (e) {
            toast.error('Error deleting college');
        }
    };

    const openDeleteModal = (college: College) => {
        setDeletingCollege(college);
        setShowDeleteModal(true);
    };

    const resetForm = () => {
        setNewCollege({
            name: '',
            code: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            pincode: '',
            website: '',
            academicYear: '2025-26',
            calendar: 'semester',
            status: 'Active',
            country: 'India'
        });
        setEditingCollege(null);
    };

    const filteredColleges = colleges.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <SuperAdminLayout activeTab="colleges">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Manage Colleges</h1>
                        <p className="text-gray-600">Add, edit, and manage educational institutions</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                        <Plus size={16} />
                        Add College
                    </button>
                </div>

                {/* Search */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search colleges..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Colleges Table */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">College</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Location</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : filteredColleges.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No colleges found</td>
                                </tr>
                            ) : (
                                filteredColleges.map((college) => (
                                    <tr key={college.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-[#4D869C]/10 flex items-center justify-center">
                                                    <Building2 size={20} className="text-[#4D869C]" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{college.name}</p>
                                                    <p className="text-sm text-gray-500">{college.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{college.code}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {college.city ? `${college.city}, ${college.state}` : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${college.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {college.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditCollege(college)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(college)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Add/Edit Modal */}
                {(showAddModal || showEditModal) && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0">
                                <h3 className="text-lg font-bold text-gray-800">
                                    {showEditModal ? 'Edit College' : 'Add New College'}
                                </h3>
                                <button onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 grid grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">College Name *</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        placeholder="Enter college name"
                                        value={newCollege.name}
                                        onChange={(e) => setNewCollege({ ...newCollege, name: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">College Code *</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        placeholder="e.g., ABC123"
                                        value={newCollege.code}
                                        onChange={(e) => setNewCollege({ ...newCollege, code: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <textarea
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none resize-none h-20"
                                        placeholder="Street Address"
                                        value={newCollege.address}
                                        onChange={(e) => setNewCollege({ ...newCollege, address: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        value={newCollege.city}
                                        onChange={(e) => setNewCollege({ ...newCollege, city: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        value={newCollege.state}
                                        onChange={(e) => setNewCollege({ ...newCollege, state: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        value={newCollege.pincode}
                                        onChange={(e) => setNewCollege({ ...newCollege, pincode: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        placeholder="+91..."
                                        value={newCollege.phone}
                                        onChange={(e) => setNewCollege({ ...newCollege, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        value={newCollege.email}
                                        onChange={(e) => setNewCollege({ ...newCollege, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        value={newCollege.website}
                                        onChange={(e) => setNewCollege({ ...newCollege, website: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        value={newCollege.academicYear}
                                        onChange={(e) => setNewCollege({ ...newCollege, academicYear: e.target.value })}
                                    >
                                        <option value="2025-26">2025-26</option>
                                        <option value="2024-25">2024-25</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester System</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        value={newCollege.calendar}
                                        onChange={(e) => setNewCollege({ ...newCollege, calendar: e.target.value })}
                                    >
                                        <option value="semester">Semester</option>
                                        <option value="trimester">Trimester</option>
                                        <option value="annual">Annual</option>
                                    </select>
                                </div>
                                <div className="col-span-2 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 text-[#4D869C] rounded"
                                        checked={newCollege.status === 'Active'}
                                        onChange={(e) => setNewCollege({ ...newCollege, status: e.target.checked ? 'Active' : 'Inactive' })}
                                    />
                                    <span className="text-sm font-medium text-gray-700">Active</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                                <button
                                    onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                                    className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={showEditModal ? handleUpdateCollege : handleAddCollege}
                                    className="px-8 py-2.5 bg-[#4D869C] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                                >
                                    {showEditModal ? 'Update' : 'Add College'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && deletingCollege && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl p-10"
                        >
                            <div className="flex items-start gap-6">
                                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="text-yellow-600" size={32} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Delete College</h3>
                                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                        Are you sure you want to delete "{deletingCollege.name}"? This action cannot be undone and will remove all associated data.
                                    </p>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => {
                                                setShowDeleteModal(false);
                                                setDeletingCollege(null);
                                            }}
                                            className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDeleteCollege}
                                            className="px-6 py-2.5 bg-[#4D869C] text-white font-medium rounded-lg hover:bg-[#3d6b7d] transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </SuperAdminLayout>
    );
};

export default CollegesPage;
