'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertTriangle, TrendingUp } from "lucide-react";

interface SubmissionResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: {
    score: number;
    totalMarks: number;
    percentage: number;
    status: string;
    autoGraded: boolean;
    timeTaken: number; // in seconds
    violations: number;
  };
}

export function SubmissionResultDialog({
  open,
  onOpenChange,
  result
}: SubmissionResultDialogProps) {
  const router = useRouter();

  // Normalize numeric fields — PostgreSQL DECIMAL columns arrive as strings
  const percentage = Number(result.percentage) || 0;
  const score = Number(result.score) || 0;
  const totalMarks = Number(result.totalMarks) || 0;

  const handleClose = () => {
    onOpenChange(false);
    router.push('/student/dashboard');
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeLabel = (percentage: number) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 75) return 'Very Good';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Pass';
    return 'Needs Improvement';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            🎉 Assignment Submitted Successfully!
          </DialogTitle>
          <DialogDescription className="text-center">
            Your submission has been recorded
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Score Display */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 text-center border border-blue-200">
            <p className="text-sm text-gray-600 mb-2">Your Score</p>
            <div className="flex items-center justify-center gap-2">
              <span className={`text-5xl font-bold ${getGradeColor(percentage)}`}>
                {score}
              </span>
              <span className="text-2xl text-gray-400">/</span>
              <span className="text-3xl text-gray-600">{totalMarks}</span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <TrendingUp className={`h-5 w-5 ${getGradeColor(percentage)}`} />
              <span className={`text-2xl font-semibold ${getGradeColor(percentage)}`}>
                {percentage.toFixed(2)}%
              </span>
            </div>
            <Badge 
              className={`mt-3 ${
                percentage >= 60 
                  ? 'bg-green-100 text-green-800 border-green-300' 
                  : 'bg-yellow-100 text-yellow-800 border-yellow-300'
              }`}
            >
              {getGradeLabel(percentage)}
            </Badge>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium">Time Taken</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {Math.floor(result.timeTaken / 60)}:{(result.timeTaken % 60).toString().padStart(2, '0')} min
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Status</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {result.status}
              </p>
            </div>
          </div>

          {/* Grading Info */}
          <div className={`rounded-lg p-4 border ${
            result.autoGraded 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <p className={`text-sm font-medium ${
              result.autoGraded ? 'text-blue-900' : 'text-yellow-900'
            }`}>
              {result.autoGraded 
                ? '✓ Your assignment has been automatically graded.' 
                : '⏳ Your assignment will be manually graded by faculty.'}
            </p>
          </div>

          {/* Violations Warning */}
          {result.violations > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-900">
                    Proctoring Violations Detected
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    {result.violations} violation(s) recorded during the assignment
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-2">
          <Button 
            onClick={handleClose}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Back to Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
