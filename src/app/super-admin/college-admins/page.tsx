'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    Plus,
    Edit,
    Trash2,
    Search,
    X,
    ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';

interface CollegeAdmin {
    id: string;
    name: string;
    email: string;
    college: string;
    collegeId?: string;
    phone: string;
    status: string;
    collegeUid: string;
}

interface College {
    id: string;
    name: string;
}

interface NewAdmin {
    name: string;
    email: string;
    college: string;
    collegeId: string;
    phone: string;
    status: string;
    collegeUid: string;
    password: string;
}

const CollegeAdminsPage: React.FC = () => {
    const [admins, setAdmins] = useState<CollegeAdmin[]>([]);
    const [colleges, setColleges] = useState<College[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<CollegeAdmin | null>(null);

    const [newAdmin, setNewAdmin] = useState<NewAdmin>({
        name: '',
        email: '',
        college: '',
        collegeId: '',
        phone: '',
        status: 'Active',
        collegeUid: '',
        password: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [adminRes, collegeRes] = await Promise.all([
                fetch('/api/super-admin/college-admins'),
                fetch('/api/super-admin/colleges')
            ]);

            if (adminRes.ok) {
                const data = await adminRes.json();
                const mapped = (data.admins || []).map((a: any) => ({
                    id: a.id,
                    name: `${a.first_name} ${a.last_name}`,
                    email: a.email,
                    college: a.college?.name || 'Unknown',
                    collegeId: a.college_id,
                    phone: a.phone || '',
                    status: a.is_active ? 'Active' : 'Inactive',
                    collegeUid: a.college_uid || ''
                }));
                setAdmins(mapped);
            }

            if (collegeRes.ok) {
                const data = await collegeRes.json();
                setColleges((data.colleges || []).map((c: any) => ({ id: c.id, name: c.name })));
            }
        } catch (error) {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAdmin = async () => {
        if (!newAdmin.name || !newAdmin.email || !newAdmin.collegeId || !newAdmin.password || !newAdmin.collegeUid) {
            toast.error('Please fill all required fields');
            return;
        }

        const nameParts = newAdmin.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        try {
            const res = await fetch('/api/super-admin/college-admins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    email: newAdmin.email,
                    phone: newAdmin.phone,
                    college_id: newAdmin.collegeId,
                    college_uid: newAdmin.collegeUid,
                    password: newAdmin.password,
                    is_active: newAdmin.status === 'Active'
                })
            });

            if (res.ok) {
                toast.success('Admin added successfully');
                setShowAddModal(false);
                resetForm();
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to add admin');
            }
        } catch (e) {
            toast.error('Error adding admin');
        }
    };

    const handleEditAdmin = (admin: CollegeAdmin) => {
        setEditingAdmin(admin);
        setNewAdmin({
            name: admin.name,
            email: admin.email,
            college: admin.college,
            collegeId: admin.collegeId || '',
            phone: admin.phone,
            status: admin.status,
            collegeUid: admin.collegeUid,
            password: ''
        });
        setShowEditModal(true);
    };

    const handleUpdateAdmin = async () => {
        if (!editingAdmin) return;

        const collegeId = newAdmin.collegeId || colleges.find(c => c.name === newAdmin.college)?.id;
        if (!collegeId) {
            toast.error('Invalid college selected');
            return;
        }

        const nameParts = newAdmin.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        try {
            const payload: any = {
                first_name: firstName,
                last_name: lastName,
                email: newAdmin.email,
                phone: newAdmin.phone,
                college_id: collegeId,
                college_uid: newAdmin.collegeUid,
                is_active: newAdmin.status === 'Active'
            };

            if (newAdmin.password) {
                payload.password = newAdmin.password;
            }

            const res = await fetch(`/api/super-admin/college-admins/${editingAdmin.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success('Admin updated successfully');
                setShowEditModal(false);
                resetForm();
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to update admin');
            }
        } catch (e) {
            toast.error('Error updating admin');
        }
    };

    const handleDeleteAdmin = async (id: string) => {
        if (!confirm('Are you sure you want to delete this admin?')) return;
        try {
            const res = await fetch(`/api/super-admin/college-admins/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Admin deleted successfully');
                fetchData();
            } else {
                toast.error('Failed to delete admin');
            }
        } catch (e) {
            toast.error('Error deleting admin');
        }
    };

    const resetForm = () => {
        setNewAdmin({
            name: '',
            email: '',
            college: '',
            collegeId: '',
            phone: '',
            status: 'Active',
            collegeUid: '',
            password: ''
        });
        setEditingAdmin(null);
    };

    const filteredAdmins = admins.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <SuperAdminLayout activeTab="collegeAdmins">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">College Admins</h1>
                        <p className="text-gray-600">Manage college administrators</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                        <Plus size={16} />
                        Add Admin
                    </button>
                </div>

                {/* Search */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="relative">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search admins..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                        />
                    </div>
                </div>

                {/* Admins Table */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Admin</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">College UID</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">College</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredAdmins.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No admins found</td></tr>
                            ) : (
                                filteredAdmins.map((admin) => (
                                    <tr key={admin.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#7AB2B2]/20 flex items-center justify-center text-[#4D869C] font-bold">
                                                    {admin.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{admin.name}</p>
                                                    <p className="text-sm text-gray-500">{admin.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{admin.collegeUid}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{admin.college}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${admin.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {admin.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleEditAdmin(admin)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteAdmin(admin.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0">
                                <h3 className="text-lg font-bold text-gray-800">{showEditModal ? 'Edit Admin' : 'Add New Admin'}</h3>
                                <button onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            </div>

                            <div className="p-6 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        placeholder="John Doe" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        placeholder="+91..." value={newAdmin.phone} onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">College *</label>
                                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        value={newAdmin.collegeId} onChange={(e) => {
                                            const college = colleges.find(c => c.id === e.target.value);
                                            setNewAdmin({ ...newAdmin, collegeId: e.target.value, college: college?.name || '' });
                                        }}>
                                        <option value="">Select College</option>
                                        {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">College UID *</label>
                                    <input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none font-mono"
                                        placeholder="ADM-2025-001" value={newAdmin.collegeUid} onChange={(e) => setNewAdmin({ ...newAdmin, collegeUid: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{showEditModal ? 'Password (leave blank to keep)' : 'Password *'}</label>
                                    <input type="password" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        placeholder={showEditModal ? 'New password (optional)' : 'Password'} value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} />
                                </div>
                                <div className="col-span-2 flex items-center gap-2">
                                    <input type="checkbox" className="w-5 h-5 text-[#4D869C] rounded"
                                        checked={newAdmin.status === 'Active'} onChange={(e) => setNewAdmin({ ...newAdmin, status: e.target.checked ? 'Active' : 'Inactive' })} />
                                    <span className="text-sm font-medium text-gray-700">Active</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                                <button onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                                    className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                                <button onClick={showEditModal ? handleUpdateAdmin : handleAddAdmin}
                                    className="px-8 py-2.5 bg-[#4D869C] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all">
                                    {showEditModal ? 'Update' : 'Add Admin'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </SuperAdminLayout>
    );
};

export default CollegeAdminsPage;
