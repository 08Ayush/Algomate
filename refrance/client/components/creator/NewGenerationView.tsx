import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  ClipboardList, 
  Calendar, 
  Clock, 
  BookOpen, 
  AlertCircle,
  User,
  Building,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface ExamInfo {
  id: string;
  type: 'midterm' | 'endterm';
  subject: string;
  date: string;
  time: string;
  duration?: string;
  instructions?: string;
  topics?: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  created_at: string;
}

interface AssignmentInfo {
  id: string;
  title: string;
  subject: string;
  due_date: string;
  due_time?: string;
  description?: string;
  submission_format?: string;
  max_marks?: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  created_at: string;
}

interface NewGenerationViewProps {
  departmentId?: string;
  userRole?: 'student' | 'publisher' | 'mentor';
}

export const NewGenerationView: React.FC<NewGenerationViewProps> = ({ 
  departmentId = 'temp-department-id',
  userRole = 'student'
}) => {
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [assignments, setAssignments] = useState<AssignmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'exams' | 'assignments'>('upcoming');
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch exam information
      const examResponse = await fetch(`/api/new-generation/exams/${departmentId}`);
      if (examResponse.ok) {
        const examData = await examResponse.json();
        setExams(examData.data || []);
      }

      // Fetch assignment information
      const assignmentResponse = await fetch(`/api/new-generation/assignments/${departmentId}`);
      if (assignmentResponse.ok) {
        const assignmentData = await assignmentResponse.json();
        setAssignments(assignmentData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load exam and assignment information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [departmentId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isUpcoming = (dateString: string) => {
    const today = new Date();
    const itemDate = new Date(dateString);
    return itemDate >= today;
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    const itemDate = new Date(dateString);
    const diffTime = itemDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const upcomingExams = exams.filter(exam => isUpcoming(exam.date)).slice(0, 5);
  const upcomingAssignments = assignments.filter(assignment => isUpcoming(assignment.due_date)).slice(0, 5);

  const ExamCard: React.FC<{ exam: ExamInfo }> = ({ exam }) => (
    <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-red-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-red-500" />
              {exam.subject}
            </CardTitle>
            <Badge variant={exam.type === 'midterm' ? 'default' : 'secondary'} className="mt-2">
              {exam.type === 'midterm' ? 'Mid-term' : 'End-term'} Exam
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              {getDaysUntil(exam.date) === 0 
                ? 'Today' 
                : getDaysUntil(exam.date) === 1 
                ? 'Tomorrow' 
                : `${getDaysUntil(exam.date)} days`
              }
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{formatDate(exam.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{formatTime(exam.time)}</span>
          </div>
        </div>
        
        {exam.duration && (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Duration: {exam.duration}</span>
          </div>
        )}

        {exam.topics && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Topics/Syllabus
            </h4>
            <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">{exam.topics}</p>
          </div>
        )}

        {exam.instructions && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Instructions</h4>
            <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">{exam.instructions}</p>
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Created by {exam.creator.name}</span>
            <span>•</span>
            <span>{new Date(exam.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const AssignmentCard: React.FC<{ assignment: AssignmentInfo }> = ({ assignment }) => (
    <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-500" />
              {assignment.title}
            </CardTitle>
            <Badge variant="outline" className="mt-2 border-blue-200 text-blue-700">
              {assignment.subject}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              Due {getDaysUntil(assignment.due_date) === 0 
                ? 'Today' 
                : getDaysUntil(assignment.due_date) === 1 
                ? 'Tomorrow' 
                : `in ${getDaysUntil(assignment.due_date)} days`
              }
            </div>
            {assignment.max_marks && (
              <div className="text-xs text-muted-foreground">
                Max Marks: {assignment.max_marks}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{formatDate(assignment.due_date)}</span>
          </div>
          {assignment.due_time && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{formatTime(assignment.due_time)}</span>
            </div>
          )}
        </div>

        {assignment.description && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Description</h4>
            <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">{assignment.description}</p>
          </div>
        )}

        {assignment.submission_format && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Submission Format</h4>
            <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">{assignment.submission_format}</p>
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Created by {assignment.creator.name}</span>
            <span>•</span>
            <span>{new Date(assignment.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Academic Information Hub
        </h1>
        <p className="text-muted-foreground">
          Stay updated with the latest exam schedules and assignment deadlines
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
            activeTab === 'upcoming'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertCircle className="h-4 w-4" />
          <span>Upcoming</span>
        </button>
        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
            activeTab === 'exams'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>All Exams</span>
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
            activeTab === 'assignments'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>All Assignments</span>
        </button>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'upcoming' && (
        <div className="space-y-6">
          {upcomingExams.length === 0 && upcomingAssignments.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No upcoming exams or assignments found. Check back later for updates.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {upcomingExams.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-red-500" />
                    Upcoming Exams
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {upcomingExams.map((exam) => (
                      <ExamCard key={exam.id} exam={exam} />
                    ))}
                  </div>
                </div>
              )}

              {upcomingAssignments.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-blue-500" />
                    Upcoming Assignments
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {upcomingAssignments.map((assignment) => (
                      <AssignmentCard key={assignment.id} assignment={assignment} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'exams' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-red-500" />
            All Exams
          </h2>
          {exams.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No exam information available yet.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {exams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-500" />
            All Assignments
          </h2>
          {assignments.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No assignment information available yet.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NewGenerationView;