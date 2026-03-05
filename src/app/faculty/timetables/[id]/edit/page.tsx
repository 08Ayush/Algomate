'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { PageLoader } from '@/components/ui/PageLoader';
import {
    ArrowLeft, Plus, Trash2, X, Save, Send, Clock,
    Users, Calendar, BookOpen, User, MapPin, AlertCircle,
    RefreshCw, ChevronDown, Pencil
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────

interface TimetableInfo {
    id: string; title: string; description: string | null;
    status: string; academic_year: string; semester: number;
    batch_id: string; batch_name: string; department_id: string;
    college_id: string; created_by: string;
}
interface ScheduledClass {
    id: string; subject_id: string; faculty_id: string;
    classroom_id: string | null; time_slot_id: string;
    class_type: string; is_lab: boolean; is_continuation: boolean;
    subject_name: string; subject_code: string;
    faculty_name: string; classroom_name: string | null;
    day: string; start_time: string; end_time: string;
    notes: string | null;
}
interface TimeSlot {
    id: string; day: string; start_time: string; end_time: string;
    slot_number: number;
}
interface Subject {
    id: string; name: string; code: string;
    subject_type: string; credits_per_week: number; credit_value: number;
}
interface Faculty { id: string; name: string; department_id: string; }
interface Classroom {
    id: string; name: string; building: string | null; floor_number: number | null;
    capacity: number; type: string; is_lab: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const fmt = (t: string) => t?.substring(0, 5) ?? '';

const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
        draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
        pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending Approval' },
        published: { bg: 'bg-green-100', text: 'text-green-700', label: 'Published' },
        rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
    };
    return map[status] ?? map.draft;
};

// ─── Component ───────────────────────────────────────────────

