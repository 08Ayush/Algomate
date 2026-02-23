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
import { AlertCircle, Calendar, TrendingUp, CheckCircle } from "lucide-react";

interface AlreadySubmittedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: {
    score: number;
    totalMarks: number;
    percentage: number;
    submitted_at: string;
  };
}

export function AlreadySubmittedDialog({
  open,
  onOpenChange,
  submission
}: AlreadySubmittedDialogProps) {
  const router = useRouter();

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-yellow-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Already Submitted
          </DialogTitle>
          <DialogDescription className="text-center">
            You have already appeared for this assignment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Score Display */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 text-center border border-green-200">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-gray-600">Your Score</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className={`text-4xl font-bold ${getGradeColor(submission.percentage)}`}>
                {submission.score}
              </span>
              <span className="text-xl text-gray-400">/</span>
              <span className="text-2xl text-gray-600">{submission.totalMarks}</span>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2">
              <TrendingUp className={`h-4 w-4 ${getGradeColor(submission.percentage)}`} />
              <span className={`text-xl font-semibold ${getGradeColor(submission.percentage)}`}>
                {submission.percentage.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Submission Date */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Submitted On</span>
            </div>
            <p className="text-base font-semibold text-gray-900">
              {new Date(submission.submitted_at).toLocaleString('en-US', {
                dateStyle: 'full',
                timeStyle: 'short'
              })}
            </p>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> You cannot retake this assignment as you have already submitted your answers. 
              Your submission has been recorded and will be considered for grading.
            </p>
          </div>
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
