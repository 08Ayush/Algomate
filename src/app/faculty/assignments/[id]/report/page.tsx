'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';
import {
  ArrowLeft,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  Download,
  RefreshCw,
  BookOpen,
  Award,
  FileText,
  Eye
} from "lucide-react";
import toast from 'react-hot-toast';

interface Assignment {
  id: string;
  title: string;
  description: string;
  total_marks: number;
  passing_marks: number;
  duration_minutes: number;
  batch: {
    name: string;
    semester: number;
    section: string;
  };
  subject: {
    name: string;
    code: string;
  };
  created_at: string;
  scheduled_start: string;
  scheduled_end: string;
  proctoring_enabled: boolean;
}

interface Statistics {
  total_submissions: number;
  graded_submissions: number;
  pending_grading: number;
  average_score: string;
  average_percentage: string;
  submission_rate: string;
}

interface Submission {
  id: string;
  student: {
    first_name: string;
    last_name: string;
    email: string;
    college_uid: string;
  };
  score: number;
  percentage: number;
  time_taken_seconds: number;
  submitted_at: string;
  requires_manual_grading: boolean;
  graded_at: string | null;
}

export default function AssignmentReportPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'faculty') {
      router.push('/login');
      return;
    }

    fetchAssignmentReport(user);
  }, [assignmentId, router]);

  const fetchAssignmentReport = async (user: any) => {
    try {
      setLoading(true);
      const token = btoa(JSON.stringify({
        user_id: user.id,
        id: user.id,
        role: user.role,
        college_id: user.college_id
      }));

      const response = await fetch(`/api/faculty/assignment/${assignmentId}/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assignment report');
      }

      const data = await response.json();
      if (data.success) {
        setAssignment(data.assignment);
        setSubmissions(data.submissions || []);
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error fetching assignment report:', error);
      toast.error('Failed to load assignment report');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const userData = localStorage.getItem('user');
    if (userData) {
      await fetchAssignmentReport(JSON.parse(userData));
    }
    setRefreshing(false);
  };

  const handleExportCSV = () => {
    if (!submissions.length || !assignment) return;

    const headers = ['Student Name', 'Roll No', 'Email', 'Score', 'Percentage', 'Time Taken', 'Submitted At', 'Status'];
    const rows = submissions.map(sub => [
      `${sub.student?.first_name} ${sub.student?.last_name}`,
      sub.student?.college_uid || 'N/A',
      sub.student?.email,
      `${sub.score}/${assignment.total_marks}`,
      `${sub.percentage?.toFixed(2) || 0}%`,
      `${Math.floor(sub.time_taken_seconds / 60)}m ${sub.time_taken_seconds % 60}s`,
      new Date(sub.submitted_at).toLocaleString(),
      sub.requires_manual_grading && !sub.graded_at ? 'Pending' : 'Graded'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assignment.title}_submissions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  if (loading) {
    return (
      <FacultyCreatorLayout activeTab="assignments">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center bg-white rounded-2xl p-10 shadow-lg">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#4D869C] border-t-transparent mx-auto"></div>
            <p className="mt-6 text-gray-600 font-medium">Loading report...</p>
          </div>
        </div>
      </FacultyCreatorLayout>
    );
  }

  if (!assignment) {
    return (
      <FacultyCreatorLayout activeTab="assignments">
        <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
          <FileText size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600 text-lg">Assignment not found</p>
          <button
            onClick={() => router.push('/faculty/assignments')}
            className="mt-4 flex items-center gap-2 mx-auto px-5 py-3 bg-[#4D869C] text-white rounded-xl font-medium hover:shadow-lg"
          >
            <ArrowLeft size={18} />
            Back to Assignments
          </button>
        </div>
      </FacultyCreatorLayout>
    );
  }

  return (
    <FacultyCreatorLayout activeTab="assignments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/faculty/assignments')}
              className="p-2 hover:bg-white rounded-xl transition-colors"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{assignment.title}</h1>
              <p className="text-gray-600">Assignment Report & Analytics</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white disabled:opacity-50"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-semibold hover:shadow-lg"
            >
              <Download size={18} /> Export CSV
            </button>
          </div>
        </div>

        {/* Assignment Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-l-[#4D869C]"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100">
                <BookOpen size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Subject</p>
                <p className="font-semibold text-gray-900">{assignment.subject?.name || 'N/A'}</p>
                <p className="text-xs text-gray-400">{assignment.subject?.code || ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100">
                <Users size={24} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Batch</p>
                <p className="font-semibold text-gray-900">{assignment.batch?.name || 'N/A'}</p>
                <p className="text-xs text-gray-400">
                  {assignment.batch?.semester ? `Sem ${assignment.batch.semester}` : ''}
                  {assignment.batch?.section ? ` - ${assignment.batch.section}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100">
                <Award size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Marks</p>
                <p className="font-semibold text-gray-900">{assignment.total_marks}</p>
                <p className="text-xs text-gray-400">Passing: {assignment.passing_marks}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-100">
                <Clock size={24} className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-semibold text-gray-900">{assignment.duration_minutes} mins</p>
                {assignment.proctoring_enabled && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Proctored</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Submissions</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{statistics.total_submissions}</p>
                  <p className="text-xs text-gray-400 mt-1">Rate: {statistics.submission_rate}%</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-100">
                  <Users size={28} className="text-blue-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Average Score</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{statistics.average_score}/{assignment.total_marks}</p>
                  <p className="text-xs text-gray-400 mt-1">{statistics.average_percentage}% Average</p>
                </div>
                <div className="p-3 rounded-xl bg-green-100">
                  <TrendingUp size={28} className="text-green-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Graded</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">{statistics.graded_submissions}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {statistics.total_submissions > 0
                      ? ((statistics.graded_submissions / statistics.total_submissions) * 100).toFixed(1)
                      : 0}% Complete
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-purple-100">
                  <CheckCircle size={28} className="text-purple-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Review</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">{statistics.pending_grading}</p>
                  <p className="text-xs text-gray-400 mt-1">Requires grading</p>
                </div>
                <div className="p-3 rounded-xl bg-orange-100">
                  <Clock size={28} className="text-orange-600" />
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Submissions Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users size={20} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Student Submissions</h2>
            </div>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No submissions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Roll No</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Percentage</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Time Taken</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Submitted</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions.map((sub, i) => (
                    <motion.tr
                      key={sub.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {sub.student?.first_name} {sub.student?.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{sub.student?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{sub.student?.college_uid || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">{sub.score}</span>
                        <span className="text-gray-400">/{assignment.total_marks}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-medium ${(sub.percentage || 0) >= (assignment.passing_marks / assignment.total_marks * 100)
                            ? 'text-green-600'
                            : 'text-red-600'
                          }`}>
                          {sub.percentage?.toFixed(1) || 0}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {Math.floor(sub.time_taken_seconds / 60)}m {sub.time_taken_seconds % 60}s
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(sub.submitted_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${sub.requires_manual_grading && !sub.graded_at
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                          }`}>
                          {sub.requires_manual_grading && !sub.graded_at ? 'Pending' : 'Graded'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </FacultyCreatorLayout>
  );
}
