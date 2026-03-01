'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Users, BookOpen, Save, RefreshCw, CheckCircle, AlertCircle, UserCheck, Building2, Beaker } from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';
import { useSemesterMode } from '@/contexts/SemesterModeContext';

interface QualifiedFaculty {
    faculty_id: string;
    faculty_name: string;
    proficiency_level: number;
    is_primary_teacher: boolean;
}

interface LabRoom {
    id: string;
    name: string;
    building: string | null;
    capacity: number;
    lab_type: string | null;
    has_computers: boolean;
    has_lab_equipment: boolean;
}

interface BatchSubject {
    batch_subject_id: string;
    subject_id: string;
    subject_name: string;
    subject_code: string;
    subject_type: string;
    required_hours: number;
    assigned_faculty_id: string | null;
    assigned_faculty_name: string | null;
    assigned_lab_id: string | null;
    assigned_lab_name: string | null;
    qualified_faculty: QualifiedFaculty[];
    is_lab_subject: boolean;
}

interface Batch {
    id: string;
    name: string;
    semester: number;
    academic_year: string;
    department?: { name: string };
}

interface BatchData {
    batch_id: string;
    batch_name: string;
    semester: number;
    academic_year: string;
    subjects: BatchSubject[];
    lab_rooms: LabRoom[];
    total_subjects: number;
    assigned_count: number;
    lab_subjects_count: number;
    lab_assigned_count: number;
}

interface Assignments {
    [key: string]: {
        faculty_id: string | null;
        lab_id: string | null;
    };
}

