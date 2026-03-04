'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CardLoader } from '@/components/ui/PageLoader';
import {
    Settings,
    Plus,
    Edit,
    Trash2,
    X,
    Search,
    RefreshCw,
    AlertTriangle,
    CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import CollegeAdminLayout from '@/components/admin/CollegeAdminLayout';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface ConstraintRule {
    id: string;
    rule_name: string;
    rule_type: 'HARD' | 'SOFT' | 'PREFERENCE';
    description?: string;
    weight: number;
    rule_parameters: any; // Simplified for now
    is_active: boolean;
}

const ConstraintsPage: React.FC = () => {
    const router = useRouter();
    const { showConfirm } = useConfirm();
    const [constraints, setConstraints] = useState<ConstraintRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingRule, setEditingRule] = useState<ConstraintRule | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        rule_name: '',
        rule_type: 'HARD',
        description: '',
        weight: 5,
        rule_parameters: '{}'
    });

    useEffect(() => {
        fetchConstraints();
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

    const fetchConstraints = async () => {
        try {
            setLoading(true);
            const headers = getAuthHeaders();
            if (!headers) return;

            const res = await fetch('/api/admin/constraints', { headers });

            if (res.ok) {
                const data = await res.json();
                setConstraints(data.data || []);
            } else {
                toast.error('Failed to fetch constraints');
            }
        } catch (error) {
            console.error('Error fetching constraints:', error);
            toast.error('Error loading constraints');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.rule_name) {
            toast.error('Rule name is required');
            return;
        }

        let parsedParams = {};
        try {
            parsedParams = JSON.parse(form.rule_parameters);
        } catch (e) {
            toast.error('Invalid JSON for parameters');
            return;
        }

        setSubmitting(true);
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const payload = {
                ...form,
                rule_parameters: parsedParams
            };

            const url = editingRule
                ? '/api/admin/constraints' // PUT also on same route in our API
                : '/api/admin/constraints';

            const method = editingRule ? 'PUT' : 'POST';

            // If editing, need to include ID in body for PUT
            const body = editingRule ? { ...payload, id: editingRule.id } : payload;

            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success(editingRule ? 'Constraint updated successfully' : 'Constraint created successfully');
                setShowForm(false);
                setEditingRule(null);
                resetForm();
                fetchConstraints();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to save constraint');
            }
        } catch (error) {
            toast.error('Error saving constraint');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setForm({
            rule_name: '',
            rule_type: 'HARD',
            description: '',
            weight: 5,
            rule_parameters: '{}'
        });
    };

    const handleEdit = (rule: ConstraintRule) => {
        setEditingRule(rule);
        setForm({
            rule_name: rule.rule_name,
            rule_type: rule.rule_type as any, // Cast if necessary
            description: rule.description || '',
            weight: rule.weight ? Math.round(Number(rule.weight)) : 5,
            rule_parameters: JSON.stringify(rule.rule_parameters, null, 2)
        });
        setShowForm(true);
    };

    const handleDelete = (constraint: ConstraintRule) => {
        showConfirm({
            title: 'Delete Constraint',
            message: `Are you sure you want to delete the constraint "${constraint.rule_name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    const headers = getAuthHeaders();
                    if (!headers) return;

                    const res = await fetch(`/api/admin/constraints?id=${constraint.id}`, {
                        method: 'DELETE',
                        headers
                    });

                    if (res.ok) {
                        toast.success('Constraint deleted successfully');
                        setConstraints(prev => prev.filter(c => c.id !== constraint.id));
                    } else {
                        const err = await res.json();
                        toast.error(err.error || 'Failed to delete constraint');
                    }
                } catch (error) {
                    toast.error('Error deleting constraint');
                }
            }
        });
    };

    const filteredConstraints = constraints.filter(c =>
        c.rule_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <CollegeAdminLayout activeTab="constraints">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Constraints</h1>
                        <p className="text-gray-600">Manage hard and soft constraints for timetable generation</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchConstraints}
                            className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors bg-white"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                        <button
                            onClick={() => { setEditingRule(null); resetForm(); setShowForm(true); }}
                            className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                        >
                            <Plus size={18} />
                            Add Constraint
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="relative">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search constraints..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-red-100">
                            <AlertTriangle size={24} className="text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{filteredConstraints.filter(c => c.rule_type === 'HARD').length}</p>
                            <p className="text-sm text-gray-500">Hard Constraints</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-100">
                            <Settings size={24} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{filteredConstraints.filter(c => c.rule_type === 'SOFT').length}</p>
                            <p className="text-sm text-gray-500">Soft Constraints</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-100">
                            <CheckCircle size={24} className="text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{filteredConstraints.filter(c => c.rule_type === 'PREFERENCE').length}</p>
                            <p className="text-sm text-gray-500">Preferences</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {loading ? (
                        <CardLoader message="Loading constraints..." subMessage="Fetching constraint rules" />
                    ) : filteredConstraints.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No constraints found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Rule Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Weight</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Description</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredConstraints.map((rule, index) => (
                                        <motion.tr
                                            key={rule.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-[#4D869C]/10">
                                                        <Settings size={18} className="text-[#4D869C]" />
                                                    </div>
                                                    <span className="font-medium text-gray-900">{rule.rule_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${rule.rule_type === 'HARD' ? 'bg-red-100 text-red-700' :
                                                    rule.rule_type === 'SOFT' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-purple-100 text-purple-700'
                                                    }`}>
                                                    {rule.rule_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono bg-gray-100 px-2 py-1 rounded">{rule.weight}</span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{rule.description || '-'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(rule)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(rule)}
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
                        </div>
                    )}
                </div>

                {/* Add/Edit Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-800">
                                    {editingRule ? 'Edit Constraint' : 'Add New Constraint'}
                                </h3>
                                <button onClick={() => { setShowForm(false); setEditingRule(null); }} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        placeholder="e.g. Max Consecutive Classes"
                                        value={form.rule_name}
                                        onChange={(e) => setForm({ ...form, rule_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                        <select
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                            value={form.rule_type}
                                            onChange={(e) => setForm({ ...form, rule_type: e.target.value as any })}
                                        >
                                            <option value="HARD">HARD</option>
                                            <option value="SOFT">SOFT</option>
                                            <option value="PREFERENCE">PREFERENCE</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Weight
                                            <span className="ml-2 text-[#4D869C] font-bold">{form.weight}/10</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            step="1"
                                            className="w-full accent-[#4D869C] cursor-pointer"
                                            value={form.weight}
                                            onChange={(e) => setForm({ ...form, weight: parseInt(e.target.value) })}
                                        />
                                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                                            <span>1 (Low)</span>
                                            <span>10 (High)</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none resize-none h-16"
                                        placeholder="Description of the rule..."
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Parameters (JSON)</label>
                                    <textarea
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none resize-none h-24 font-mono text-sm"
                                        placeholder='{"max": 2}'
                                        value={form.rule_parameters}
                                        onChange={(e) => setForm({ ...form, rule_parameters: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Enter valid JSON configuration for this rule.</p>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setShowForm(false); setEditingRule(null); }}
                                        className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-8 py-2.5 bg-[#4D869C] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                                    >
                                        {submitting ? 'Saving...' : editingRule ? 'Update' : 'Create Constraint'}
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

export default ConstraintsPage;
