'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, FileText, Clock, HelpCircle, Save, Send, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';
import QuestionModal from '@/components/QuestionModal';

interface User {
    id: string;
    role: string;
    college_id: string;
    department_id?: string;
}

interface Batch {
    id: string;
    name: string;
}

interface Subject {
    id: string;
    name: string;
    code: string;
}

interface Question {
    id: string;
    question_text: string;
    question_type: 'MCQ' | 'MSQ' | 'FILL_BLANK' | 'ESSAY' | 'CODING';
    marks: number;
    negative_marking: number;
    question_data: any;
}

export default function EditAssignment() {
    const router = useRouter();
    const params = useParams();
    const assignmentId = params?.id as string;

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'MCQ' | 'MSQ' | 'FILL_BLANK' | 'ESSAY' | 'CODING' | 'MIXED'>('MCQ');
    const [batchId, setBatchId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [totalMarks, setTotalMarks] = useState('');
    const [passingMarks, setPassingMarks] = useState('');
    const [durationMinutes, setDurationMinutes] = useState('');
    const [scheduledStart, setScheduledStart] = useState('');
    const [scheduledEnd, setScheduledEnd] = useState('');
    const [maxAttempts, setMaxAttempts] = useState('1');
    const [proctoringEnabled, setProctoringEnabled] = useState(false);
    const [maxViolations, setMaxViolations] = useState('3');
    const [showResultsImmediately, setShowResultsImmediately] = useState(false);
    const [allowReview, setAllowReview] = useState(true);

    // Data lists
    const [batches, setBatches] = useState<Batch[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);

    // Question form state
    const [showQuestionModal, setShowQuestionModal] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return;
        }

        try {
            const parsedUser = JSON.parse(userData);
            if (parsedUser.role !== 'faculty') {
                router.push('/login');
                return;
            }

            setUser(parsedUser);
            fetchData(parsedUser);
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('user');
            router.push('/login');
        }
    }, [router, assignmentId]);

    const fetchData = async (userData: User) => {
        try {
            const token = btoa(JSON.stringify({
                user_id: userData.id,
                id: userData.id,
                role: userData.role,
                college_id: userData.college_id,
                department_id: userData.department_id
            }));

            // Fetch batches and subjects
            const subjectsResponse = await fetch('/api/faculty/assigned-subjects-batches', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const subjectsData = await subjectsResponse.json();
            if (subjectsData.success) {
                setBatches(subjectsData.batches || []);
                setSubjects(subjectsData.subjects || []);
            }

            // Fetch assignment details
            const assignmentResponse = await fetch(`/api/assignments/${assignmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const assignmentData = await assignmentResponse.json();

            if (assignmentData.success && assignmentData.assignment) {
                const a = assignmentData.assignment;
                setTitle(a.title || '');
                setDescription(a.description || '');
                setType(a.type || 'MCQ');
                setBatchId(a.batch_id || '');
                setSubjectId(a.subject_id || '');
                setTotalMarks(a.total_marks?.toString() || '');
                setPassingMarks(a.passing_marks?.toString() || '');
                setDurationMinutes(a.duration_minutes?.toString() || '');
                setScheduledStart(a.scheduled_start ? new Date(a.scheduled_start).toISOString().slice(0, 16) : '');
                setScheduledEnd(a.scheduled_end ? new Date(a.scheduled_end).toISOString().slice(0, 16) : '');
                setMaxAttempts(a.max_attempts?.toString() || '1');
                setProctoringEnabled(a.proctoring_enabled || false);
                setMaxViolations(a.max_violations?.toString() || '3');
                setShowResultsImmediately(a.show_results_immediately || false);
                setAllowReview(a.allow_review !== false);
                setQuestions(a.questions || []);
            } else {
                toast.error('Assignment not found');
                router.push('/faculty/assignments');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load assignment');
        } finally {
            setLoading(false);
        }
    };

    const addQuestion = (questionData: any) => {
        const newQuestion: Question = {
            id: Date.now().toString(),
            ...questionData
        };
        setQuestions([...questions, newQuestion]);
        setShowQuestionModal(false);
        toast.success('Question added');
    };

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
        toast.success('Question removed');
    };

    const handleSubmit = async (isDraft: boolean) => {
        if (!title || !batchId || !totalMarks) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (questions.length === 0) {
            toast.error('Please add at least one question');
            return;
        }

        setSaving(true);
        try {
            const token = btoa(JSON.stringify({
                user_id: user!.id,
                id: user!.id,
                role: user!.role,
                college_id: user!.college_id
            }));

            const payload = {
                title,
                description,
                type,
                batchId,
                subjectId: subjectId || null,
                totalMarks: parseFloat(totalMarks),
                passingMarks: passingMarks ? parseFloat(passingMarks) : null,
                durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
                scheduledStart: scheduledStart || null,
                scheduledEnd: scheduledEnd || null,
                maxAttempts: parseInt(maxAttempts),
                proctoringEnabled,
                maxViolations: parseInt(maxViolations),
                showResultsImmediately,
                allowReview,
                isDraft,
                questions
            };

            const response = await fetch(`/api/assignments/${assignmentId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Assignment updated successfully!');
                router.push('/faculty/assignments');
            } else {
                toast.error('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error updating assignment:', error);
            toast.error('Failed to update assignment');
        } finally {
            setSaving(false);
        }
    };

    const getQuestionTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            'MCQ': 'bg-blue-100 text-blue-700',
            'MSQ': 'bg-purple-100 text-purple-700',
            'FILL_BLANK': 'bg-orange-100 text-orange-700',
            'ESSAY': 'bg-green-100 text-green-700',
            'CODING': 'bg-red-100 text-red-700'
        };
        return colors[type] || 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return (
            <FacultyCreatorLayout activeTab="assignments">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center bg-white rounded-2xl p-10 shadow-lg">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#4D869C] border-t-transparent mx-auto"></div>
                        <p className="mt-6 text-gray-600 font-medium">Loading assignment...</p>
                    </div>
                </div>
            </FacultyCreatorLayout>
        );
    }

    const calculatedMarks = questions.reduce((sum, q) => sum + q.marks, 0);

    return (
        <FacultyCreatorLayout activeTab="assignments">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-white rounded-xl transition-colors"
                        >
                            <ArrowLeft size={24} className="text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900">Edit Assignment</h1>
                            <p className="text-gray-600">Modify your assignment details</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleSubmit(true)}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                            <Save size={18} /> Save Draft
                        </button>
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50"
                        >
                            <Send size={18} /> {saving ? 'Saving...' : 'Update Assignment'}
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Basic Info & Settings */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Information */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl shadow-lg p-6"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-blue-100">
                                    <FileText size={20} className="text-blue-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
                                        placeholder="Enter assignment title"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none transition-all resize-none"
                                        placeholder="Brief description of the assignment"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Assignment Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as any)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        required
                                    >
                                        <option value="MCQ">MCQ (Multiple Choice)</option>
                                        <option value="MSQ">MSQ (Multiple Select)</option>
                                        <option value="FILL_BLANK">Fill in the Blank</option>
                                        <option value="ESSAY">Essay</option>
                                        <option value="CODING">Coding</option>
                                        <option value="MIXED">Mixed</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Batch <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={batchId}
                                        onChange={(e) => setBatchId(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        required
                                    >
                                        <option value="">Select Batch</option>
                                        {batches.map((batch) => (
                                            <option key={batch.id} value={batch.id}>{batch.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                                    <select
                                        value={subjectId}
                                        onChange={(e) => setSubjectId(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none"
                                    >
                                        <option value="">Select Subject (Optional)</option>
                                        {subjects.map((subject) => (
                                            <option key={subject.id} value={subject.id}>{subject.name} ({subject.code})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (minutes)</label>
                                    <input
                                        type="number"
                                        value={durationMinutes}
                                        onChange={(e) => setDurationMinutes(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        placeholder="60"
                                        min="1"
                                    />
                                </div>
                            </div>
                        </motion.div>

                        {/* Schedule & Settings */}
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
                                <h2 className="text-xl font-bold text-gray-900">Schedule & Settings</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={scheduledStart}
                                        onChange={(e) => setScheduledStart(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">End Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={scheduledEnd}
                                        onChange={(e) => setScheduledEnd(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Max Attempts</label>
                                    <input
                                        type="number"
                                        value={maxAttempts}
                                        onChange={(e) => setMaxAttempts(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        min="1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Max Violations</label>
                                    <input
                                        type="number"
                                        value={maxViolations}
                                        onChange={(e) => setMaxViolations(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none disabled:opacity-50"
                                        min="0"
                                        disabled={!proctoringEnabled}
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-100">
                                    <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={proctoringEnabled}
                                            onChange={(e) => setProctoringEnabled(e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-[#4D869C] focus:ring-[#4D869C]"
                                        />
                                        <div>
                                            <span className="text-gray-900 font-medium">Enable Proctoring</span>
                                            <p className="text-sm text-gray-500">Tab switch detection & auto-submit on violations</p>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={showResultsImmediately}
                                            onChange={(e) => setShowResultsImmediately(e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-[#4D869C] focus:ring-[#4D869C]"
                                        />
                                        <div>
                                            <span className="text-gray-900 font-medium">Show Results Immediately</span>
                                            <p className="text-sm text-gray-500">Display score right after submission</p>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={allowReview}
                                            onChange={(e) => setAllowReview(e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-[#4D869C] focus:ring-[#4D869C]"
                                        />
                                        <div>
                                            <span className="text-gray-900 font-medium">Allow Review</span>
                                            <p className="text-sm text-gray-500">Let students review their answers</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </motion.div>

                        {/* Questions Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-2xl shadow-lg p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-purple-100">
                                        <HelpCircle size={20} className="text-purple-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Questions</h2>
                                        <p className="text-sm text-gray-500">{questions.length} question{questions.length !== 1 ? 's' : ''} added</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowQuestionModal(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#4D869C] text-white rounded-xl font-medium hover:shadow-lg transition-all"
                                >
                                    <Plus size={18} /> Add Question
                                </button>
                            </div>

                            {/* Question Modal */}
                            <QuestionModal
                                isOpen={showQuestionModal}
                                onClose={() => setShowQuestionModal(false)}
                                onSave={addQuestion}
                                questionType={type as any}
                            />

                            {/* Questions List */}
                            <div className="space-y-3">
                                {questions.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                                        <HelpCircle size={40} className="mx-auto mb-3 text-gray-300" />
                                        <p className="text-gray-500">No questions added yet</p>
                                        <p className="text-sm text-gray-400 mt-1">Click "Add Question" to start building your assignment</p>
                                    </div>
                                ) : (
                                    questions.map((q, index) => (
                                        <motion.div
                                            key={q.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="p-5 bg-gray-50 hover:bg-gray-100 rounded-xl flex items-start justify-between transition-all group"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className="bg-[#4D869C] text-white text-xs font-bold px-3 py-1 rounded-full">
                                                        Q{index + 1}
                                                    </span>
                                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${getQuestionTypeColor(q.question_type)}`}>
                                                        {q.question_type}
                                                    </span>
                                                    <span className="text-sm text-gray-600 font-medium">
                                                        {q.marks} marks {q.negative_marking > 0 && <span className="text-red-500">(-{q.negative_marking})</span>}
                                                    </span>
                                                </div>
                                                <p className="text-gray-900 leading-relaxed">{q.question_text}</p>
                                                {q.question_data?.options && q.question_data.options.length > 0 && (
                                                    <div className="mt-3 space-y-1.5">
                                                        {q.question_data.options.map((opt: any, i: number) => (
                                                            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                                                <span className="font-medium text-gray-400 w-6">{String.fromCharCode(65 + i)}.</span>
                                                                <span className={opt.is_correct ? 'text-green-700 font-medium' : ''}>{opt.text}</span>
                                                                {opt.is_correct && <CheckCircle size={14} className="text-green-500" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeQuestion(q.id)}
                                                className="ml-4 p-2 text-red-400 hover:bg-red-100 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column - Summary Card */}
                    <div className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-2xl shadow-lg p-6 sticky top-[90px]"
                        >
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Assignment Summary</h3>

                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Total Marks <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={totalMarks}
                                        onChange={(e) => setTotalMarks(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none text-lg font-bold"
                                        placeholder="100"
                                        min="0"
                                        required
                                    />
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Passing Marks</label>
                                    <input
                                        type="number"
                                        value={passingMarks}
                                        onChange={(e) => setPassingMarks(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#4D869C] outline-none"
                                        placeholder="40"
                                        min="0"
                                    />
                                </div>

                                <div className="border-t border-gray-100 pt-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Questions:</span>
                                        <span className="font-bold text-gray-900">{questions.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Calculated Marks:</span>
                                        <span className={`font-bold ${calculatedMarks === parseFloat(totalMarks) ? 'text-green-600' : 'text-orange-500'}`}>
                                            {calculatedMarks}
                                        </span>
                                    </div>
                                    {calculatedMarks !== parseFloat(totalMarks) && totalMarks && (
                                        <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                                            <AlertCircle size={16} />
                                            <span>Question marks don't match total</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Duration:</span>
                                        <span className="font-bold text-gray-900">{durationMinutes ? `${durationMinutes} min` : 'Not set'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Proctoring:</span>
                                        <span className={`font-bold ${proctoringEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                                            {proctoringEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 space-y-3">
                                    <button
                                        onClick={() => handleSubmit(true)}
                                        disabled={saving}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <Save size={18} /> Save as Draft
                                    </button>
                                    <button
                                        onClick={() => handleSubmit(false)}
                                        disabled={saving}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50"
                                    >
                                        <Send size={18} /> {saving ? 'Saving...' : 'Update Assignment'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </FacultyCreatorLayout>
    );
}