const FacultyAssignmentsPage: React.FC = () => {
    const router = useRouter();
    const { semesterMode, activeSemesters, modeLabel } = useSemesterMode();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatchId, setSelectedBatchId] = useState<string>('');
    const [batchData, setBatchData] = useState<BatchData | null>(null);
    const [assignments, setAssignments] = useState<Assignments>({});
    const [loading, setLoading] = useState(true);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        fetchBatches();
    }, []);

    useEffect(() => {
        if (selectedBatchId) {
            fetchBatchSubjects(selectedBatchId);
        }
    }, [selectedBatchId]);

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

    const fetchBatches = async () => {
        try {
            setLoading(true);
            const headers = getAuthHeaders();
            if (!headers) return;

            const res = await fetch('/api/batches', { headers });
            if (res.ok) {
                const data = await res.json();
                setBatches(data.batches || data.data || []);
            }
        } catch (error) {
            console.error('Error fetching batches:', error);
            toast.error('Failed to load batches');
        } finally {
            setLoading(false);
        }
    };

    const fetchBatchSubjects = async (batchId: string) => {
        try {
            setLoadingSubjects(true);
            const headers = getAuthHeaders();
            if (!headers) return;

            const res = await fetch(`/api/faculty/batch-faculty-assignments?batch_id=${batchId}`, { headers });
            if (res.ok) {
                const data: BatchData = await res.json();
                setBatchData(data);

                // Initialize assignments from current data
                const initialAssignments: Assignments = {};
                data.subjects.forEach(subject => {
                    initialAssignments[subject.batch_subject_id] = {
                        faculty_id: subject.assigned_faculty_id,
                        lab_id: subject.assigned_lab_id
                    };
                });
                setAssignments(initialAssignments);
                setHasChanges(false);
            } else {
                toast.error('Failed to load subjects');
            }
        } catch (error) {
            console.error('Error fetching batch subjects:', error);
            toast.error('Failed to load subjects');
        } finally {
            setLoadingSubjects(false);
        }
    };

    const handleFacultyChange = (batchSubjectId: string, facultyId: string | null) => {
        setAssignments(prev => ({
            ...prev,
            [batchSubjectId]: {
                ...prev[batchSubjectId],
                faculty_id: facultyId
            }
        }));
        setHasChanges(true);
    };

    const handleLabChange = (batchSubjectId: string, labId: string | null) => {
        setAssignments(prev => ({
            ...prev,
            [batchSubjectId]: {
                ...prev[batchSubjectId],
                lab_id: labId
            }
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!hasChanges || !batchData) return;

        try {
            setSaving(true);
            const headers = getAuthHeaders();
            if (!headers) return;

            const assignmentsList = Object.entries(assignments).map(([batch_subject_id, data]) => ({
                batch_subject_id,
                assigned_faculty_id: data.faculty_id,
                assigned_lab_id: data.lab_id
            }));

            const res = await fetch('/api/faculty/batch-faculty-assignments', {
                method: 'PUT',
                headers,
                body: JSON.stringify({ assignments: assignmentsList })
            });

            if (res.ok) {
                const result = await res.json();
                if (result.success) {
                    toast.success(`Updated ${result.updated} assignments`);
                    setHasChanges(false);
                    // Refresh data
                    fetchBatchSubjects(selectedBatchId);
                } else {
                    toast.error('Some assignments failed to update');
                }
            } else {
                toast.error('Failed to save assignments');
            }
        } catch (error) {
            console.error('Error saving assignments:', error);
            toast.error('Failed to save assignments');
        } finally {
            setSaving(false);
        }
    };

    const assignedFacultyCount = Object.values(assignments).filter(a => a.faculty_id).length;
    const totalCount = batchData?.subjects.length || 0;
    const labSubjectsCount = batchData?.subjects.filter(s => s.is_lab_subject).length || 0;
    const assignedLabCount = Object.entries(assignments).filter(([id, a]) => {
        const subject = batchData?.subjects.find(s => s.batch_subject_id === id);
        return subject?.is_lab_subject && a.lab_id;
    }).length;
    const progress = totalCount > 0 ? (assignedFacultyCount / totalCount) * 100 : 0;

    return (
        <FacultyCreatorLayout activeTab="faculty-assignments">
            <div className="space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Faculty & Lab Assignments</h1>
                        <p className="text-gray-600">Assign faculty members and lab rooms to subjects for each batch</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => selectedBatchId && fetchBatchSubjects(selectedBatchId)}
                            disabled={!selectedBatchId || loadingSubjects}
                            className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={loadingSubjects ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                            className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                        >
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Save Assignments'}
                        </button>
                    </div>
                </div>

                {/* Batch Selector */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Batch</label>
                    <select
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        className="w-full max-w-md px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none appearance-none bg-white text-gray-900"
                    >
                        <option value="">Choose a batch...</option>
                        {batches
                            .filter(b => semesterMode === 'all' || activeSemesters.includes(b.semester))
                            .map(batch => (
                                <option key={batch.id} value={batch.id}>
                                    {batch.name} - Semester {batch.semester} ({batch.academic_year})
                                </option>
                            ))}
                    </select>
                    {semesterMode !== 'all' && (
                        <div className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium w-fit ${semesterMode === 'odd' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-violet-50 text-violet-700 border border-violet-200'
                            }`}>
                            <span className="w-2 h-2 rounded-full animate-pulse inline-block bg-current"></span>
                            Active mode: <strong className="ml-1">{modeLabel}</strong>
                            <span className="ml-1 text-xs opacity-70">— Sem {activeSemesters.join(', ')} only.</span>
                        </div>
                    )}
                </div>

                {/* Progress & Stats */}
                {batchData && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-blue-50">
                                    <BookOpen size={24} className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                                    <p className="text-sm text-gray-500">Total Subjects</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-green-50">
                                    <UserCheck size={24} className="text-green-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{assignedFacultyCount}/{totalCount}</p>
                                    <p className="text-sm text-gray-500">Faculty Assigned</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-purple-50">
                                    <Beaker size={24} className="text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{labSubjectsCount}</p>
                                    <p className="text-sm text-gray-500">Lab Subjects</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-cyan-50">
                                    <Building2 size={24} className="text-cyan-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{assignedLabCount}/{labSubjectsCount}</p>
                                    <p className="text-sm text-gray-500">Labs Assigned</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress Bar */}
                {batchData && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Faculty Assignment Progress</span>
                            <span className="text-sm font-bold text-gray-900">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                        </div>
                    </div>
                )}

                {/* Subjects Table */}
                {loadingSubjects ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <RefreshCw size={32} className="mx-auto text-gray-400 animate-spin mb-3" />
                        <p className="text-gray-500">Loading subjects...</p>
                    </div>
                ) : batchData && batchData.subjects.length > 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-100">
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Hours</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[280px]">Assigned Faculty</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">Lab Room</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {batchData.subjects.map((subject, index) => (
                                        <motion.tr
                                            key={subject.batch_subject_id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="hover:bg-gray-50/50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="font-semibold text-gray-900">{subject.subject_name}</div>
                                                    <div className="text-xs text-gray-500 font-mono mt-0.5">{subject.subject_code}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${subject.is_lab_subject
                                                    ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                                    : 'bg-blue-50 text-blue-700 border border-blue-100'
                                                    }`}>
                                                    {subject.subject_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-gray-700 font-medium">{subject.required_hours}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={assignments[subject.batch_subject_id]?.faculty_id || ''}
                                                    onChange={(e) => handleFacultyChange(
                                                        subject.batch_subject_id,
                                                        e.target.value || null
                                                    )}
                                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none text-sm ${assignments[subject.batch_subject_id]?.faculty_id
                                                        ? 'border-green-200 bg-green-50/50'
                                                        : 'border-orange-200 bg-orange-50/50'
                                                        }`}
                                                >
                                                    <option value="">-- Select Faculty --</option>
                                                    {subject.qualified_faculty.length > 0 ? (
                                                        subject.qualified_faculty.map(faculty => (
                                                            <option key={faculty.faculty_id} value={faculty.faculty_id}>
                                                                {faculty.faculty_name}
                                                                {faculty.is_primary_teacher ? ' ★' : ''}
                                                                {' '}(Level {faculty.proficiency_level})
                                                            </option>
                                                        ))
                                                    ) : (
                                                        <option disabled>No qualified faculty</option>
                                                    )}
                                                </select>
                                                {subject.qualified_faculty.length === 0 && (
                                                    <p className="text-xs text-orange-600 mt-1">
                                                        No faculty qualified. Add qualifications first.
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {subject.is_lab_subject ? (
                                                    <select
                                                        value={assignments[subject.batch_subject_id]?.lab_id || ''}
                                                        onChange={(e) => handleLabChange(
                                                            subject.batch_subject_id,
                                                            e.target.value || null
                                                        )}
                                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400 outline-none text-sm ${assignments[subject.batch_subject_id]?.lab_id
                                                            ? 'border-purple-200 bg-purple-50/50'
                                                            : 'border-gray-200 bg-gray-50/50'
                                                            }`}
                                                    >
                                                        <option value="">-- Select Lab --</option>
                                                        {batchData.lab_rooms.map(lab => (
                                                            <option key={lab.id} value={lab.id}>
                                                                {lab.name}
                                                                {lab.building ? ` (${lab.building})` : ''}
                                                                {' '}- {lab.capacity} seats
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="text-gray-400 text-sm italic">N/A (Theory)</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {assignments[subject.batch_subject_id]?.faculty_id ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                                        <CheckCircle size={14} />
                                                        Done
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                                                        <AlertCircle size={14} />
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : selectedBatchId ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">No subjects found for this batch</p>
                        <p className="text-sm text-gray-400 mt-1">Add subjects to the batch first</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <Users size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">Select a batch to manage faculty assignments</p>
                    </div>
                )}

                {/* Lab Rooms Available */}
                {batchData && batchData.lab_rooms.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Building2 size={20} className="text-purple-600" />
                            Available Lab Rooms ({batchData.lab_rooms.length})
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {batchData.lab_rooms.map(lab => (
                                <div
                                    key={lab.id}
                                    className="p-3 bg-purple-50 rounded-xl border border-purple-100"
                                >
                                    <p className="font-semibold text-purple-900 text-sm">{lab.name}</p>
                                    {lab.building && (
                                        <p className="text-xs text-purple-600">{lab.building}</p>
                                    )}
                                    <p className="text-xs text-purple-500 mt-1">{lab.capacity} seats</p>
                                    <div className="flex gap-1 mt-2">
                                        {lab.has_computers && (
                                            <span className="px-1.5 py-0.5 bg-purple-200 text-purple-700 rounded text-[10px]">PC</span>
                                        )}
                                        {lab.has_lab_equipment && (
                                            <span className="px-1.5 py-0.5 bg-purple-200 text-purple-700 rounded text-[10px]">Equip</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Unsaved Changes Warning */}
                {hasChanges && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="fixed bottom-6 right-6 bg-yellow-50 border border-yellow-200 rounded-xl px-6 py-4 shadow-lg flex items-center gap-4"
                    >
                        <AlertCircle size={20} className="text-yellow-600" />
                        <span className="text-yellow-800 font-medium">You have unsaved changes</span>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Now'}
                        </button>
                    </motion.div>
                )}
            </div>
        </FacultyCreatorLayout>
    );
};

export default FacultyAssignmentsPage;
