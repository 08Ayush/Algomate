'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageLoader } from '@/components/ui/PageLoader';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmissionResultDialog } from "@/components/assignment/SubmissionResultDialog";
import { AlreadySubmittedDialog } from "@/components/assignment/AlreadySubmittedDialog";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Circle,
  Maximize,
  Minimize,
  Send
} from "lucide-react";
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface Question {
  id: string;
  question_order: number;
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'FILL_BLANK' | 'ESSAY' | 'CODING';
  marks: number;
  question_data: {
    options?: Array<{ id: string; text: string; is_correct?: boolean }>;
    language?: string;
    starter_code?: string;
  };
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  type: string;
  total_marks: number;
  duration_minutes: number;
  scheduled_start: string;
  scheduled_end: string;
  proctoring_enabled: boolean;
  max_violations: number;
  subjects?: {
    name: string;
    code: string;
  };
}

export default function AssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params?.id as string;
  const { showConfirm } = useConfirm();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showAlreadySubmittedDialog, setShowAlreadySubmittedDialog] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [existingSubmission, setExistingSubmission] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'student') {
      router.push('/login');
      return;
    }

    fetchAssignment(user);
    enterFullScreen();
  }, [assignmentId, router]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0 || !assignment) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, assignment]);

  // Tab visibility detection for proctoring
  useEffect(() => {
    if (!assignment?.proctoring_enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const newViolations = violations + 1;
        setViolations(newViolations);
        setShowWarning(true);

        setTimeout(() => setShowWarning(false), 3000);

        if (newViolations >= (assignment?.max_violations || 3)) {
          alert('Maximum violations reached. Assignment will be auto-submitted.');
          handleSubmit();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [assignment, violations]);

  const fetchAssignment = async (user: any) => {
    try {
      setLoading(true);
      const token = btoa(JSON.stringify({
        user_id: user.id,
        role: user.role,
        college_id: user.college_id
      }));

      const response = await fetch(`/api/student/assignment/${assignmentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check if already submitted
        if (errorData.alreadySubmitted) {
          setExistingSubmission({
            score: errorData.submission.score || 0,
            totalMarks: assignment?.total_marks || 0,
            percentage: errorData.submission.percentage || 0,
            submitted_at: errorData.submission.submitted_at
          });
          setShowAlreadySubmittedDialog(true);
          return;
        }

        throw new Error(errorData.error || 'Failed to fetch assignment');
      }

      const data = await response.json();
      setAssignment(data.assignment);
      setQuestions(data.questions || []);

      // Set initial time
      if (data.assignment.duration_minutes) {
        setTimeRemaining(data.assignment.duration_minutes * 60);
      }
    } catch (error: any) {
      console.error('Error fetching assignment:', error);
      alert(error.message || 'Failed to load assignment');
      router.push('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const enterFullScreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
      });
      setIsFullScreen(true);
    }
  };

  const exitFullScreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  const toggleFullScreen = () => {
    if (isFullScreen) {
      exitFullScreen();
    } else {
      enterFullScreen();
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    showConfirm({
      title: 'Submit Assignment',
      message: 'Are you sure you want to submit this assignment? You cannot change your answers after submission.',
      confirmText: 'Submit',
      onConfirm: async () => {
        setIsSubmitting(true);

        try {
          const userData = localStorage.getItem('user');
          if (!userData) throw new Error('User not found');

          const user = JSON.parse(userData);
          const token = btoa(JSON.stringify({
            user_id: user.id,
            role: user.role,
            college_id: user.college_id
          }));

          const response = await fetch(`/api/student/assignment/${assignmentId}/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              answers,
              time_taken: (assignment?.duration_minutes || 0) * 60 - timeRemaining,
              violations
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to submit assignment');
          }

          const data = await response.json();

          exitFullScreen();

          // Show modern submission dialog
          setSubmissionResult({
            score: data.submission.score,
            totalMarks: assignment?.total_marks || 0,
            percentage: data.submission.percentage,
            status: data.submission.status || 'SUBMITTED',
            autoGraded: data.submission.auto_graded,
            timeTaken: (assignment?.duration_minutes || 0) * 60 - timeRemaining,
            violations: violations
          });
          setShowResultDialog(true);
        } catch (error) {
          console.error('Error submitting assignment:', error);
          alert('Failed to submit assignment. Please try again.');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const isQuestionAnswered = (questionId: string) => {
    const answer = answers[questionId];
    if (!answer) return false;

    if (Array.isArray(answer)) return answer.length > 0;
    if (typeof answer === 'string') return answer.trim().length > 0;
    return true;
  };

  const getQuestionStatusIcon = (question: Question) => {
    if (isQuestionAnswered(question.id)) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    return <Circle className="h-5 w-5 text-gray-400" />;
  };

  if (loading) {
    return <PageLoader message="Loading Assignment" subMessage="Fetching questions and details..." />;
  }

  if (!assignment || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600 mb-4">Assignment not found or no questions available</p>
            <Button onClick={() => router.push('/student/dashboard')} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = questions.filter(q => isQuestionAnswered(q.id)).length;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Submission Result Dialog */}
      {showResultDialog && submissionResult && (
        <SubmissionResultDialog
          open={showResultDialog}
          onOpenChange={setShowResultDialog}
          result={submissionResult}
        />
      )}

      {/* Already Submitted Dialog */}
      {showAlreadySubmittedDialog && existingSubmission && (
        <AlreadySubmittedDialog
          open={showAlreadySubmittedDialog}
          onOpenChange={setShowAlreadySubmittedDialog}
          submission={existingSubmission}
        />
      )}

      {/* Warning Banner for Violations */}
      {showWarning && assignment.proctoring_enabled && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-3 z-50 flex items-center justify-center gap-2 animate-pulse">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-semibold">
            Warning! Tab switch detected. Violations: {violations}/{assignment.max_violations}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{assignment.title}</h1>
              <div className="flex gap-4 text-sm text-gray-600 mt-1">
                <span>{assignment.subjects?.name} • {assignment.total_marks} marks</span>
                {assignment.scheduled_end && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Ends: {new Date(assignment.scheduled_end).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-[#CDE8E5] text-[#4D869C]'
                }`}>
                <Clock className="h-5 w-5" />
                <span className="font-mono text-lg font-bold">
                  {formatTime(timeRemaining)}
                </span>
              </div>

              <Button
                onClick={toggleFullScreen}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                {isFullScreen ? 'Exit' : 'Enter'} Fullscreen
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 flex gap-4">
        {/* Main Question Area */}
        <div className="flex-1">
          <Card className="min-h-[600px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Question {currentQuestion.question_order}
                  <Badge variant="secondary">{currentQuestion.marks} marks</Badge>
                  <Badge variant="outline">{currentQuestion.question_type}</Badge>
                </CardTitle>
                <div className="text-sm text-gray-600">
                  {answeredCount} of {questions.length} answered
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question Text */}
              <div className="prose max-w-none">
                <p className="text-lg text-gray-800 whitespace-pre-wrap">
                  {currentQuestion.question_text}
                </p>
              </div>

              {/* Answer Section based on Question Type */}
              <div className="space-y-4">
                {/* MCQ - Single Choice */}
                {currentQuestion.question_type === 'MCQ' && (
                  <div className="space-y-3">
                    {currentQuestion.question_data.options?.map((option) => (
                      <label
                        key={option.id}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${answers[currentQuestion.id] === option.id
                          ? 'border-[#4D869C] bg-[#CDE8E5]'
                          : 'border-gray-200 hover:border-[#7AB2B2] hover:bg-gray-50'
                          }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={option.id}
                          checked={answers[currentQuestion.id] === option.id}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                          className="h-4 w-4 text-[#4D869C]"
                        />
                        <span className="flex-1 text-gray-800">{option.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* MSQ - Multiple Choice */}
                {currentQuestion.question_type === 'MSQ' && (
                  <div className="space-y-3">
                    {currentQuestion.question_data.options?.map((option) => {
                      const selectedOptions = answers[currentQuestion.id] || [];
                      const isSelected = selectedOptions.includes(option.id);

                      return (
                        <label
                          key={option.id}
                          className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${isSelected
                            ? 'border-[#4D869C] bg-[#CDE8E5]'
                            : 'border-gray-200 hover:border-[#7AB2B2] hover:bg-gray-50'
                            }`}
                        >
                          <input
                            type="checkbox"
                            value={option.id}
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = e.target.checked
                                ? [...selectedOptions, option.id]
                                : selectedOptions.filter((id: string) => id !== option.id);
                              handleAnswerChange(currentQuestion.id, newSelected);
                            }}
                            className="h-4 w-4 text-[#4D869C] rounded"
                          />
                          <span className="flex-1 text-gray-800">{option.text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Essay Type */}
                {currentQuestion.question_type === 'ESSAY' && (
                  <textarea
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Type your essay answer here..."
                    className="w-full h-48 p-4 border-2 border-gray-200 rounded-lg focus:border-[#4D869C] focus:outline-none resize-none"
                  />
                )}

                {/* Coding Type */}
                {currentQuestion.question_type === 'CODING' && (
                  <div className="space-y-2">
                    <div className="bg-gray-800 text-gray-200 py-2 px-4 rounded-t-lg text-sm font-mono">
                      {currentQuestion.question_data.language || 'Code'}
                    </div>
                    <textarea
                      value={answers[currentQuestion.id] || currentQuestion.question_data.starter_code || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Write your code here..."
                      className="w-full h-64 p-4 border-2 border-gray-200 rounded-b-lg font-mono bg-gray-50 focus:border-[#4D869C] focus:outline-none focus:bg-white resize-none"
                      spellCheck="false"
                    />
                  </div>
                )}

                {/* Fill in the Blank */}
                {currentQuestion.question_type === 'FILL_BLANK' && (
                  <input
                    type="text"
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-[#4D869C] focus:outline-none"
                  />
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                {isLastQuestion ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Question Navigation Sidebar */}
        <div className="w-80">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-sm">Question Navigator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {questions.map((question, index) => (
                  <button
                    key={question.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`h-10 rounded-lg font-semibold transition-all ${index === currentQuestionIndex
                      ? 'bg-[#4D869C] text-white ring-2 ring-[#7AB2B2]'
                      : isQuestionAnswered(question.id)
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {question.question_order}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="space-y-2 text-sm border-t pt-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 bg-[#4D869C] rounded"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 bg-green-100 rounded"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 bg-gray-100 rounded"></div>
                  <span>Not Answered</span>
                </div>
              </div>

              {/* Progress Summary */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Answered:</span>
                  <span className="font-semibold">{answeredCount}/{questions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Not Answered:</span>
                  <span className="font-semibold">{questions.length - answeredCount}</span>
                </div>
                {assignment.proctoring_enabled && (
                  <div className="flex justify-between">
                    <span>Violations:</span>
                    <span className="font-semibold text-red-600">
                      {violations}/{assignment.max_violations}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
