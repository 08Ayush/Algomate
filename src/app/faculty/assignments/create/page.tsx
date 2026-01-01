'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
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

export default function CreateAssignment() {
  const router = useRouter();
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
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
  }, [router]);

  const fetchData = async (userData: User) => {
    try {
      // Fetch batches and subjects assigned to this faculty from scheduled_classes
      const token = btoa(JSON.stringify({ 
        user_id: userData.id, 
        id: userData.id, 
        role: userData.role, 
        college_id: userData.college_id 
      }));
      
      const response = await fetch('/api/faculty/assigned-subjects-batches', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });

      const data = await response.json();

      if (data.success) {
        setBatches(data.batches || []);
        setSubjects(data.subjects || []);
      } else {
        console.error('Failed to fetch assigned data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!title || !batchId || !totalMarks) {
      alert('Please fill in all required fields');
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question');
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
        proctoringEnabled: proctoringEnabled,
        maxViolations: parseInt(maxViolations),
        showResultsImmediately: showResultsImmediately,
        allowReview: allowReview,
        isDraft: isDraft,
        questions
      };

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        alert(isDraft ? 'Assignment saved as draft!' : 'Assignment created successfully!');
        router.push('/faculty/assignments');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Failed to create assignment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 p-8 min-h-screen bg-gray-50 dark:bg-slate-950">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Assignment</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Design a new assignment for your students</p>
                </div>
              </div>
              <button
                onClick={() => handleSubmit(false)}
                className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all transform hover:scale-105 shadow-lg shadow-blue-500/20"
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Create Assignment'}
              </button>
            </div>
          </div>

          <div className="max-w-6xl mx-auto space-y-6">
            {/* Basic Information */}
            <div className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-xl border">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Basic Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter assignment title"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Brief description of the assignment"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assignment Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  >
                    <option value="MCQ" className="bg-white dark:bg-slate-800">MCQ (Multiple Choice)</option>
                    <option value="MSQ" className="bg-white dark:bg-slate-800">MSQ (Multiple Select)</option>
                    <option value="FILL_BLANK" className="bg-white dark:bg-slate-800">Fill in the Blank</option>
                    <option value="ESSAY" className="bg-white dark:bg-slate-800">Essay</option>
                    <option value="CODING" className="bg-white dark:bg-slate-800">Coding</option>
                    <option value="MIXED" className="bg-white dark:bg-slate-800">Mixed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Batch <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  >
                    <option value="" className="bg-white dark:bg-slate-800">Select Batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id} className="bg-white dark:bg-slate-800">
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="" className="bg-white dark:bg-slate-800">Select Subject (Optional)</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id} className="bg-white dark:bg-slate-800">
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Marks <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="100"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Passing Marks</label>
                  <input
                    type="number"
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="40"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="60"
                    min="1"
                  />
                </div>
              </div>
            </div>

            {/* Schedule Settings */}
            <div className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-xl border">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Schedule & Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledEnd}
                    onChange={(e) => setScheduledEnd(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Attempts</label>
                  <input
                    type="number"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Violations</label>
                  <input
                    type="number"
                    value={maxViolations}
                    onChange={(e) => setMaxViolations(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                    min="0"
                    disabled={!proctoringEnabled}
                  />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={proctoringEnabled}
                      onChange={(e) => setProctoringEnabled(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-blue-600 focus:ring-2 focus:ring-blue-500 checked:bg-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      Enable Proctoring (Tab switch detection & auto-submit)
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={showResultsImmediately}
                      onChange={(e) => setShowResultsImmediately(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-blue-600 focus:ring-2 focus:ring-blue-500 checked:bg-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      Show results immediately after submission
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={allowReview}
                      onChange={(e) => setAllowReview(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-blue-600 focus:ring-2 focus:ring-blue-500 checked:bg-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      Allow students to review their answers
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Questions Section */}
            <div className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-xl border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  Questions ({questions.length})
                </h2>
                <button
                  onClick={() => setShowQuestionModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 flex items-center space-x-2 shadow-lg"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                  </svg>
                  <span>Add Question</span>
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
                  <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                    <svg className="w-20 h-20 mx-auto mb-4 opacity-30" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                    </svg>
                    <p>No questions added yet. Click "Add Question" to start.</p>
                  </div>
                ) : (
                  questions.map((q, index) => (
                    <div key={q.id} className="p-5 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-750 rounded-lg border flex items-start justify-between transition-all group">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                            Q{index + 1}
                          </span>
                          <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                            {q.question_type}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {q.marks} marks {q.negative_marking > 0 && `(-${q.negative_marking})`}
                          </span>
                        </div>
                        <p className="text-gray-900 dark:text-white leading-relaxed">{q.question_text}</p>
                        {q.question_data?.options && q.question_data.options.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {q.question_data.options.map((opt: any, i: number) => (
                              <div key={i} className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium text-gray-400 dark:text-gray-500">{String.fromCharCode(65 + i)}.</span>
                                <span>{opt.text}</span>
                                {opt.is_correct && (
                                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                  </svg>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="ml-4 p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pb-8">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all font-medium"
                disabled={saving}
              >
                Cancel
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleSubmit(true)}
                  className="px-6 py-3 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-600 font-medium transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                  disabled={saving}
                >
                  {saving ? 'Creating...' : 'Create Assignment'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
