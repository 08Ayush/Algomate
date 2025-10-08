import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Eye, 
  CheckCircle, 
  Edit, 
  Clock, 
  Calendar, 
  User, 
  ArrowRight,
  AlertTriangle,
  MessageSquare,
  Filter,
  Search
} from "lucide-react";
import { useAuth, useDepartmentAccess } from "@/contexts/AuthContext";
import { useNavigate } from "@/lib/navigation";
import { TimetableStore, type GeneratedTimetable } from "@shared/timetable-store";

interface PendingTimetable {
  id: number;
  name: string;
  creator_name: string;
  creator_id: number;
  department: string;
  finalized_at: string;
  quality_score: number;
  workflow_stage: 'finalized' | 'under_review';
  message?: string;
  conflicts_count: number;
  classes_count: number;
}

export default function PublisherReviewPage() {
  const { user, isPublisherMentor } = useAuth();
  const { getMentorDepartments } = useDepartmentAccess();
  const navigate = useNavigate();

  const [selectedTimetable, setSelectedTimetable] = useState<GeneratedTimetable | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'edit'>('approve');
  const [approvalMessage, setApprovalMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review' | 'approved'>('all');
  const [realTimetables, setRealTimetables] = useState<GeneratedTimetable[]>([]);
  const [viewTimetableModal, setViewTimetableModal] = useState<GeneratedTimetable | null>(null);

  // Load real timetables from store and set up auto-refresh
  React.useEffect(() => {
    const loadTimetables = () => {
      const store = TimetableStore.getInstance();
      
      // Clear any old test data first
      store.clear();
      
      const timetables = store.getAllTimetables();
      setRealTimetables(timetables);
      console.log('📋 HOD Review - Loaded timetables for publisher review:', {
        count: timetables.length,
        timetables: timetables.map(t => ({
          id: t.id,
          batchName: t.batchName,
          status: t.status,
          creator: t.creatorName,
          hasHybridData: !!t.hybridTimetableData,
          timetableDataCount: t.timetableData?.length || 0,
          hybridDataStructure: t.hybridTimetableData ? Object.keys(t.hybridTimetableData) : []
        }))
      });
    };

    loadTimetables();
    
    // Auto-refresh every 5 seconds to pick up new timetables
    const interval = setInterval(loadTimetables, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Mock pending timetables
  const mockPendingTimetables: PendingTimetable[] = [
    {
      id: 1,
      name: 'Computer Science - Semester 1 2024',
      creator_name: 'Dr. John Smith',
      creator_id: 2,
      department: 'Computer Science',
      finalized_at: '2024-01-15T14:30:00Z',
      quality_score: 0.87,
      workflow_stage: 'finalized',
      message: 'Please review the updated lab timings for Data Structures.',
      conflicts_count: 2,
      classes_count: 45
    },
    {
      id: 2,
      name: 'Mechanical Engineering - Semester 2 2024',
      creator_name: 'Prof. Mike Brown',
      creator_id: 4,
      department: 'Mechanical Engineering',
      finalized_at: '2024-01-14T10:15:00Z',
      quality_score: 0.92,
      workflow_stage: 'under_review',
      message: 'All constraints have been addressed as discussed.',
      conflicts_count: 0,
      classes_count: 38
    },
    {
      id: 3,
      name: 'Computer Science - Lab Schedule Update',
      creator_name: 'Dr. John Smith',
      creator_id: 2,
      department: 'Computer Science',
      finalized_at: '2024-01-13T16:45:00Z',
      quality_score: 0.79,
      workflow_stage: 'finalized',
      conflicts_count: 5,
      classes_count: 28
    }
  ];

  // Check if user has publisher permissions
  if (!user || !isPublisherMentor()) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-4">
              This interface is only available to Faculty Mentor 1 (Publisher) users.
            </p>
            <Button onClick={() => navigate('/timetables')} variant="outline">
              View Timetables
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredTimetables = realTimetables.filter(timetable => {
    const matchesSearch = timetable.batchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         timetable.creatorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'pending_review' && timetable.status === 'pending_review') ||
                         (statusFilter === 'approved' && timetable.status === 'approved');
    return matchesSearch && matchesStatus;
  });

  const handleReviewTimetable = (timetable: GeneratedTimetable) => {
    navigate(`/timetables/${timetable.id}/edit`);
  };

  const handleApprovalAction = (action: 'approve' | 'edit', timetable: GeneratedTimetable) => {
    setSelectedTimetable(timetable);
    setApprovalAction(action);
    setIsApprovalDialogOpen(true);
  };

  const executeApproval = () => {
    if (!selectedTimetable) return;

    const store = TimetableStore.getInstance();

    if (approvalAction === 'approve') {
      // Approve and publish directly
      const success = store.updateTimetableStatus(selectedTimetable.id, 'approved', approvalMessage);
      if (success) {
        console.log('✅ Timetable approved and published:', selectedTimetable.id);
        alert(`Timetable for ${selectedTimetable.batchName} has been approved and published successfully!`);
        
        // Refresh the timetables list
        const updatedTimetables = store.getAllTimetables();
        setRealTimetables(updatedTimetables);
      }
    } else {
      // Mark as needs revision and navigate to edit
      store.updateTimetableStatus(selectedTimetable.id, 'needs_revision', approvalMessage);
      navigate(`/timetables/${selectedTimetable.id}/edit`);
    }
    
    setIsApprovalDialogOpen(false);
    setApprovalMessage('');
    setSelectedTimetable(null);
  };

  const getWorkflowBadge = (stage: string) => {
    switch (stage) {
      case 'pending_review':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending Review</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'needs_revision':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Needs Revision</Badge>;
      default:
        return <Badge variant="secondary">{stage}</Badge>;
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.8) return 'text-blue-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Timetable Review Queue</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve timetables submitted by Creator Mentors
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Publisher Mode
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{realTimetables.filter(t => t.status === 'pending_review').length}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{realTimetables.filter(t => t.status === 'approved').length}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{realTimetables.reduce((sum, t) => sum + (t.metrics.totalConstraints - t.metrics.constraintsSatisfied), 0)}</p>
                <p className="text-sm text-muted-foreground">Total Conflicts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {realTimetables.length > 0 ? Math.round(realTimetables.reduce((sum, t) => sum + t.qualityScore, 0) / realTimetables.length * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Avg Quality</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search timetables or creators..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border rounded-md bg-background"
                title="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
              </select>
              <Button 
                variant="outline" 
                onClick={() => {
                  const store = TimetableStore.getInstance();
                  const timetables = store.getAllTimetables();
                  setRealTimetables(timetables);
                  console.log('🔄 Refreshed timetables:', timetables);
                }}
                className="ml-2"
              >
                Refresh
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => {
                  const store = TimetableStore.getInstance();
                  // Create a test timetable to verify workflow
                  const testTimetable: GeneratedTimetable = {
                    id: `test-${Date.now()}`,
                    batchId: 'CSE-2025-A',
                    batchName: 'CSE 2025 Batch A (Test)',
                    creatorId: 'creator-1',
                    creatorName: 'Test Creator',
                    department: 'Computer Science',
                    academicYear: '2025-26',
                    semester: '3',
                    strategy: 'sequential',
                    executionTime: 2500,
                    qualityScore: 0.87,
                    generatedAt: new Date().toISOString(),
                    sentToPublishersAt: new Date().toISOString(),
                    status: 'pending_review',
                    timetableData: [],
                    hybridTimetableData: {
                      timeSlots: ['9:00-10:00', '10:00-11:00', '11:15-12:15', '12:15-1:15', '2:15-3:15', '3:15-4:15', '4:30-5:30'],
                      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                      timetable: {
                        Monday: {
                          '9:00-10:00': { course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', faculty: 'Dr. Manoj V. Bramhe', room: 'BF-01', color: 'bg-blue-100 text-blue-800' },
                          '10:00-11:00': { course_code: '25CE302T', course_title: 'Data Structure & Problem Solving', faculty: 'Dr. Sunil M. Wanjari', room: 'BF-02', color: 'bg-green-100 text-green-800' },
                          '11:15-12:15': { course_code: '25CE303T', course_title: 'Object Oriented Programming', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-purple-100 text-purple-800' },
                          '12:15-1:15': { type: 'break', course_title: 'Lunch Break' },
                          '2:15-3:15': { course_code: '25CE304T', course_title: 'Digital Logic Design', faculty: 'Mr. Dhiraj R. Gupta', room: 'BF-01', color: 'bg-orange-100 text-orange-800' },
                          '3:15-4:15': { course_code: '25CE305T', course_title: 'Environmental Studies', faculty: 'Dr. Yogesh G. Golhar', room: 'BF-02', color: 'bg-red-100 text-red-800' },
                          '4:30-5:30': { course_code: '25CE306P', course_title: 'Data Structure Lab', faculty: 'Dr. Sunil M. Wanjari', room: 'LAB-B', color: 'bg-indigo-100 text-indigo-800' }
                        },
                        Tuesday: {
                          '9:00-10:00': { course_code: '25CE302T', course_title: 'Data Structure & Problem Solving', faculty: 'Dr. Sunil M. Wanjari', room: 'BF-02', color: 'bg-green-100 text-green-800' },
                          '10:00-11:00': { course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', faculty: 'Dr. Manoj V. Bramhe', room: 'BF-01', color: 'bg-blue-100 text-blue-800' },
                          '11:15-12:15': { course_code: '25CE307P', course_title: 'Programming Lab', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-teal-100 text-teal-800' },
                          '12:15-1:15': { type: 'break', course_title: 'Lunch Break' },
                          '2:15-3:15': { course_code: '25CE303T', course_title: 'Object Oriented Programming', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-purple-100 text-purple-800' },
                          '3:15-4:15': { course_code: '25CE304T', course_title: 'Digital Logic Design', faculty: 'Mr. Dhiraj R. Gupta', room: 'BF-01', color: 'bg-orange-100 text-orange-800' },
                          '4:30-5:30': { course_code: '25CE305T', course_title: 'Environmental Studies', faculty: 'Dr. Yogesh G. Golhar', room: 'BF-02', color: 'bg-red-100 text-red-800' }
                        },
                        Wednesday: {
                          '9:00-10:00': { course_code: '25CE303T', course_title: 'Object Oriented Programming', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-purple-100 text-purple-800' },
                          '10:00-11:00': { course_code: '25CE306P', course_title: 'Data Structure Lab', faculty: 'Dr. Sunil M. Wanjari', room: 'LAB-B', color: 'bg-indigo-100 text-indigo-800' },
                          '11:15-12:15': { course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', faculty: 'Dr. Manoj V. Bramhe', room: 'BF-01', color: 'bg-blue-100 text-blue-800' },
                          '12:15-1:15': { type: 'break', course_title: 'Lunch Break' },
                          '2:15-3:15': { course_code: '25CE305T', course_title: 'Environmental Studies', faculty: 'Dr. Yogesh G. Golhar', room: 'BF-02', color: 'bg-red-100 text-red-800' },
                          '3:15-4:15': { course_code: '25CE302T', course_title: 'Data Structure & Problem Solving', faculty: 'Dr. Sunil M. Wanjari', room: 'BF-02', color: 'bg-green-100 text-green-800' },
                          '4:30-5:30': { course_code: '25CE304T', course_title: 'Digital Logic Design', faculty: 'Mr. Dhiraj R. Gupta', room: 'BF-01', color: 'bg-orange-100 text-orange-800' }
                        },
                        Thursday: {
                          '9:00-10:00': { course_code: '25CE304T', course_title: 'Digital Logic Design', faculty: 'Mr. Dhiraj R. Gupta', room: 'BF-01', color: 'bg-orange-100 text-orange-800' },
                          '10:00-11:00': { course_code: '25CE305T', course_title: 'Environmental Studies', faculty: 'Dr. Yogesh G. Golhar', room: 'BF-02', color: 'bg-red-100 text-red-800' },
                          '11:15-12:15': { course_code: '25CE302T', course_title: 'Data Structure & Problem Solving', faculty: 'Dr. Sunil M. Wanjari', room: 'BF-02', color: 'bg-green-100 text-green-800' },
                          '12:15-1:15': { type: 'break', course_title: 'Lunch Break' },
                          '2:15-3:15': { course_code: '25CE307P', course_title: 'Programming Lab', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-teal-100 text-teal-800' },
                          '3:15-4:15': { course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', faculty: 'Dr. Manoj V. Bramhe', room: 'BF-01', color: 'bg-blue-100 text-blue-800' },
                          '4:30-5:30': { course_code: '25CE303T', course_title: 'Object Oriented Programming', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-purple-100 text-purple-800' }
                        },
                        Friday: {
                          '9:00-10:00': { course_code: '25CE305T', course_title: 'Environmental Studies', faculty: 'Dr. Yogesh G. Golhar', room: 'BF-02', color: 'bg-red-100 text-red-800' },
                          '10:00-11:00': { course_code: '25CE304T', course_title: 'Digital Logic Design', faculty: 'Mr. Dhiraj R. Gupta', room: 'BF-01', color: 'bg-orange-100 text-orange-800' },
                          '11:15-12:15': { course_code: '25CE306P', course_title: 'Data Structure Lab', faculty: 'Dr. Sunil M. Wanjari', room: 'LAB-B', color: 'bg-indigo-100 text-indigo-800' },
                          '12:15-1:15': { type: 'break', course_title: 'Lunch Break' },
                          '2:15-3:15': { course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', faculty: 'Dr. Manoj V. Bramhe', room: 'BF-01', color: 'bg-blue-100 text-blue-800' },
                          '3:15-4:15': { course_code: '25CE303T', course_title: 'Object Oriented Programming', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-purple-100 text-purple-800' },
                          '4:30-5:30': { course_code: '25CE307P', course_title: 'Programming Lab', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-teal-100 text-teal-800' }
                        },
                        Saturday: {
                          '9:00-10:00': { course_code: '25CE302T', course_title: 'Data Structure & Problem Solving', faculty: 'Dr. Sunil M. Wanjari', room: 'BF-02', color: 'bg-green-100 text-green-800' },
                          '10:00-11:00': { course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', faculty: 'Dr. Manoj V. Bramhe', room: 'BF-01', color: 'bg-blue-100 text-blue-800' },
                          '11:15-12:15': { course_code: '25CE303T', course_title: 'Object Oriented Programming', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-purple-100 text-purple-800' },
                          '12:15-1:15': { type: 'break', course_title: 'Lunch Break' },
                          '2:15-3:15': { course_code: '25CE305T', course_title: 'Environmental Studies', faculty: 'Dr. Yogesh G. Golhar', room: 'BF-02', color: 'bg-red-100 text-red-800' },
                          '3:15-4:15': { course_code: '25CE306P', course_title: 'Data Structure Lab', faculty: 'Dr. Sunil M. Wanjari', room: 'LAB-B', color: 'bg-indigo-100 text-indigo-800' },
                          '4:30-5:30': { course_code: '25CE307P', course_title: 'Programming Lab', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-teal-100 text-teal-800' }
                        }
                      }
                    },
                    metrics: {
                      cpSatSolutions: 15,
                      gaGenerations: 100,
                      constraintsSatisfied: 87,
                      totalConstraints: 100
                    }
                  };
                  
                  store.addTimetableForReview(testTimetable);
                  const timetables = store.getAllTimetables();
                  setRealTimetables(timetables);
                  console.log('🧪 Added test timetable for workflow verification:', testTimetable);
                }}
                className="ml-2"
              >
                Hybrid Timetable
              </Button>
              <div className="text-sm text-muted-foreground ml-2">
                {realTimetables.length} total • {filteredTimetables.length} filtered
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timetables List */}
      <div className="space-y-4">
        {filteredTimetables.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Timetables Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters.' 
                  : 'No timetables are currently awaiting your review.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTimetables.map((timetable) => (
            <Card key={timetable.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{timetable.batchName}</h3>
                      {getWorkflowBadge(timetable.status)}
                      {(timetable.metrics.totalConstraints - timetable.metrics.constraintsSatisfied) > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {timetable.metrics.totalConstraints - timetable.metrics.constraintsSatisfied} conflicts
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Created by {timetable.creatorName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Generated {new Date(timetable.generatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${getQualityColor(timetable.qualityScore)}`}>
                          Quality: {(timetable.qualityScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {timetable.publisherComments && (
                      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg mb-3">
                        <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">Publisher Comments:</p>
                          <p className="text-sm text-muted-foreground">{timetable.publisherComments}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{timetable.timetableData.length} classes scheduled</span>
                      <span>•</span>
                      <span>{timetable.department} Department</span>
                      <span>•</span>
                      <span>Strategy: {timetable.strategy}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      onClick={() => setViewTimetableModal(timetable)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Timetable
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleApprovalAction('edit', timetable)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit & Publish
                    </Button>
                    
                    <Button
                      onClick={() => handleApprovalAction('approve', timetable)}
                      disabled={(timetable.metrics.totalConstraints - timetable.metrics.constraintsSatisfied) > 0}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve & Publish
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approve & Publish Timetable' : 'Edit & Publish Timetable'}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === 'approve' 
                ? 'This will publish the timetable without modifications.'
                : 'You will be taken to the editor to make changes before publishing.'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTimetable && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">{selectedTimetable.batchName}</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Creator: {selectedTimetable.creatorName}</p>
                  <p>Quality Score: {(selectedTimetable.qualityScore * 100).toFixed(0)}%</p>
                  <p>Classes: {selectedTimetable.timetableData.length}</p>
                  {(selectedTimetable.metrics.totalConstraints - selectedTimetable.metrics.constraintsSatisfied) > 0 && (
                    <p className="text-red-600 font-medium">
                      ⚠️ {selectedTimetable.metrics.totalConstraints - selectedTimetable.metrics.constraintsSatisfied} conflicts detected
                    </p>
                  )}
                </div>
              </div>

              {(selectedTimetable.metrics.totalConstraints - selectedTimetable.metrics.constraintsSatisfied) > 0 && approvalAction === 'approve' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This timetable has unresolved conflicts. Consider editing before publishing.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="approval-message">Publication Notes (Optional)</Label>
                <Textarea
                  id="approval-message"
                  value={approvalMessage}
                  onChange={(e) => setApprovalMessage(e.target.value)}
                  placeholder="Add any notes about this publication..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={executeApproval}>
                  {approvalAction === 'approve' ? 'Publish Now' : 'Continue to Editor'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Timetable Modal */}
      <Dialog open={!!viewTimetableModal} onOpenChange={() => setViewTimetableModal(null)}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Calendar className="h-5 w-5" />
              Generated Timetable - {viewTimetableModal?.batchName}
            </DialogTitle>
            <DialogDescription>
              Review the AI-generated timetable for {viewTimetableModal?.batchName} ({viewTimetableModal?.academicYear})
            </DialogDescription>
          </DialogHeader>

          {viewTimetableModal && (
            <div className="flex-1 overflow-auto">
              {/* Timetable Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Quality Score</p>
                  <p className="text-xl font-bold text-blue-900">
                    {(viewTimetableModal.qualityScore * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Classes Scheduled</p>
                  <p className="text-xl font-bold text-green-900">
                    {viewTimetableModal.timetableData.length}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Strategy Used</p>
                  <p className="text-xl font-bold text-purple-900">
                    {viewTimetableModal.strategy}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">Execution Time</p>
                  <p className="text-xl font-bold text-orange-900">
                    {viewTimetableModal.executionTime}s
                  </p>
                </div>
              </div>

              {/* Timetable Grid */}
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 text-left font-medium text-gray-700 border-b">Time</th>
                      <th className="p-3 text-left font-medium text-gray-700 border-b">Monday</th>
                      <th className="p-3 text-left font-medium text-gray-700 border-b">Tuesday</th>
                      <th className="p-3 text-left font-medium text-gray-700 border-b">Wednesday</th>
                      <th className="p-3 text-left font-medium text-gray-700 border-b">Thursday</th>
                      <th className="p-3 text-left font-medium text-gray-700 border-b">Friday</th>
                      <th className="p-3 text-left font-medium text-gray-700 border-b">Saturday</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['9:00-10:00', '10:00-11:00', '11:15-12:15', '12:15-1:15', '2:15-3:15', '3:15-4:15', '4:30-5:30'].map((timeSlot) => (
                      <tr key={timeSlot} className="border-b">
                        <td className="p-3 font-medium text-gray-700 bg-gray-50">{timeSlot}</td>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                          // Check if we have rich hybrid timetable data
                          let classForSlot = null;
                          
                          if (viewTimetableModal.hybridTimetableData?.timetable) {
                            // Use the rich format from hybrid scheduler
                            const hybridEntry = viewTimetableModal.hybridTimetableData.timetable[day]?.[timeSlot];
                            if (hybridEntry && hybridEntry.type !== 'break' && hybridEntry.name !== 'Lunch Break' && hybridEntry.course_title !== 'Lunch Break') {
                              classForSlot = {
                                subject: hybridEntry.course_title || hybridEntry.name,
                                faculty: hybridEntry.faculty,
                                room: hybridEntry.room,
                                code: hybridEntry.course_code || hybridEntry.code,
                                color: hybridEntry.color,
                                type: hybridEntry.course_code?.includes('P') || hybridEntry.code?.includes('LAB') ? 'lab' : 'lecture'
                              };
                            } else if (hybridEntry?.type === 'break') {
                              classForSlot = { isBreak: true, name: hybridEntry.course_title || hybridEntry.name };
                            }
                          } else {
                            // Fallback to simple format
                            classForSlot = viewTimetableModal.timetableData.find(
                              (entry) => entry.day === day && entry.time === timeSlot
                            );
                          }
                          
                          return (
                            <td key={day} className="p-3 border-l">
                              {classForSlot?.isBreak ? (
                                <div className="p-2 bg-gray-100 rounded text-center">
                                  <p className="text-sm text-gray-600 italic">{classForSlot.name}</p>
                                </div>
                              ) : classForSlot ? (
                                <div className={`p-2 rounded border-l-4 ${
                                  classForSlot.color || 'bg-blue-50 border-blue-400'
                                }`}>
                                  <p className="font-medium text-sm">
                                    {classForSlot.code ? `${classForSlot.code}` : ''}
                                  </p>
                                  <p className="font-medium text-sm text-blue-900">
                                    {classForSlot.subject}
                                  </p>
                                  <p className="text-xs text-blue-600">
                                    {classForSlot.faculty} • {classForSlot.room}
                                  </p>
                                  <Badge 
                                    variant="secondary" 
                                    className="text-xs mt-1"
                                  >
                                    {classForSlot.type}
                                  </Badge>
                                </div>
                              ) : (
                                <div className="p-2 text-gray-400 text-sm">Free</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleApprovalAction('approve', viewTimetableModal)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Publish
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleApprovalAction('edit', viewTimetableModal)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Request Changes
                  </Button>
                </div>
                <Button variant="outline" onClick={() => setViewTimetableModal(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}