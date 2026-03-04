'use client';

import React, { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CardLoader } from '@/components/ui/PageLoader';
import {
  BookOpen,
  Lock,
  CheckCircle,
  AlertCircle,
  Info,
  RefreshCw,
  Loader2,
  GripVertical,
  Clock,
  Trophy,
  Star,
  ChevronDown,
  ChevronUp,
  Send,
  Calendar,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import StudentLayout from '@/components/student/StudentLayout';

interface Subject {
  id: string;
  code: string;
  name: string;
  credit_value: number;
  nep_category: string;
  subject_type: string;
  description?: string;
}

interface Bucket {
  id: string;
  bucket_name: string;
  batch_id: string;
  min_selection: number;
  max_selection: number;
  is_common_slot: boolean;
  is_live_for_students: boolean;
  submission_deadline?: string;
  subjects: Subject[];
  student_choices: {
    id: string;
    subject_id: string;
    priority: number;
    is_allotted: boolean;
    allotment_status: string;
  }[];
  has_submitted: boolean;
  batches?: {
    name: string;
    semester: number;
    academic_year: string;
  };
}

interface PriorityChoice {
  subject_id: string;
  priority: number;
}

export default function NEPElectiveSelection() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Track user's priority selections per bucket
  const [selections, setSelections] = useState<{ [bucketId: string]: PriorityChoice[] }>({});

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'student') {
        router.push('/login');
        return;
      }
      setUser(parsedUser);
      fetchBuckets(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  const fetchBuckets = async (user: any) => {
    try {
      setLoading(true);
      const token = btoa(JSON.stringify({
        id: user.id, user_id: user.id, role: user.role,
        college_id: user.college_id, department_id: user.department_id
      }));
      const authHeaders = { 'Authorization': `Bearer ${token}` };

      // First get batch info
      const dashRes = await fetch(`/api/student/dashboard?userId=${user.id}&role=student`, { headers: authHeaders });
      if (!dashRes.ok) throw new Error('Failed to fetch dashboard');
      const dashData = await dashRes.json();
      const batchId = dashData.additionalData?.batchId;

      // Fetch elective buckets
      const response = await fetch(
        `/api/student/elective-buckets?studentId=${user.id}&batchId=${batchId || ''}`,
        { headers: authHeaders }
      );

      if (response.ok) {
        const data = await response.json();
        setBuckets(data.buckets || []);

        // Initialize selections from existing choices
        const initialSelections: { [bucketId: string]: PriorityChoice[] } = {};
        (data.buckets || []).forEach((bucket: Bucket) => {
          if (bucket.student_choices && bucket.student_choices.length > 0) {
            initialSelections[bucket.id] = bucket.student_choices
              .sort((a, b) => a.priority - b.priority)
              .map(c => ({ subject_id: c.subject_id, priority: c.priority }));
          }
        });
        setSelections(initialSelections);

        // Auto-expand first bucket with available subjects
        const firstLiveBucket = (data.buckets || []).find((b: Bucket) => b.subjects.length > 0);
        if (firstLiveBucket) {
          setExpandedBucket(firstLiveBucket.id);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load elective buckets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectToggle = (bucketId: string, subjectId: string, totalSubjects: number) => {
    setSelections(prev => {
      const current = prev[bucketId] || [];
      const existingIndex = current.findIndex(c => c.subject_id === subjectId);

      if (existingIndex !== -1) {
        // Remove this subject and re-number priorities
        const newChoices = current
          .filter(c => c.subject_id !== subjectId)
          .map((c, idx) => ({ ...c, priority: idx + 1 }));
        return { ...prev, [bucketId]: newChoices };
      } else {
        // Add this subject at the end - allow selecting all subjects for preferences
        const newChoices = [...current, { subject_id: subjectId, priority: current.length + 1 }];
        return { ...prev, [bucketId]: newChoices };
      }
    });
  };

  const handleReorder = (bucketId: string, newOrder: PriorityChoice[]) => {
    // Update priorities based on new order
    const reorderedChoices = newOrder.map((choice, idx) => ({
      ...choice,
      priority: idx + 1
    }));
    setSelections(prev => ({ ...prev, [bucketId]: reorderedChoices }));
  };

  const handleSubmitPreferences = async (bucket: Bucket) => {
    const bucketSelections = selections[bucket.id] || [];

    if (bucketSelections.length < bucket.min_selection) {
      toast.error(`Please select at least ${bucket.min_selection} subject(s)`);
      return;
    }

    // Note: No max_selection check here - students can submit preferences for all subjects
    // The max_selection only limits how many subjects admin will allot

    setSubmitting(bucket.id);
    try {
      const token = btoa(JSON.stringify({
        id: user.id, user_id: user.id, role: user.role,
        college_id: user.college_id, department_id: user.department_id
      }));
      const response = await fetch('/api/student/elective-buckets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          student_id: user.id,
          bucket_id: bucket.id,
          choices: bucketSelections
        })
      });

      if (response.ok) {
        toast.success('Your preferences have been saved!');
        // Refresh data
        fetchBuckets(user);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSubmitting(null);
    }
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: 'Deadline passed', color: 'text-red-600' };
    if (days === 0) return { text: 'Due today!', color: 'text-red-600' };
    if (days <= 2) return { text: `${days} day(s) left`, color: 'text-amber-600' };
    return { text: `${days} days left`, color: 'text-green-600' };
  };

  const getSubjectById = (bucket: Bucket, subjectId: string) => {
    return bucket.subjects.find(s => s.id === subjectId);
  };

  if (loading) {
    return (
      <StudentLayout activeTab="nep-selection">
        <CardLoader message="Loading Elective Buckets" subMessage="Fetching your NEP subject choices..." />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout activeTab="nep-selection">
      <div className="space-y-6 pb-20 lg:pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">NEP Elective Selection</h1>
          <p className="text-gray-500 mt-1">Choose your preferred subjects in order of priority</p>
        </motion.div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-[#CDE8E5] to-[#EEF7FF] rounded-2xl p-5 border border-[#7AB2B2]/30"
        >
          <div className="flex items-start gap-3">
            <Info size={24} className="text-[#4D869C] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-[#4D869C]">How it works</h3>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>1. Select your preferred subjects from each bucket</li>
                <li>2. Drag to reorder them by priority (1 = highest preference)</li>
                <li>3. Submit your preferences before the deadline</li>
                <li>4. Allotments will be based on your CGPA and preferences</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* No Buckets Message */}
        {buckets.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-8 text-center border border-gray-100"
          >
            <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Active Elective Buckets</h3>
            <p className="text-gray-500">
              There are no elective buckets open for selection at this time.
              <br />Check back later or contact your administrator.
            </p>
          </motion.div>
        )}

        {/* Buckets */}
        <div className="space-y-4">
          {buckets.map((bucket, index) => {
            const isExpanded = expandedBucket === bucket.id;
            const bucketSelections = selections[bucket.id] || [];
            const hasSubmitted = bucket.has_submitted;
            const isAllotted = bucket.student_choices?.some(c => c.is_allotted);
            const deadlineInfo = bucket.submission_deadline ? formatDeadline(bucket.submission_deadline) : null;

            return (
              <motion.div
                key={bucket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Bucket Header */}
                <button
                  onClick={() => setExpandedBucket(isExpanded ? null : bucket.id)}
                  className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#4D869C] to-[#7AB2B2] rounded-xl flex items-center justify-center">
                      <BookOpen size={24} className="text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900">{bucket.bucket_name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span>{bucket.subjects.length} subjects</span>
                        <span>•</span>
                        <span>Select {bucket.min_selection === bucket.max_selection
                          ? bucket.min_selection
                          : `${bucket.min_selection}-${bucket.max_selection}`}</span>
                        {bucket.batches && (
                          <>
                            <span>•</span>
                            <span>Sem {bucket.batches.semester}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Badges */}
                    {isAllotted && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                        <CheckCircle size={14} />
                        Allotted
                      </span>
                    )}
                    {hasSubmitted && !isAllotted && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1">
                        <Clock size={14} />
                        Submitted
                      </span>
                    )}
                    {deadlineInfo && (
                      <span className={`px-3 py-1 bg-gray-100 rounded-full text-sm font-medium ${deadlineInfo.color}`}>
                        {deadlineInfo.text}
                      </span>
                    )}

                    {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </div>
                </button>

                {/* Bucket Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div className="p-5">
                      {/* Available Subjects */}
                      <div className="mb-6">
                        <h4 className="text-sm font-bold text-gray-700 mb-3">Available Subjects</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {bucket.subjects.map((subject) => {
                            const isSelected = bucketSelections.some(c => c.subject_id === subject.id);

                            return (
                              <button
                                key={subject.id}
                                onClick={() => handleSubjectToggle(bucket.id, subject.id, bucket.subjects.length)}
                                disabled={isAllotted}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected
                                  ? 'border-[#4D869C] bg-[#CDE8E5]'
                                  : 'border-gray-200 hover:border-[#7AB2B2] bg-white'
                                  } ${isAllotted ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm text-gray-500">{subject.code}</span>
                                      {subject.nep_category && (
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${subject.nep_category === 'MAJOR' ? 'bg-purple-100 text-purple-700' :
                                          subject.nep_category === 'MINOR' ? 'bg-green-100 text-green-700' :
                                            'bg-gray-100 text-gray-600'
                                          }`}>
                                          {subject.nep_category}
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-medium text-gray-900 mt-1">{subject.name}</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                      {subject.credit_value} credits • {subject.subject_type}
                                    </p>
                                  </div>
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#4D869C] bg-[#4D869C]' : 'border-gray-300'
                                    }`}>
                                    {isSelected && <CheckCircle size={14} className="text-white" />}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Priority Order (Draggable) */}
                      {bucketSelections.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-bold text-gray-700 mb-3">
                            Your Priority Order
                            <span className="font-normal text-gray-500 ml-2">(Drag to reorder)</span>
                          </h4>
                          <Reorder.Group
                            axis="y"
                            values={bucketSelections}
                            onReorder={(newOrder) => handleReorder(bucket.id, newOrder)}
                            className="space-y-2"
                          >
                            {bucketSelections.map((choice, idx) => {
                              const subject = getSubjectById(bucket, choice.subject_id);
                              if (!subject) return null;

                              return (
                                <Reorder.Item
                                  key={choice.subject_id}
                                  value={choice}
                                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl cursor-move hover:border-[#4D869C] transition-colors"
                                >
                                  <GripVertical size={18} className="text-gray-400" />
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-[#4D869C]' :
                                    idx === 1 ? 'bg-[#7AB2B2]' : 'bg-gray-400'
                                    }`}>
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">{subject.name}</p>
                                    <p className="text-sm text-gray-500">{subject.code}</p>
                                  </div>
                                  {idx === 0 && (
                                    <Star size={18} className="text-amber-500 fill-amber-500" />
                                  )}
                                </Reorder.Item>
                              );
                            })}
                          </Reorder.Group>
                        </div>
                      )}

                      {/* Submit Button */}
                      {!isAllotted && (
                        <button
                          onClick={() => handleSubmitPreferences(bucket)}
                          disabled={submitting === bucket.id || bucketSelections.length < bucket.min_selection}
                          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#4D869C] text-white rounded-xl font-medium hover:bg-[#3d6b7c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting === bucket.id ? (
                            <>
                              <Loader2 size={20} className="animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Send size={20} />
                              {hasSubmitted ? 'Update Preferences' : 'Submit Preferences'}
                            </>
                          )}
                        </button>
                      )}

                      {/* Allotted Subject Display */}
                      {isAllotted && (
                        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                          <div className="flex items-center gap-3 mb-2">
                            <Trophy size={20} className="text-green-600" />
                            <h4 className="font-bold text-green-800">Subject Allotted!</h4>
                          </div>
                          {bucket.student_choices
                            .filter(c => c.is_allotted)
                            .map(choice => {
                              const subject = getSubjectById(bucket, choice.subject_id);
                              return subject && (
                                <p key={choice.id} className="text-green-700">
                                  You have been allotted: <strong>{subject.name}</strong> ({subject.code})
                                </p>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </StudentLayout>
  );
}
