'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssignmentSubmissionsTable } from "@/components/faculty/AssignmentSubmissionsTable";
import { 
  ArrowLeft, 
  Users, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Download,
  RefreshCw,
  Calendar,
  BookOpen,
  Award
} from "lucide-react";

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

export default function AssignmentReportPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
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
        setSubmissions(data.submissions);
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error fetching assignment report:', error);
      alert('Failed to load assignment report');
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
      `${sub.percentage.toFixed(2)}%`,
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
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex">
          <LeftSidebar />
          <div className="flex-1 p-8 min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!assignment) {
    return (
      <>
        <Header />
        <div className="flex">
          <LeftSidebar />
          <div className="flex-1 p-8 min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="text-center py-12">
              <p className="text-gray-600">Assignment not found</p>
              <Button onClick={() => router.push('/faculty/dashboard')} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 p-8 min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/faculty/dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{assignment.title}</h1>
                <p className="text-gray-600 mt-1">Assignment Report & Analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Assignment Info */}
          <Card className="mb-6 border-l-4 border-l-blue-600">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Subject</p>
                    <p className="font-semibold text-gray-900">{assignment.subject.name}</p>
                    <p className="text-xs text-gray-500">{assignment.subject.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Batch</p>
                    <p className="font-semibold text-gray-900">{assignment.batch.name}</p>
                    <p className="text-xs text-gray-500">Sem {assignment.batch.semester} - {assignment.batch.section}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Award className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Marks</p>
                    <p className="font-semibold text-gray-900">{assignment.total_marks}</p>
                    <p className="text-xs text-gray-500">Passing: {assignment.passing_marks}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-semibold text-gray-900">{assignment.duration_minutes} mins</p>
                    {assignment.proctoring_enabled && (
                      <Badge className="text-xs bg-purple-100 text-purple-800 mt-1">Proctored</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-blue-600">{statistics.total_submissions}</div>
                    <Users className="h-8 w-8 text-blue-200" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Submission Rate: {statistics.submission_rate}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Average Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-green-600">
                      {statistics.average_score}/{assignment.total_marks}
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-200" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {statistics.average_percentage}% Average
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Graded</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-purple-600">{statistics.graded_submissions}</div>
                    <CheckCircle className="h-8 w-8 text-purple-200" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {statistics.total_submissions > 0 
                      ? ((statistics.graded_submissions / statistics.total_submissions) * 100).toFixed(1)
                      : 0}% Complete
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Pending Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-orange-600">{statistics.pending_grading}</div>
                    <Clock className="h-8 w-8 text-orange-200" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Requires manual grading
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Submissions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Student Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AssignmentSubmissionsTable
                submissions={submissions}
                totalMarks={assignment.total_marks}
                passingMarks={assignment.passing_marks}
              />
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
