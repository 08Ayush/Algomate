'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  Download,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  college_uid: string;
}

interface Submission {
  id: string;
  student_id: string;
  submission_status: string;
  submitted_at: string;
  time_taken_seconds: number;
  score: number;
  percentage: number;
  auto_graded: boolean;
  graded_at: string | null;
  student: Student | null;
  answers_count: number;
  requires_manual_grading: boolean;
}

interface AssignmentSubmissionsTableProps {
  submissions: Submission[];
  totalMarks: number;
  passingMarks: number;
}

export function AssignmentSubmissionsTable({ 
  submissions, 
  totalMarks,
  passingMarks 
}: AssignmentSubmissionsTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<'name' | 'score' | 'time' | 'submitted'>('submitted');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'graded' | 'pending'>('all');

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'graded') return submission.graded_at !== null || submission.auto_graded;
    if (filterStatus === 'pending') return submission.requires_manual_grading && !submission.graded_at;
    return true;
  });

  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        const nameA = `${a.student?.first_name} ${a.student?.last_name}`.toLowerCase();
        const nameB = `${b.student?.first_name} ${b.student?.last_name}`.toLowerCase();
        comparison = nameA.localeCompare(nameB);
        break;
      case 'score':
        comparison = (a.score || 0) - (b.score || 0);
        break;
      case 'time':
        comparison = (a.time_taken_seconds || 0) - (b.time_taken_seconds || 0);
        break;
      case 'submitted':
        comparison = new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getGradeColor = (percentage: number) => {
    const passingPercentage = (passingMarks / totalMarks) * 100;
    if (percentage >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 75) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percentage >= passingPercentage) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getTrendIcon = (percentage: number) => {
    const passingPercentage = (passingMarks / totalMarks) * 100;
    if (percentage >= 90) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (percentage >= passingPercentage) return <Minus className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant={filterStatus === 'all' ? 'default' : 'outline'}
          onClick={() => setFilterStatus('all')}
          size="sm"
        >
          All ({submissions.length})
        </Button>
        <Button
          variant={filterStatus === 'graded' ? 'default' : 'outline'}
          onClick={() => setFilterStatus('graded')}
          size="sm"
        >
          Graded ({submissions.filter(s => s.graded_at || s.auto_graded).length})
        </Button>
        <Button
          variant={filterStatus === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilterStatus('pending')}
          size="sm"
        >
          Pending Review ({submissions.filter(s => s.requires_manual_grading && !s.graded_at).length})
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  #
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Student
                    {sortField === 'name' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Roll No
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800"
                  onClick={() => handleSort('score')}
                >
                  <div className="flex items-center gap-2">
                    Score
                    {sortField === 'score' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800"
                  onClick={() => handleSort('time')}
                >
                  <div className="flex items-center gap-2">
                    Time Taken
                    {sortField === 'time' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800"
                  onClick={() => handleSort('submitted')}
                >
                  <div className="flex items-center gap-2">
                    Submitted At
                    {sortField === 'submitted' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {sortedSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No submissions found
                  </td>
                </tr>
              ) : (
                sortedSubmissions.map((submission, index) => (
                  <tr 
                    key={submission.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {submission.student?.first_name} {submission.student?.last_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {submission.student?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {submission.student?.college_uid || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTrendIcon(submission.percentage)}
                        <div>
                          <div className={`text-sm font-bold ${getGradeColor(submission.percentage)}`}>
                            {submission.score}/{totalMarks}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {submission.percentage.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatTime(submission.time_taken_seconds)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(submission.submitted_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {submission.requires_manual_grading && !submission.graded_at ? (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Needs Review
                        </Badge>
                      ) : submission.auto_graded ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Auto-Graded
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Graded
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/faculty/assignments/${submission.id}/review`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