export default function EditTimetablePage() {
    const params = useParams();
    const router = useRouter();
    const timetableId = params.id as string;

    // Data
    const [timetable, setTimetable] = useState<TimetableInfo | null>(null);
    const [classes, setClasses] = useState<ScheduledClass[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);

    // UI
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Add-class modal
    const [addModal, setAddModal] = useState<{ open: boolean; slot: TimeSlot | null }>({ open: false, slot: null });
    const [addForm, setAddForm] = useState({
        subject_id: '', faculty_id: '', classroom_id: '',
        class_type: 'THEORY', is_extra: false,
        custom_name: '', custom_code: '',
        subjectSearch: '',
    });
    const [addSaving, setAddSaving] = useState(false);

    // ── Auth header ───────────────────────────────────────────
    const getHeaders = useCallback((): Record<string, string> | null => {
        const raw = localStorage.getItem('user');
        if (!raw) { router.push('/login'); return null; }
        const u = JSON.parse(raw);
        return {
            'Authorization': `Bearer ${btoa(JSON.stringify({ id: u.id, role: u.role, department_id: u.department_id, college_id: u.college_id }))}`,
            'Content-Type': 'application/json',
        };
    }, [router]);

    // ── Fetch ─────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const h = getHeaders();
            if (!h) return;
            const res = await fetch(`/api/timetables/${timetableId}/classes`, { headers: h });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Failed to load timetable');
            }
            const d = await res.json();
            setTimetable(d.timetable);
            setClasses(d.classes || []);
            setTimeSlots(d.timeSlots || []);
            setSubjects(d.subjects || []);
            setFaculty(d.faculty || []);
            setClassrooms(d.classrooms || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [timetableId, getHeaders]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Grid helpers ──────────────────────────────────────────
    // Unique time labels (sorted by slot_number then start_time)
    const uniqueTimes = Array.from(
        new Map(timeSlots.map(ts => [ts.start_time, ts])).values()
    ).sort((a, b) => a.slot_number - b.slot_number || a.start_time.localeCompare(b.start_time));

    const getSlot = (day: string, start: string) =>
        timeSlots.find(ts => ts.day === day && fmt(ts.start_time) === fmt(start));

    const getClass = (day: string, start: string): ScheduledClass | undefined =>
        classes.find(c => c.day === day && fmt(c.start_time) === fmt(start));

    // ── Delete a class ────────────────────────────────────────
    const handleDelete = async (cls: ScheduledClass) => {
        if (!confirm(`Remove "${cls.subject_name}" from ${cls.day} ${fmt(cls.start_time)}?`)) return;
        setDeletingId(cls.id);
        try {
            const h = getHeaders();
            if (!h) return;
            const res = await fetch(
                `/api/timetables/${timetableId}/classes?class_id=${cls.id}`,
                { method: 'DELETE', headers: h }
            );
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            setClasses(prev => prev.filter(c => c.id !== cls.id));
            toast.success('Class removed');
        } catch (e: any) {
            toast.error(e.message || 'Failed to remove');
        } finally {
            setDeletingId(null);
        }
    };

    // ── Open add modal ────────────────────────────────────────
    const openAdd = (slot: TimeSlot) => {
        setAddForm({ subject_id: '', faculty_id: '', classroom_id: '', class_type: 'THEORY', is_extra: false, custom_name: '', custom_code: '', subjectSearch: '' });
        setAddModal({ open: true, slot });
    };

    // ── Save new class ────────────────────────────────────────
    const handleAddClass = async () => {
        const slot = addModal.slot;
        if (!slot) return;
        if (!addForm.faculty_id) { toast.error('Please select a faculty'); return; }
        if (!addForm.is_extra && !addForm.subject_id) { toast.error('Please select a subject'); return; }
        if (addForm.is_extra && !addForm.custom_name.trim()) { toast.error('Please enter the activity name'); return; }

        setAddSaving(true);
        try {
            const h = getHeaders();
            if (!h) return;
            const body: any = {
                time_slot_id: slot.id,
                faculty_id: addForm.faculty_id,
                classroom_id: addForm.classroom_id || undefined,
                class_type: addForm.class_type,
            };
            if (addForm.is_extra) {
                body.custom_subject_name = addForm.custom_name.trim();
                body.custom_subject_code = addForm.custom_code.trim() || undefined;
            } else {
                body.subject_id = addForm.subject_id;
            }

            const res = await fetch(`/api/timetables/${timetableId}/classes`, {
                method: 'POST', headers: h, body: JSON.stringify(body),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);

            setClasses(prev => [...prev, d.class]);
            setAddModal({ open: false, slot: null });
            toast.success('Class added successfully');
        } catch (e: any) {
            toast.error(e.message || 'Failed to add class');
        } finally {
            setAddSaving(false);
        }
    };

    // ── Submit for approval ───────────────────────────────────
    const handleSubmitApproval = async () => {
        if (!confirm('Submit this timetable for approval? You will not be able to edit it after submitting.')) return;
        setSubmitting(true);
        try {
            const h = getHeaders();
            if (!h) return;
            const res = await fetch(`/api/timetables/${timetableId}/submit`, { method: 'POST', headers: h });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            toast.success('Submitted for approval!');
            router.push(`/faculty/timetables/${timetableId}`);
        } catch (e: any) {
            toast.error(e.message || 'Failed to submit');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Render guards ─────────────────────────────────────────
    if (loading) return <PageLoader message="Loading Timetable Editor" subMessage="Fetching schedule, subjects, faculty and rooms..." />;
    if (error || !timetable) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#CDE8E5] via-[#EEF7FF] to-[#7AB2B2] flex items-center justify-center">
                <div className="text-center bg-white rounded-2xl p-10 shadow-lg max-w-md">
                    <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-gray-600 mb-6">{error || 'Timetable not found'}</p>
                    <button onClick={() => router.push('/faculty/timetables')} className="px-6 py-3 bg-[#4D869C] text-white rounded-xl font-medium">Back to Timetables</button>
                </div>
            </div>
        );
    }

    const isReadOnly = timetable.status !== 'draft';
    const statusInfo = getStatusBadge(timetable.status);

    // Subjects filtered by search
    const filteredSubjects = subjects.filter(s =>
        !addForm.subjectSearch ||
        s.name.toLowerCase().includes(addForm.subjectSearch.toLowerCase()) ||
        s.code.toLowerCase().includes(addForm.subjectSearch.toLowerCase())
    );

    return (
        <FacultyCreatorLayout activeTab="timetables">
            <div className="space-y-6">

                {/* ── Header ─────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-[#4D869C] via-[#5a9aae] to-[#7AB2B2] rounded-2xl p-6 shadow-lg">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex items-start gap-4">
                            <button onClick={() => router.push(`/faculty/timetables/${timetableId}`)}
                                className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors">
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-white">{timetable.title}</h1>
                                    <Pencil size={16} className="text-white/60" />
                                </div>
                                <p className="text-white/70 mt-1 text-sm">
                                    {isReadOnly ? 'View-only — timetable is not in draft' : 'Click free slots to add classes · Click × to remove classes'}
                                </p>
                            </div>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-bold ${statusInfo.bg} ${statusInfo.text}`}>
                            {statusInfo.label}
                        </span>
                    </div>

                    {/* Metadata pills */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                        {[
                            { icon: <Users size={14} />, label: 'Batch', value: timetable.batch_name || 'N/A' },
                            { icon: <Calendar size={14} />, label: 'Academic Year', value: timetable.academic_year },
                            { icon: <BookOpen size={14} />, label: 'Semester', value: `Semester ${timetable.semester}` },
                            { icon: <Clock size={14} />, label: 'Classes', value: `${classes.length} scheduled` },
                        ].map(m => (
                            <div key={m.label} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5">
                                <div className="flex items-center gap-1 text-white/60 text-xs mb-1">{m.icon} {m.label}</div>
                                <p className="text-white font-semibold text-sm">{m.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    {!isReadOnly && (
                        <div className="flex flex-wrap gap-3 mt-5">
                            <button onClick={fetchData}
                                className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-all text-sm">
                                <RefreshCw size={15} /> Refresh
                            </button>
                            <button onClick={handleSubmitApproval} disabled={submitting}
                                className="flex items-center gap-2 px-5 py-2 bg-white text-[#4D869C] rounded-xl font-bold hover:shadow-lg transition-all text-sm disabled:opacity-60">
                                <Send size={15} /> {submitting ? 'Submitting…' : 'Submit for Approval'}
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* ── Read-only notice ─────────────────────── */}
                {isReadOnly && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3 text-amber-700 text-sm">
                        <AlertCircle size={18} />
                        This timetable is <strong className="capitalize">{timetable.status.replace(/_/g, ' ')}</strong> and cannot be edited. Return to draft to make changes.
                    </div>
                )}

                {/* ── Timetable Grid ───────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {uniqueTimes.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <Clock size={48} className="mx-auto mb-3 opacity-30" />
                            No time slots found for this college.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="bg-[#4D869C]">
                                        <th className="border border-[#4D869C]/30 p-3 text-left text-white font-semibold sticky left-0 bg-[#4D869C] z-10 min-w-[90px]">
                                            Day / Time
                                        </th>
                                        {uniqueTimes.map(ts => (
                                            <th key={ts.id} className="border border-[#4D869C]/30 p-3 text-center text-white font-semibold min-w-[150px]">
                                                <div className="flex flex-col items-center">
                                                    <Clock size={13} className="mb-1 text-white/60" />
                                                    <span className="text-sm">{fmt(ts.start_time)}</span>
                                                    <span className="text-xs text-white/70">– {fmt(ts.end_time)}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {DAYS.map((day, di) => (
                                        <tr key={day} className={di % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                            <td className="border border-gray-200 p-3 font-bold text-gray-700 sticky left-0 bg-inherit z-10 text-sm">
                                                {day}
                                            </td>
                                            {uniqueTimes.map(ts => {
                                                const slot = getSlot(day, ts.start_time);
                                                const cls = getClass(day, ts.start_time);
                                                const isDeleting = cls && deletingId === cls.id;

                                                return (
                                                    <td key={`${day}-${ts.start_time}`} className="border border-gray-200 p-1.5 align-top">
                                                        {cls ? (
                                                            // ── Occupied cell ──────────────────────────────
                                                            <div className={`relative rounded-xl p-2.5 group transition-all ${cls.is_lab || cls.is_continuation
                                                                ? 'bg-purple-50 border border-purple-200'
                                                                : cls.notes?.includes('Extra-curricular')
                                                                    ? 'bg-emerald-50 border border-emerald-200'
                                                                    : 'bg-[#4D869C]/10 border border-[#4D869C]/30'
                                                                } ${isDeleting ? 'opacity-40' : ''}`}>
                                                                {/* Type badge */}
                                                                {cls.is_lab && !cls.is_continuation && (
                                                                    <span className="absolute top-1 left-1 bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">LAB</span>
                                                                )}
                                                                {cls.notes?.includes('Extra-curricular') && (
                                                                    <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">EXTRA</span>
                                                                )}
                                                                {/* Delete button (draft only) */}
                                                                {!isReadOnly && (
                                                                    <button
                                                                        onClick={() => handleDelete(cls)}
                                                                        disabled={!!isDeleting}
                                                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-all"
                                                                        title="Remove this class"
                                                                    >
                                                                        <X size={11} />
                                                                    </button>
                                                                )}
                                                                <div className={`font-semibold text-xs mt-2 ${cls.is_lab || cls.is_continuation ? 'text-purple-900' : cls.notes?.includes('Extra-curricular') ? 'text-emerald-900' : 'text-[#4D869C]'}`}>
                                                                    {cls.subject_name}
                                                                </div>
                                                                {cls.subject_code && (
                                                                    <div className="text-[10px] text-gray-500 font-mono mb-1">{cls.subject_code}</div>
                                                                )}
                                                                <div className="flex items-center gap-1 text-[10px] text-gray-600">
                                                                    <User size={9} /><span className="truncate">{cls.faculty_name}</span>
                                                                </div>
                                                                {cls.classroom_name && (
                                                                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                                                                        <MapPin size={9} /><span>{cls.classroom_name}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : slot && !isReadOnly ? (
                                                            // ── Free slot — add button ─────────────────────
                                                            <button
                                                                onClick={() => openAdd(slot)}
                                                                className="w-full h-full min-h-[70px] flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#4D869C] hover:bg-[#4D869C]/5 text-gray-300 hover:text-[#4D869C] transition-all group"
                                                            >
                                                                <Plus size={16} className="transition-transform group-hover:scale-125" />
                                                                <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Add</span>
                                                            </button>
                                                        ) : (
                                                            // ── Free slot view-only ────────────────────────
                                                            <div className="min-h-[70px] flex items-center justify-center text-[10px] text-gray-300">Free</div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>

                {/* ── Legend ──────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-lg p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-3">Legend</p>
                    <div className="flex flex-wrap gap-5 text-sm">
                        {[
                            { color: 'bg-[#4D869C]/10 border border-[#4D869C]/30', label: 'Algorithm-scheduled (theory)' },
                            { color: 'bg-purple-50 border border-purple-200', label: 'Lab / Practical' },
                            { color: 'bg-emerald-50 border border-emerald-200', label: 'Extra-curricular (0 credits)' },
                        ].map(l => (
                            <div key={l.label} className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-lg ${l.color}`} />
                                <span className="text-gray-600 text-xs">{l.label}</span>
                            </div>
                        ))}
                        {!isReadOnly && (
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                                    <Plus size={10} className="text-gray-400" />
                                </div>
                                <span className="text-gray-600 text-xs">Free slot — hover &amp; click to add</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ───────────────────────────────────────────────────────
                  Add-Class Modal
            ─────────────────────────────────────────────────────── */}
            <AnimatePresence>
                {addModal.open && addModal.slot && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        >
                            {/* Modal header */}
                            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 sticky top-0 rounded-t-2xl">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Add Class</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {addModal.slot.day} · {fmt(addModal.slot.start_time)} – {fmt(addModal.slot.end_time)}
                                    </p>
                                </div>
                                <button onClick={() => setAddModal({ open: false, slot: null })}
                                    className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Toggle: batch subject vs extra-curricular */}
                                <div className="flex rounded-xl overflow-hidden border border-gray-200">
                                    <button
                                        className={`flex-1 py-2.5 text-sm font-semibold transition-all ${!addForm.is_extra ? 'bg-[#4D869C] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                        onClick={() => setAddForm(f => ({ ...f, is_extra: false, subject_id: '' }))}
                                    >
                                        <BookOpen size={14} className="inline mr-1" /> Batch Subject
                                    </button>
                                    <button
                                        className={`flex-1 py-2.5 text-sm font-semibold transition-all ${addForm.is_extra ? 'bg-emerald-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                        onClick={() => setAddForm(f => ({ ...f, is_extra: true, subject_id: '' }))}
                                    >
                                        <Plus size={14} className="inline mr-1" /> Extra-curricular
                                    </button>
                                </div>

                                {/* Subject section */}
                                {addForm.is_extra ? (
                                    <div className="space-y-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                        <p className="text-xs text-emerald-700 font-medium">Zero-credit activity (will not affect scheduling constraints)</p>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name *</label>
                                            <input
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                                                placeholder="e.g. Sports Period, Seminar, Cultural Activity"
                                                value={addForm.custom_name}
                                                onChange={e => setAddForm(f => ({ ...f, custom_name: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Short Code <span className="text-gray-400 text-xs">(optional)</span></label>
                                            <input
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-400 outline-none uppercase"
                                                placeholder="e.g. SPORTS"
                                                value={addForm.custom_code}
                                                onChange={e => setAddForm(f => ({ ...f, custom_code: e.target.value.toUpperCase() }))}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                                        <div className="relative mb-2">
                                            <input
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#4D869C] outline-none"
                                                placeholder="Search subjects…"
                                                value={addForm.subjectSearch}
                                                onChange={e => setAddForm(f => ({ ...f, subjectSearch: e.target.value }))}
                                            />
                                        </div>
                                        <div className="border border-gray-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-50">
                                            {filteredSubjects.length === 0 ? (
                                                <p className="text-sm text-gray-400 text-center py-4">No subjects found</p>
                                            ) : filteredSubjects.map(s => (
                                                <button key={s.id} type="button"
                                                    onClick={() => setAddForm(f => ({ ...f, subject_id: s.id, class_type: s.subject_type === 'LAB' ? 'LAB' : s.subject_type === 'PRACTICAL' ? 'PRACTICAL' : 'THEORY' }))}
                                                    className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 ${addForm.subject_id === s.id ? 'bg-indigo-50' : ''}`}
                                                >
                                                    <div>
                                                        <span className="font-mono text-xs text-gray-500 mr-2">{s.code}</span>
                                                        <span className="text-sm text-gray-800">{s.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s.subject_type}</span>
                                                        {addForm.subject_id === s.id && <span className="text-indigo-500 text-xs font-bold">✓</span>}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Class type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Class Type</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        value={addForm.class_type}
                                        onChange={e => setAddForm(f => ({ ...f, class_type: e.target.value }))}
                                    >
                                        {['THEORY', 'LAB', 'PRACTICAL', 'TUTORIAL'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>

                                {/* Faculty */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Faculty *</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        value={addForm.faculty_id}
                                        onChange={e => setAddForm(f => ({ ...f, faculty_id: e.target.value }))}
                                    >
                                        <option value="">— Select faculty —</option>
                                        {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>

                                {/* Classroom */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Classroom <span className="text-gray-400 text-xs">(optional)</span>
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        value={addForm.classroom_id}
                                        onChange={e => setAddForm(f => ({ ...f, classroom_id: e.target.value }))}
                                    >
                                        <option value="">— No specific room —</option>
                                        {classrooms.map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.name}{r.building ? ` · ${r.building}` : ''}{r.is_lab ? ' [LAB]' : ''} · cap {r.capacity}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button"
                                        onClick={() => setAddModal({ open: false, slot: null })}
                                        className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium text-sm">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddClass}
                                        disabled={addSaving}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-[#4D869C] text-white rounded-xl font-bold text-sm hover:shadow-lg disabled:opacity-50 transition-all"
                                    >
                                        <Save size={15} />
                                        {addSaving ? 'Saving…' : 'Add to Timetable'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </FacultyCreatorLayout>
    );
}
