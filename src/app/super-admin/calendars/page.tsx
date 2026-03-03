'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar,
    Plus,
    Edit,
    Trash2,
    X,
    Clock,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface CalendarType {
    id: string;
    name: string;
    description: string;
    calendar_type: string;
    duration_months: number;
    terms_per_year: number;
    is_default: boolean;
    is_active: boolean;
    used_by: number;
    created_at: string;
}

const CalendarsPage: React.FC = () => {
    const { showConfirm } = useConfirm();
    const [calendars, setCalendars] = useState<CalendarType[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCalendar, setEditingCalendar] = useState<CalendarType | null>(null);

    const [newCalendar, setNewCalendar] = useState({
        name: '',
        description: '',
        calendar_type: 'semester',
        duration_months: 6,
        terms_per_year: 2,
        is_default: false
    });

    useEffect(() => {
        fetchCalendars();
    }, []);

    const getAuthHeaders = (): Record<string, string> => {
        if (typeof window === 'undefined') return {};
        const userData = localStorage.getItem('user');
        if (!userData) return {};
        const authToken = Buffer.from(userData).toString('base64');
        return { 'Authorization': `Bearer ${authToken}` };
    };

    const fetchCalendars = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/super-admin/calendars', { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setCalendars(data.calendars || []);
            } else {
                toast.error('Failed to fetch calendars');
            }
        } catch (error) {
            console.error('Error fetching calendars:', error);
            toast.error('Error loading calendars');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCalendar = async () => {
        if (!newCalendar.name) {
            toast.error('Name is required');
            return;
        }

        try {
            const res = await fetch('/api/super-admin/calendars', {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(newCalendar)
            });

            if (res.ok) {
                toast.success('Calendar created successfully');
                setShowAddModal(false);
                resetForm();
                fetchCalendars();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to create calendar');
            }
        } catch (error) {
            toast.error('Error creating calendar');
        }
    };

    const handleEditCalendar = (calendar: CalendarType) => {
        setEditingCalendar(calendar);
        setNewCalendar({
            name: calendar.name,
            description: calendar.description || '',
            calendar_type: calendar.calendar_type,
            duration_months: calendar.duration_months,
            terms_per_year: calendar.terms_per_year,
            is_default: calendar.is_default
        });
        setShowEditModal(true);
    };

    const handleUpdateCalendar = async () => {
        if (!editingCalendar || !newCalendar.name) return;

        try {
            const res = await fetch(`/api/super-admin/calendars/${editingCalendar.id}`, {
                method: 'PATCH',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(newCalendar)
            });

            if (res.ok) {
                toast.success('Calendar updated successfully');
                setShowEditModal(false);
                resetForm();
                fetchCalendars();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to update calendar');
            }
        } catch (error) {
            toast.error('Error updating calendar');
        }
    };
    
    const handleDeleteCalendar = (id: string) => {
        const calendar = calendars.find(c => c.id === id);
        if (calendar && calendar.used_by > 0) {
            toast.error('Cannot delete calendar in use by colleges');
            return;
        }
        
        showConfirm({
            title: 'Delete Calendar',
            message: 'Are you sure you want to delete this calendar? This action cannot be undone.',
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/super-admin/calendars/${id}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });

                    if (res.ok) {
                        toast.success('Calendar deleted successfully');
                        fetchCalendars();
                    } else {
                        const err = await res.json();
                        toast.error(err.error || 'Failed to delete calendar');
                    }
                } catch (error) {
                    toast.error('Error deleting calendar');
                }
            }
        });
    };

    const resetForm = () => {
        setNewCalendar({
            name: '',
            description: '',
            calendar_type: 'semester',
            duration_months: 6,
            terms_per_year: 2,
            is_default: false
        });
        setEditingCalendar(null);
    };

    const getDurationLabel = (months: number, terms: number) => {
        if (terms === 1) return `${months} months`;
        return `${months} months each`;
    };

    const getTypeLabel = (type: string) => {
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    return (
        <SuperAdminLayout activeTab="calendars">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Academic Calendars</h1>
                        <p className="text-gray-600">Manage academic year calendar configurations</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchCalendars}
                            className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            <RefreshCw size={18} />
                            Refresh
                        </button>
                        <button
                            onClick={() => { resetForm(); setShowAddModal(true); }}
                            className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                        >
                            <Plus size={16} />
                            Add Calendar
                        </button>
                    </div>
                </div>

                {/* Calendars Grid */}
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading calendars...</div>
                ) : calendars.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No calendars found. Add your first calendar.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {calendars.map((calendar, index) => (
                            <motion.div
                                key={calendar.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-xl bg-[#48BB78]/10">
                                        <Calendar size={24} className="text-[#48BB78]" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {calendar.is_default && (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Default</span>
                                        )}
                                        <button
                                            onClick={() => handleEditCalendar(calendar)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCalendar(calendar.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            disabled={calendar.used_by > 0}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-2">{calendar.name}</h3>
                                <p className="text-sm text-gray-600 mb-4">{calendar.description || 'No description'}</p>

                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-1 text-gray-500">
                                        <Clock size={14} /> {getDurationLabel(calendar.duration_months, calendar.terms_per_year)}
                                    </span>
                                    <span className="px-2 py-1 bg-[#48BB78]/10 text-[#48BB78] rounded-full text-xs font-bold">
                                        {calendar.used_by || 0} colleges
                                    </span>
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                        {getTypeLabel(calendar.calendar_type)} • {calendar.terms_per_year} terms/year
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Add/Edit Modal */}
                {(showAddModal || showEditModal) && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-800">
                                    {showEditModal ? 'Edit Calendar' : 'Add New Calendar'}
                                </h3>
                                <button onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        placeholder="Calendar Name"
                                        value={newCalendar.name}
                                        onChange={(e) => setNewCalendar({ ...newCalendar, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none resize-none h-20"
                                        placeholder="Describe the calendar..."
                                        value={newCalendar.description}
                                        onChange={(e) => setNewCalendar({ ...newCalendar, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Calendar Type</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        value={newCalendar.calendar_type}
                                        onChange={(e) => setNewCalendar({ ...newCalendar, calendar_type: e.target.value })}
                                    >
                                        <option value="semester">Semester</option>
                                        <option value="trimester">Trimester</option>
                                        <option value="quarter">Quarter</option>
                                        <option value="annual">Annual</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (months)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="12"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                            value={newCalendar.duration_months}
                                            onChange={(e) => setNewCalendar({ ...newCalendar, duration_months: parseInt(e.target.value) || 6 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Terms per year</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="4"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                                            value={newCalendar.terms_per_year}
                                            onChange={(e) => setNewCalendar({ ...newCalendar, terms_per_year: parseInt(e.target.value) || 2 })}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="is_default"
                                        checked={newCalendar.is_default}
                                        onChange={(e) => setNewCalendar({ ...newCalendar, is_default: e.target.checked })}
                                        className="w-4 h-4 text-[#4D869C] rounded focus:ring-[#4D869C]"
                                    />
                                    <label htmlFor="is_default" className="text-sm font-medium text-gray-700">Set as default calendar</label>
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
                                    onClick={showEditModal ? handleUpdateCalendar : handleAddCalendar}
                                    className="px-8 py-2.5 bg-[#4D869C] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                                >
                                    {showEditModal ? 'Update' : 'Add Calendar'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </SuperAdminLayout>
    );
};

export default CalendarsPage;
