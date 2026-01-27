'use client';

import React, { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Calendar, Clock, MapPin, Users, Save, ArrowLeft, Loader2,
    FileText, Tag, AlertCircle, CheckCircle, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';

interface EventFormData {
    title: string;
    description: string;
    event_type: string;
    department_id: string;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    venue: string;
    expected_participants: number | null;
    priority_level: number;
    is_public: boolean;
    registration_required: boolean;
    max_registrations: number | null;
    status: string;
}

interface Department {
    id: string;
    name: string;
    code: string;
}

const EVENT_TYPES = [
    { value: 'workshop', label: 'Workshop' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'conference', label: 'Conference' },
    { value: 'cultural', label: 'Cultural' },
    { value: 'sports', label: 'Sports' },
    { value: 'technical', label: 'Technical' },
    { value: 'orientation', label: 'Orientation' },
    { value: 'examination', label: 'Examination' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'other', label: 'Other' }
];

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-700' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
    { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-700' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-700' }
];

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const eventId = resolvedParams.id;
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [creatorName, setCreatorName] = useState('');
    const [formData, setFormData] = useState<EventFormData>({
        title: '',
        description: '',
        event_type: 'workshop',
        department_id: '',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        venue: '',
        expected_participants: null,
        priority_level: 2,
        is_public: false,
        registration_required: false,
        max_registrations: null,
        status: 'pending'
    });

    const getAuthHeaders = () => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return null;
        }
        return {
            'Authorization': `Bearer ${Buffer.from(userData).toString('base64')}`,
            'Content-Type': 'application/json'
        };
    };

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return;
        }
        fetchEventData();
        fetchDepartments();
    }, [eventId]);

    const fetchDepartments = async () => {
        try {
            const headers = getAuthHeaders();
            if (!headers) return;
            const res = await fetch('/api/departments', { headers });
            if (res.ok) {
                const data = await res.json();
                setDepartments(data.departments || data.data || []);
            }
        } catch (err) {
            console.error('Error fetching departments:', err);
        }
    };

    const fetchEventData = async () => {
        try {
            setLoading(true);
            const headers = getAuthHeaders();
            if (!headers) return;

            const res = await fetch(`/api/events?id=${eventId}`, { headers });
            if (!res.ok) {
                toast.error('Failed to load event');
                router.push('/faculty/events');
                return;
            }

            const data = await res.json();
            const event = data.data;

            if (!event) {
                toast.error('Event not found');
                router.push('/faculty/events');
                return;
            }

            // Format dates for input fields (YYYY-MM-DD)
            const formatDate = (dateStr: string) => {
                if (!dateStr) return '';
                return dateStr.split('T')[0];
            };

            // Format time (HH:MM)
            const formatTime = (timeStr: string) => {
                if (!timeStr) return '';
                return timeStr.slice(0, 5);
            };

            setCreatorName(event.created_by_name || 'Unknown');
            setFormData({
                title: event.title || '',
                description: event.description || '',
                event_type: event.event_type || 'workshop',
                department_id: event.department_id || '',
                start_date: formatDate(event.start_date),
                end_date: formatDate(event.end_date),
                start_time: formatTime(event.start_time),
                end_time: formatTime(event.end_time),
                venue: event.venue || '',
                expected_participants: event.expected_participants || null,
                priority_level: event.priority_level || 2,
                is_public: event.is_public || false,
                registration_required: event.registration_required || false,
                max_registrations: event.max_registrations || null,
                status: event.status || 'pending'
            });
        } catch (err) {
            console.error('Error fetching event:', err);
            toast.error('Error loading event');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (type === 'number') {
            setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : null }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.start_date || !formData.department_id) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setSaving(true);
            const headers = getAuthHeaders();
            if (!headers) return;

            const res = await fetch('/api/events', {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    id: eventId,
                    title: formData.title,
                    description: formData.description,
                    event_type: formData.event_type,
                    department_id: formData.department_id,
                    start_date: formData.start_date,
                    end_date: formData.end_date || formData.start_date,
                    start_time: formData.start_time,
                    end_time: formData.end_time,
                    venue: formData.venue || 'TBA',
                    expected_participants: formData.expected_participants,
                    priority_level: formData.priority_level,
                    is_public: formData.is_public,
                    registration_required: formData.registration_required,
                    max_registrations: formData.max_registrations,
                    status: formData.status
                })
            });

            if (res.ok) {
                toast.success('Event updated successfully!');
                router.push('/faculty/events');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to update event');
            }
        } catch (err) {
            console.error('Error updating event:', err);
            toast.error('Error updating event');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <FacultyCreatorLayout activeTab="events">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <Loader2 size={48} className="animate-spin text-[#4D869C] mx-auto mb-4" />
                        <p className="text-gray-500">Loading event...</p>
                    </div>
                </div>
            </FacultyCreatorLayout>
        );
    }

    return (
        <FacultyCreatorLayout activeTab="events">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/faculty/events')}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <ArrowLeft size={24} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
                        <p className="text-gray-500">Update event details and settings</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-lg p-6"
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText size={20} className="text-[#4D869C]" />
                            Basic Information
                        </h2>

                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Event Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="Enter event title"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none"
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Enter event description"
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none resize-none"
                                />
                            </div>

                            {/* Event Type & Status */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Tag size={14} className="inline mr-1" />
                                        Event Type
                                    </label>
                                    <select
                                        name="event_type"
                                        value={formData.event_type}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none"
                                    >
                                        {EVENT_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <CheckCircle size={14} className="inline mr-1" />
                                        Status
                                    </label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none"
                                    >
                                        {STATUS_OPTIONS.map(status => (
                                            <option key={status.value} value={status.value}>{status.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Department & Created By */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Building2 size={14} className="inline mr-1" />
                                        Department
                                    </label>
                                    <select
                                        name="department_id"
                                        value={formData.department_id}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none"
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Users size={14} className="inline mr-1" />
                                        Created By
                                    </label>
                                    <input
                                        type="text"
                                        value={creatorName}
                                        readOnly
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Date & Time */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl shadow-lg p-6"
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Calendar size={20} className="text-[#4D869C]" />
                            Date & Time
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    name="end_date"
                                    value={formData.end_date}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Clock size={14} className="inline mr-1" />
                                    Start Time
                                </label>
                                <input
                                    type="time"
                                    name="start_time"
                                    value={formData.start_time}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Clock size={14} className="inline mr-1" />
                                    End Time
                                </label>
                                <input
                                    type="time"
                                    name="end_time"
                                    value={formData.end_time}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none"
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Location & Participants */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl shadow-lg p-6"
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <MapPin size={20} className="text-[#4D869C]" />
                            Location & Participants
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Venue / Location
                                </label>
                                <input
                                    type="text"
                                    name="venue"
                                    value={formData.venue}
                                    onChange={handleInputChange}
                                    placeholder="Enter venue or location"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Users size={14} className="inline mr-1" />
                                        Expected Participants
                                    </label>
                                    <input
                                        type="number"
                                        name="expected_participants"
                                        value={formData.expected_participants || ''}
                                        onChange={handleInputChange}
                                        placeholder="Number of participants"
                                        min="0"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <AlertCircle size={14} className="inline mr-1" />
                                        Priority Level
                                    </label>
                                    <select
                                        name="priority_level"
                                        value={formData.priority_level}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none"
                                    >
                                        <option value={1}>High Priority</option>
                                        <option value={2}>Medium Priority</option>
                                        <option value={3}>Low Priority</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Registration Settings */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl shadow-lg p-6"
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Users size={20} className="text-[#4D869C]" />
                            Registration Settings
                        </h2>

                        <div className="space-y-4">
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="is_public"
                                        checked={formData.is_public}
                                        onChange={handleInputChange}
                                        className="w-5 h-5 rounded border-gray-300 text-[#4D869C] focus:ring-[#4D869C]"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Public Event</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="registration_required"
                                        checked={formData.registration_required}
                                        onChange={handleInputChange}
                                        className="w-5 h-5 rounded border-gray-300 text-[#4D869C] focus:ring-[#4D869C]"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Registration Required</span>
                                </label>
                            </div>

                            {formData.registration_required && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Max Registrations
                                        </label>
                                        <input
                                            type="number"
                                            name="max_registrations"
                                            value={formData.max_registrations || ''}
                                            onChange={handleInputChange}
                                            placeholder="Maximum registrations allowed"
                                            min="0"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex justify-end gap-4"
                    >
                        <button
                            type="button"
                            onClick={() => router.push('/faculty/events')}
                            className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-3 bg-[#4D869C] text-white rounded-xl font-medium hover:bg-[#3d6b7c] transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </motion.div>
                </form>
            </div>
        </FacultyCreatorLayout>
    );
}
