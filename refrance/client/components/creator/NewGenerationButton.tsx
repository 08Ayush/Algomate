import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, GraduationCap, ClipboardList, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ExamInfo {
  id?: string;
  type: 'midterm' | 'endterm';
  subject: string;
  date: string;
  time: string;
  duration: string;
  instructions: string;
  topics: string;
}

interface AssignmentInfo {
  id?: string;
  title: string;
  subject: string;
  dueDate: string;
  dueTime: string;
  description: string;
  submissionFormat: string;
  maxMarks: string;
}

interface NewGenerationButtonProps {
  creatorId?: string;
  departmentId?: string;
}

export const NewGenerationButton: React.FC<NewGenerationButtonProps> = ({ 
  creatorId, 
  departmentId 
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'exam' | 'assignment'>('exam');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Use auth context to get actual user/department IDs
  const actualCreatorId = creatorId || user?.id;
  const actualDepartmentId = departmentId || user?.departments?.[0]?.id;

  // Don't render if user is not a creator mentor
  if (!user || user.role !== 'mentor' || user.mentor_type !== 'creator') {
    return null;
  }

  // Exam form state
  const [examForm, setExamForm] = useState<ExamInfo>({
    type: 'midterm',
    subject: '',
    date: '',
    time: '',
    duration: '',
    instructions: '',
    topics: '',
  });

  // Assignment form state
  const [assignmentForm, setAssignmentForm] = useState<AssignmentInfo>({
    title: '',
    subject: '',
    dueDate: '',
    dueTime: '',
    description: '',
    submissionFormat: '',
    maxMarks: '',
  });

  const resetForms = () => {
    setExamForm({
      type: 'midterm',
      subject: '',
      date: '',
      time: '',
      duration: '',
      instructions: '',
      topics: '',
    });
    setAssignmentForm({
      title: '',
      subject: '',
      dueDate: '',
      dueTime: '',
      description: '',
      submissionFormat: '',
      maxMarks: '',
    });
  };

  const handleExamSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Validate required fields
      if (!examForm.subject || !examForm.date || !examForm.time) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      // Validate that we have necessary auth data
      if (!actualCreatorId || !actualDepartmentId) {
        toast({
          title: "Authentication Error",
          description: "Unable to identify creator or department. Please try logging in again.",
          variant: "destructive",
        });
        return;
      }

      // API call to save exam information
      const response = await fetch('/api/new-generation/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: examForm.type,
          subject: examForm.subject,
          date: examForm.date,
          time: examForm.time,
          duration: examForm.duration,
          instructions: examForm.instructions,
          topics: examForm.topics,
          creator_id: actualCreatorId,
          department_id: actualDepartmentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save exam information');
      }

      const result = await response.json();
      
      toast({
        title: "Exam Information Saved",
        description: `${examForm.type} exam details have been shared with students and publishers.`,
      });
      
      resetForms();
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving exam information:', error);
      toast({
        title: "Error",
        description: "Failed to save exam information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignmentSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Validate required fields
      if (!assignmentForm.title || !assignmentForm.subject || !assignmentForm.dueDate) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      // Validate that we have necessary auth data
      if (!actualCreatorId || !actualDepartmentId) {
        toast({
          title: "Authentication Error",
          description: "Unable to identify creator or department. Please try logging in again.",
          variant: "destructive",
        });
        return;
      }

      // API call to save assignment information
      const response = await fetch('/api/new-generation/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: assignmentForm.title,
          subject: assignmentForm.subject,
          dueDate: assignmentForm.dueDate,
          dueTime: assignmentForm.dueTime,
          description: assignmentForm.description,
          submissionFormat: assignmentForm.submissionFormat,
          maxMarks: assignmentForm.maxMarks,
          creator_id: actualCreatorId,
          department_id: actualDepartmentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save assignment information');
      }

      const result = await response.json();
      
      toast({
        title: "Assignment Information Saved",
        description: `Assignment details have been shared with students and publishers.`,
      });
      
      resetForms();
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving assignment information:', error);
      toast({
        title: "Error",
        description: "Failed to save assignment information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105">
          <Plus className="mr-2 h-5 w-5" />
          New Generation
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Share Information with Students & Publishers
          </DialogTitle>
          <DialogDescription>
            Create and share exam schedules or assignment deadlines with your students and publishing team.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex space-x-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setActiveTab('exam')}
            className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              activeTab === 'exam'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Exam Information</span>
          </button>
          <button
            onClick={() => setActiveTab('assignment')}
            className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              activeTab === 'assignment'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Assignment Deadlines</span>
          </button>
        </div>

        {/* Exam Form */}
        {activeTab === 'exam' && (
          <div className="space-y-6">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Examination Details
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="exam-type" className="text-red-700 dark:text-red-300 font-medium">Exam Type *</Label>
                  <select
                    id="exam-type"
                    value={examForm.type}
                    onChange={(e) => setExamForm({ ...examForm, type: e.target.value as 'midterm' | 'endterm' })}
                    className="flex h-10 w-full rounded-md border border-red-300 dark:border-red-700 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    aria-label="Select exam type"
                  >
                    <option value="midterm">Mid-term Examination</option>
                    <option value="endterm">End-term Examination</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="exam-subject" className="text-red-700 dark:text-red-300 font-medium">Subject *</Label>
                  <Input
                    id="exam-subject"
                    placeholder="e.g., Data Structures and Algorithms"
                    value={examForm.subject}
                    onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                    className="border-red-300 dark:border-red-700 focus-visible:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="exam-date" className="text-red-700 dark:text-red-300 font-medium">Exam Date *</Label>
                  <Input
                    id="exam-date"
                    type="date"
                    value={examForm.date}
                    onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                    className="border-red-300 dark:border-red-700 focus-visible:ring-red-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="exam-time" className="text-red-700 dark:text-red-300 font-medium">Start Time *</Label>
                  <Input
                    id="exam-time"
                    type="time"
                    value={examForm.time}
                    onChange={(e) => setExamForm({ ...examForm, time: e.target.value })}
                    className="border-red-300 dark:border-red-700 focus-visible:ring-red-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="exam-duration" className="text-red-700 dark:text-red-300 font-medium">Duration</Label>
                  <Input
                    id="exam-duration"
                    placeholder="e.g., 3 hours, 180 minutes"
                    value={examForm.duration}
                    onChange={(e) => setExamForm({ ...examForm, duration: e.target.value })}
                    className="border-red-300 dark:border-red-700 focus-visible:ring-red-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="exam-topics" className="text-red-700 dark:text-red-300 font-medium">Topics/Syllabus Coverage</Label>
                  <Textarea
                    id="exam-topics"
                    placeholder="List the topics that will be covered in the exam (e.g., Arrays, Linked Lists, Stacks, Queues, Trees, Graphs)"
                    value={examForm.topics}
                    onChange={(e) => setExamForm({ ...examForm, topics: e.target.value })}
                    rows={3}
                    className="border-red-300 dark:border-red-700 focus-visible:ring-red-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exam-instructions" className="text-red-700 dark:text-red-300 font-medium">Instructions & Guidelines</Label>
                  <Textarea
                    id="exam-instructions"
                    placeholder="Special instructions for students (e.g., Bring calculator, No mobile phones allowed, Open book exam, etc.)"
                    value={examForm.instructions}
                    onChange={(e) => setExamForm({ ...examForm, instructions: e.target.value })}
                    rows={3}
                    className="border-red-300 dark:border-red-700 focus-visible:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleExamSubmit} 
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 text-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-b-transparent mr-2"></div>
                  Publishing Exam Information...
                </>
              ) : (
                <>
                  <GraduationCap className="mr-2 h-5 w-5" />
                  Publish Exam Information
                </>
              )}
            </Button>
          </div>
        )}

        {/* Assignment Form */}
        {activeTab === 'assignment' && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Assignment Details
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="assignment-title" className="text-blue-700 dark:text-blue-300 font-medium">Assignment Title *</Label>
                  <Input
                    id="assignment-title"
                    placeholder="e.g., Database Design and Implementation Project"
                    value={assignmentForm.title}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                    className="border-blue-300 dark:border-blue-700 focus-visible:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="assignment-subject" className="text-blue-700 dark:text-blue-300 font-medium">Subject *</Label>
                  <Input
                    id="assignment-subject"
                    placeholder="e.g., Database Management Systems"
                    value={assignmentForm.subject}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, subject: e.target.value })}
                    className="border-blue-300 dark:border-blue-700 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="assignment-date" className="text-blue-700 dark:text-blue-300 font-medium">Due Date *</Label>
                  <Input
                    id="assignment-date"
                    type="date"
                    value={assignmentForm.dueDate}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
                    className="border-blue-300 dark:border-blue-700 focus-visible:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="assignment-time" className="text-blue-700 dark:text-blue-300 font-medium">Due Time</Label>
                  <Input
                    id="assignment-time"
                    type="time"
                    value={assignmentForm.dueTime}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, dueTime: e.target.value })}
                    className="border-blue-300 dark:border-blue-700 focus-visible:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="assignment-marks" className="text-blue-700 dark:text-blue-300 font-medium">Maximum Marks</Label>
                  <Input
                    id="assignment-marks"
                    placeholder="e.g., 100 points"
                    value={assignmentForm.maxMarks}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, maxMarks: e.target.value })}
                    className="border-blue-300 dark:border-blue-700 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assignment-description" className="text-blue-700 dark:text-blue-300 font-medium">Assignment Description</Label>
                  <Textarea
                    id="assignment-description"
                    placeholder="Describe the assignment requirements, objectives, and guidelines. Include what students need to accomplish, learning outcomes, and any specific requirements."
                    value={assignmentForm.description}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                    rows={4}
                    className="border-blue-300 dark:border-blue-700 focus-visible:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="submission-format" className="text-blue-700 dark:text-blue-300 font-medium">Submission Format & Requirements</Label>
                  <Input
                    id="submission-format"
                    placeholder="e.g., PDF document with code snippets, ZIP file containing source code and report, etc."
                    value={assignmentForm.submissionFormat}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, submissionFormat: e.target.value })}
                    className="border-blue-300 dark:border-blue-700 focus-visible:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleAssignmentSubmit} 
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 text-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-b-transparent mr-2"></div>
                  Publishing Assignment Information...
                </>
              ) : (
                <>
                  <ClipboardList className="mr-2 h-5 w-5" />
                  Publish Assignment Information
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewGenerationButton;