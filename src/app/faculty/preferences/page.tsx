'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CardLoader } from '@/components/ui/PageLoader';
import { Settings, BookOpen, Save, RefreshCw, Star, Clock, CheckCircle, Plus, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';

interface Subject {
    id: string;
    name: string;
    code: string;
    credits: number;
    is_lab: boolean;
}

interface Qualification {
    id: string;
    subject_id: string;
    subject_name: string;
    subject_code: string;
    proficiency_level: number;
    years_experience: number;
    is_preferred: boolean;
    subject_type?: string;
    can_handle_lab?: boolean;
}

interface TimePreference {
    day: string;
    preferred_slots: string[];
}

const PreferencesPage: React.FC = () => {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [qualifications, setQualifications] = useState<Qualification[]>([]);
    const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
    const [timePreferences, setTimePreferences] = useState<TimePreference[]>([]);
    const [maxHoursPerDay, setMaxHoursPerDay] = useState(6);
    const [preferredConsecutive, setPreferredConsecutive] = useState(false);

    const [showAddQualification, setShowAddQualification] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [proficiency, setProficiency] = useState(3);
    const [experience, setExperience] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlots = ['09:00-10:00', '10:00-11:00', '11:15-12:15', '12:15-13:15', '14:15-15:15', '15:15-16:15'];

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return;
        }
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role !== 'faculty') {
            router.push('/login');
            return;
        }
        setUser(parsedUser);
        fetchData(parsedUser);
    }, [router]);

    const fetchData = async (userData: any) => {
        try {
            setLoading(true);
            const token = btoa(JSON.stringify({
                id: userData.id,
                user_id: userData.id,
                role: userData.role,
                college_id: userData.college_id,
                department_id: userData.department_id
            }));

            // Parallel-fetch qualifications, subjects, and preferences
            const [qualRes, subjectsRes, prefRes] = await Promise.all([
                fetch('/api/faculty/qualifications', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/admin/subjects?department_id=${userData.department_id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/faculty/preferences', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            const [qualData, subjectsData, prefData] = await Promise.all([
                qualRes.json(), subjectsRes.json(), prefRes.json()
            ]);

            const subjectsList = subjectsData.success ? (subjectsData.subjects || []) : [];
            setAvailableSubjects(subjectsList);

            if (qualData.success) {
                // Build a lookup map so we can fall back to subjects-list data if the
                // json_build_object inside the qualifications query returns null names.
                const subjectMap = new Map<string, any>(subjectsList.map((s: any) => [s.id, s]));
                setQualifications((qualData.qualifications || []).map((q: any) => {
                    const fb = subjectMap.get(q.subject_id) || {};
                    return {
                        id: q.id,
                        subject_id: q.subject_id,
                        subject_name: q.subject?.name || fb.name || '—',
                        subject_code: q.subject?.code || fb.code || '',
                        proficiency_level: q.proficiency_level || 1,
                        years_experience: 0,
                        is_preferred: q.is_primary_teacher || false,
                        subject_type: q.subject?.subject_type || fb.subject_type || '',
                        can_handle_lab: q.can_handle_lab || false
                    };
                }));
            }

            if (prefData.success && prefData.settings) {
                if (prefData.settings.max_hours_per_day) setMaxHoursPerDay(prefData.settings.max_hours_per_day);
                if (prefData.settings.prefer_consecutive !== undefined) setPreferredConsecutive(prefData.settings.prefer_consecutive);
                if (prefData.settings.time_preferences) {
                    setTimePreferences(prefData.settings.time_preferences);
                    return; // skip default init
                }
            }

            // Default time preferences if none saved
            const defaultPrefs = days.map(day => ({
                day,
                preferred_slots: timeSlots.slice(0, 4)
            }));
            setTimePreferences(defaultPrefs);

        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load preferences');
        } finally {
            setLoading(false);
        }
    };

    const addQualification = async () => {
        if (!selectedSubjectId) {
            toast.error('Please select a subject');
            return;
        }

        if (!user) return;

        setSaving(true);
        try {
            const token = btoa(JSON.stringify({
                id: user.id,
                user_id: user.id,
                role: user.role,
                college_id: user.college_id,
                department_id: user.department_id
            }));

            const response = await fetch('/api/faculty/qualifications', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    faculty_id: user.id,
                    subject_id: selectedSubjectId,
                    proficiency_level: proficiency,
                    is_primary_teacher: false
                })
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Qualification added successfully');
                setShowAddQualification(false);
                setSelectedSubjectId('');
                setProficiency(3);
                setExperience(0);
                fetchData(user);
            } else {
                toast.error(data.error || 'Failed to add qualification');
            }
        } catch (error) {
            console.error('Error adding qualification:', error);
            toast.error('Failed to add qualification');
        } finally {
            setSaving(false);
        }
    };

    const togglePreferredSubject = async (qualId: string, isPreferred: boolean) => {
        if (!user) return;

        try {
            const token = btoa(JSON.stringify({
                id: user.id,
                user_id: user.id,
                role: user.role,
                college_id: user.college_id,
                department_id: user.department_id
            }));

            const response = await fetch('/api/faculty/qualifications', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    qualification_id: qualId,
                    is_primary_teacher: !isPreferred
                })
            });

            const data = await response.json();
            if (data.success) {
                setQualifications(prev =>
                    prev.map(q => q.id === qualId ? { ...q, is_preferred: !isPreferred } : q)
                );
                toast.success('Preference updated');
            }
        } catch (error) {
            console.error('Error updating preference:', error);
        }
    };

    const toggleTimeSlot = (day: string, slot: string) => {
        setTimePreferences(prev => prev.map(pref => {
            if (pref.day !== day) return pref;
            const slots = pref.preferred_slots.includes(slot)
                ? pref.preferred_slots.filter(s => s !== slot)
                : [...pref.preferred_slots, slot];
            return { ...pref, preferred_slots: slots };
        }));
    };

    const saveTimePreferences = async () => {
        if (!user) return;

        setSaving(true);
        try {
            const token = btoa(JSON.stringify({
                id: user.id,
                role: user.role
            }));

            const response = await fetch('/api/faculty/preferences', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    faculty_id: user.id,
                    time_preferences: timePreferences,
                    max_hours_per_day: maxHoursPerDay,
                    prefer_consecutive: preferredConsecutive
                })
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Preferences saved successfully');
            } else {
                toast.error(data.error || 'Failed to save preferences');
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            toast.error('Failed to save preferences');
        } finally {
            setSaving(false);
        }
    };

    const filteredSubjects = availableSubjects.filter(s =>
        !qualifications.some(q => q.subject_id === s.id) &&
        (s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.code?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <FacultyCreatorLayout activeTab="preferences">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Preferences</h1>
                        <p className="text-gray-600">Set your teaching preferences and subject qualifications</p>
                    </div>
                    <button
                        onClick={saveTimePreferences}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-[#4D869C] text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50"
                    >
                        <Save size={18} /> {saving ? 'Saving...' : 'Save All Preferences'}
                    </button>
                </div>

                {/* Subject Qualifications */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                                <BookOpen size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Subject Qualifications</h2>
                                <p className="text-sm text-gray-500">Subjects you are qualified and willing to teach</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAddQualification(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#4D869C] text-white rounded-xl font-medium hover:shadow-lg"
                        >
                            <Plus size={18} /> Add Subject
                        </button>
                    </div>

                    {loading ? (
                        <CardLoader message="Loading qualifications..." subMessage="Fetching your teaching subjects" size="sm" />
                    ) : qualifications.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl">
                            <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No qualifications added yet. Add subjects you can teach.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {qualifications.map((qual, i) => (
                                <motion.div
                                    key={qual.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className={`p-4 rounded-xl border-2 transition-all ${qual.is_preferred
                                        ? 'border-[#4D869C] bg-[#4D869C]/5'
                                        : 'border-gray-200 bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
                                                {qual.subject_name}
                                            </h3>
                                            <p className="text-xs text-gray-500 font-mono mt-0.5">{qual.subject_code}</p>
                                        </div>
                                        <button
                                            onClick={() => togglePreferredSubject(qual.id, qual.is_preferred)}
                                            className={`flex-shrink-0 p-2 rounded-lg transition-all ${qual.is_preferred
                                                ? 'text-yellow-500 bg-yellow-50'
                                                : 'text-gray-400 hover:bg-gray-100'
                                                }`}
                                            title={qual.is_preferred ? 'Remove from preferred' : 'Mark as preferred'}
                                        >
                                            <Star size={18} fill={qual.is_preferred ? 'currentColor' : 'none'} />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {qual.subject_type && (
                                            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                                                {qual.subject_type}
                                            </span>
                                        )}
                                        {qual.can_handle_lab && (
                                            <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-medium">
                                                Lab Capable
                                            </span>
                                        )}
                                        {qual.is_preferred && (
                                            <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full font-medium">
                                                ★ Preferred
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className="text-xs text-gray-500">Proficiency:</span>
                                        <div className="flex gap-0.5">
                                            {Array.from({ length: 10 }, (_, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1.5 w-3 rounded-full ${
                                                        i < qual.proficiency_level
                                                            ? 'bg-[#4D869C]'
                                                            : 'bg-gray-200'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs font-semibold text-[#4D869C] ml-1">{qual.proficiency_level}/10</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Time Preferences */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-lg p-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-green-100">
                            <Clock size={20} className="text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Time Preferences</h2>
                            <p className="text-sm text-gray-500">Select your preferred time slots for teaching</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="p-3 text-left font-semibold text-gray-700 rounded-tl-xl">Day</th>
                                    {timeSlots.map(slot => (
                                        <th key={slot} className="p-3 text-center font-semibold text-gray-700 text-sm">
                                            {slot}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {days.map(day => {
                                    const pref = timePreferences.find(p => p.day === day);
                                    return (
                                        <tr key={day} className="border-b border-gray-100">
                                            <td className="p-3 font-medium text-gray-800">{day}</td>
                                            {timeSlots.map(slot => {
                                                const isSelected = pref?.preferred_slots.includes(slot);
                                                return (
                                                    <td key={slot} className="p-2 text-center">
                                                        <button
                                                            onClick={() => toggleTimeSlot(day, slot)}
                                                            className={`w-10 h-10 rounded-lg transition-all ${isSelected
                                                                ? 'bg-[#4D869C] text-white'
                                                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                                }`}
                                                        >
                                                            {isSelected && <CheckCircle size={18} className="mx-auto" />}
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Max Hours Per Day</label>
                            <input
                                type="number"
                                value={maxHoursPerDay}
                                onChange={(e) => setMaxHoursPerDay(parseInt(e.target.value) || 6)}
                                min={1}
                                max={8}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                            />
                        </div>
                        <div className="flex items-center">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={preferredConsecutive}
                                    onChange={(e) => setPreferredConsecutive(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-[#4D869C] focus:ring-[#4D869C]"
                                />
                                <span className="text-gray-700">Prefer consecutive classes (minimize gaps)</span>
                            </label>
                        </div>
                    </div>
                </motion.div>

                {/* Add Qualification Modal */}
                {showAddQualification && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 m-4"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Add Subject Qualification</h3>
                                <button onClick={() => setShowAddQualification(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Search Subject</label>
                                    <div className="relative">
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search subjects..."
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Subject</label>
                                    <select
                                        value={selectedSubjectId}
                                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                                    >
                                        <option value="">Select a subject</option>
                                        {filteredSubjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Proficiency Level (1-5)</label>
                                    <input
                                        type="range"
                                        min={1}
                                        max={5}
                                        value={proficiency}
                                        onChange={(e) => setProficiency(parseInt(e.target.value))}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                                        <span>Beginner</span>
                                        <span className="font-bold text-[#4D869C]">{proficiency}</span>
                                        <span>Expert</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Years of Experience</label>
                                    <input
                                        type="number"
                                        value={experience}
                                        onChange={(e) => setExperience(parseInt(e.target.value) || 0)}
                                        min={0}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowAddQualification(false)}
                                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={addQualification}
                                    disabled={saving || !selectedSubjectId}
                                    className="flex-1 px-4 py-3 bg-[#4D869C] text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50"
                                >
                                    {saving ? 'Adding...' : 'Add Qualification'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </FacultyCreatorLayout>
    );
};

export default PreferencesPage;
