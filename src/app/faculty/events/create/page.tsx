'use client';

import React, { useState, useEffect } from 'react';
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
    notify_students: boolean;
    notify_faculty: boolean;
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

export default function CreateEventPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
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
        is_public: true,
        registration_required: false,
        max_registrations: null,
        status: 'pending', // Default to pending
        notify_students: true,
        notify_faculty: true
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
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            // Get user's college_id to filter departments
            const userData = localStorage.getItem('user');
            if (!userData) return;
            const user = JSON.parse(userData);

            if (!user.college_id) {
                toast.error('User college information not found');
                return;
            }

            // Fetch departments only for the faculty's college
            const res = await fetch(`/api/departments?college_id=${user.college_id}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setDepartments(data.departments || data.data || []);
            } else {
                toast.error('Failed to fetch departments');
            }
        } catch (err) {
            console.error('Error fetching departments:', err);
            toast.error('Error loading departments');
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

        // Validate required fields
        if (!formData.title || !formData.start_date || !formData.department_id) {
            toast.error('Please fill in all required fields (Title, Start Date, Department)');
            return;
        }

        try {
            setLoading(true);
            const userData = localStorage.getItem('user');
            if (!userData) {
                toast.error('User not authenticated');
                router.push('/login');
                return;
            }
            const user = JSON.parse(userData);

            if (!user.id) {
                toast.error('Invalid user data. Please log in again.');
                router.push('/login');
                return;
            }

            const headers = getAuthHeaders();
            if (!headers) return;

            // Prepare submission data to match DEPLOYED database schema
            // Deployed DB uses: event_date, event_time, location, college_id (all different from new_schema.sql!)

            if (!user.college_id) {
                toast.error('User college_id not found. Please log in again.');
                return;
            }

            const submissionData = {
                title: formData.title,
                description: formData.description || '',
                event_type: formData.event_type || 'workshop',
                department_id: formData.department_id,
                created_by: user.id,
                college_id: user.college_id, // REQUIRED by deployed schema
                start_date: formData.start_date, // API will map to event_date
                start_time: formData.start_time || '09:00:00', // API will map to event_time
                end_time: formData.end_time || '17:00:00',
                venue: formData.venue || 'TBA', // API will map to location
                registration_required: formData.registration_required || false,
                max_registrations: formData.max_registrations || 0,
                expected_participants: formData.expected_participants || 0,
                priority_level: formData.priority_level || 2,
                notifyStudents: formData.notify_students,
                notifyFaculty: formData.notify_faculty
            };

            console.log('Submitting event data:', submissionData);

            const res = await fetch('/api/events', {
                method: 'POST',
                headers,
                body: JSON.stringify(submissionData)
            });

            const data = await res.json();
            console.log('API Response:', data);

            if (res.ok) {
                toast.success('Event created successfully!');
                router.push('/faculty/events');
            } else {
                toast.error(data.error || 'Failed to create event');
                console.error('API Error:', data);
            }
        } catch (err) {
            console.error('Error creating event:', err);
            toast.error('Error creating event. Please try again.');
        } finally {
            setLoading(false);
        }
    };

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
                        <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
                        <p className="text-gray-500">Schedule a new academic event or activity</p>
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
                                    placeholder="e.g. Annual Tech Symposium 2025"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none transition-all"
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
                                    placeholder="Enter detailed description of the event..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none transition-all resize-none"
                                />
                            </div>

                            {/* Event Type & Department */}
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
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none transition-all"
                                    >
                                        {EVENT_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Building2 size={14} className="inline mr-1" />
                                        Department <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="department_id"
                                        value={formData.department_id}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none transition-all"
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
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
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none transition-all"
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
                                    placeholder="Same as start date if empty"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none transition-all"
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
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none transition-all"
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
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none transition-all"
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
                                    placeholder="e.g. Auditorium Hall B"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none transition-all"
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
                                        placeholder="e.g. 100"
                                        min="0"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none transition-all"
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
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none transition-all"
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
                                        className="w-5 h-5 rounded border-gray-300 text-[#4D869C] focus:ring-[#4D869C] transition-all"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Public Event</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="registration_required"
                                        checked={formData.registration_required}
                                        onChange={handleInputChange}
                                        className="w-5 h-5 rounded border-gray-300 text-[#4D869C] focus:ring-[#4D869C] transition-all"
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
                                            placeholder="Max number of registrations"
                                            min="0"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Notification Settings */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="bg-white rounded-2xl shadow-lg p-6"
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <AlertCircle size={20} className="text-[#4D869C]" />
                            Notifications
                        </h2>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="notify_students"
                                    checked={formData.notify_students}
                                    onChange={handleInputChange}
                                    className="w-5 h-5 rounded border-gray-300 text-[#4D869C] focus:ring-[#4D869C] transition-all"
                                />
                                <span className="text-sm font-medium text-gray-700">Notify Students</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="notify_faculty"
                                    checked={formData.notify_faculty}
                                    onChange={handleInputChange}
                                    className="w-5 h-5 rounded border-gray-300 text-[#4D869C] focus:ring-[#4D869C] transition-all"
                                />
                                <span className="text-sm font-medium text-gray-700">Notify Faculty</span>
                            </label>
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
                            disabled={loading}
                            className="px-6 py-3 bg-[#4D869C] text-white rounded-xl font-medium hover:shadow-lg hover:shadow-[#4D869C]/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Create Event
                                </>
                            )}
                        </button>
                    </motion.div>
                </form>
            </div>
        </FacultyCreatorLayout>
    );
}
