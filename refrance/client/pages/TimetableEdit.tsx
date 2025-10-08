import React, { useState } from 'react';
import { useParams, useNavigate } from '@/lib/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  Edit, 
  Send, 
  CheckCircle, 
  Clock, 
  User, 
  ArrowLeft, 
  Save, 
  AlertTriangle,
  Eye,
  MessageSquare
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, NotificationService } from "@/contexts/NotificationContext";
import { useToast } from "@/hooks/use-toast";
import { ChangeTrackingService, useChangeTracking } from "@/services/ChangeTrackingService";
import TimetableEditor from "@/components/timetable/TimetableEditor";
import { ChangeTracking } from "@/components/timetable/ChangeTracking";
import { useGetTimetableByIdQuery } from "@/store/api";

export default function TimetableEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isCreatorMentor, isPublisherMentor } = useAuth();
  const { addNotification } = useNotifications();
  const { toast } = useToast();
  const { logChange } = useChangeTracking();
  
  const { data: timetableData, isLoading } = useGetTimetableByIdQuery(parseInt(id || '0'), {
    skip: !id
  });

  const [isFinalizingDraft, setIsFinalizingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [finalizeMessage, setFinalizeMessage] = useState('');
  const [publishMessage, setPublishMessage] = useState('');
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  // Mock data for demonstration
  const mockTimetable: {
    id: number;
    name: string;
    status: "Draft" | "Pending Approval" | "Approved" | "Archived";
    workflow_status: "draft" | "under_review" | "published" | "archived";
    workflow_stage: "creation" | "finalized" | "under_review" | "published";
    quality_score: number;
    created_by: number;
    approved_by: number;
    creator_id: number;
    publisher_id: number;
    department_id: string;
    created_at: string;
    finalized_at: string | null;
    approved_at: string | null;
    last_modified_at: string;
    version: number;
  } = {
    id: parseInt(id || '0'),
    name: 'Computer Science - Semester 1 Timetable',
    status: 'Draft',
    workflow_status: 'draft',
    workflow_stage: 'creation',
    quality_score: 0.85,
    created_by: 2,
    approved_by: 3,
    creator_id: 2,
    publisher_id: 3,
    department_id: '1',
    created_at: '2024-01-15T10:00:00Z',
    finalized_at: null,
    approved_at: null,
    last_modified_at: '2024-01-15T14:30:00Z',
    version: 1
  };

  const mockClasses = [
    {
      id: 1,
      timetable_id: parseInt(id || '0'),
      subject_id: 1,
      faculty_id: 1,
      batch_id: 1,
      classroom_id: 1,
      time_slot_id: 1,
      class_type: 'lecture' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      timetable_id: parseInt(id || '0'),
      subject_id: 2,
      faculty_id: 2,
      batch_id: 1,
      classroom_id: 2,
      time_slot_id: 6,
      class_type: 'lab' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  const mockFaculty = [
    { id: 1, name: 'Dr. John Smith', employee_id: 'FAC001', department_id: 1, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    { id: 2, name: 'Prof. Jane Wilson', employee_id: 'FAC002', department_id: 1, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }
  ];

  const mockSubjects = [
    { id: 1, name: 'Data Structures', code: 'CS201', department_id: 1, credits: 4, lectures_per_week: 3, labs_per_week: 1, requires_lab: true, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    { id: 2, name: 'Algorithms', code: 'CS202', department_id: 1, credits: 3, lectures_per_week: 3, labs_per_week: 0, requires_lab: false, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }
  ];

  const mockClassrooms = [
    { id: 1, room_number: 'Room 101', building: 'Main Building', capacity: 60, type: 'lecture' as const, has_projector: true, has_smartboard: true, has_ac: true, has_computer_lab: false, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    { id: 2, room_number: 'Lab 201', building: 'Main Building', capacity: 30, type: 'lab' as const, has_projector: false, has_smartboard: false, has_ac: true, has_computer_lab: true, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }
  ];

  const mockBatches = [
    { 
      id: 1, 
      name: 'CS-2023-A', 
      batch_code: 'CS23A',
      department_id: 1,
      year: 2023,
      semester: 1,
      strength: 45,
      academic_year: '2023-24',
      intake_year: 2023,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading timetable...</div>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Timetable Not Found</h2>
          <Button onClick={() => navigate('/timetables')}>Back to Timetables</Button>
        </div>
      </div>
    );
  }

  const canEdit = () => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    // Creator can edit during creation, finalized stages, and after publication
    if (isCreatorMentor() && mockTimetable.creator_id === parseInt(user.id)) {
      return ['creation', 'finalized', 'published'].includes(mockTimetable.workflow_stage);
    }
    
    // Publisher can edit during under_review stage and after publication
    if (isPublisherMentor() && mockTimetable.publisher_id === parseInt(user.id)) {
      return ['under_review', 'published'].includes(mockTimetable.workflow_stage);
    }
    
    return false;
  };

  const canFinalize = () => {
    return isCreatorMentor() && 
           mockTimetable.creator_id === parseInt(user?.id || '0') && 
           mockTimetable.workflow_stage === 'creation';
  };

  const canPublish = () => {
    return isPublisherMentor() && 
           mockTimetable.publisher_id === parseInt(user?.id || '0') && 
           ['finalized', 'under_review'].includes(mockTimetable.workflow_stage);
  };

  const handleFinalizeDraft = async () => {
    setIsFinalizingDraft(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update timetable status
      mockTimetable.workflow_stage = 'finalized';
      mockTimetable.workflow_status = 'under_review';
      mockTimetable.finalized_at = new Date().toISOString();
      
      // Send notification to Publisher
      if (mockTimetable.publisher_id) {
        const notificationData = NotificationService.sendDraftReadyNotification(
          parseInt(user!.id),
          mockTimetable.publisher_id,
          mockTimetable.id,
          mockTimetable.name
        );
        addNotification(notificationData);
      }

      // Log the change
      const changeLog = ChangeTrackingService.logTimetableFinalized(
        mockTimetable.id,
        parseInt(user!.id),
        `${user!.first_name} ${user!.last_name}`,
        `${user!.role} ${user!.mentor_type || ''}`.trim(),
        finalizeMessage
      );
      logChange(changeLog);
      
      toast({
        title: "Success",
        description: "Timetable finalized and sent for approval.",
      });
      
      navigate('/timetables');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to finalize timetable. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFinalizingDraft(false);
      setShowFinalizeDialog(false);
      setFinalizeMessage('');
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update timetable status
      mockTimetable.workflow_stage = 'published';
      mockTimetable.workflow_status = 'published';
      mockTimetable.status = 'Approved';
      mockTimetable.approved_at = new Date().toISOString();
      
      // Send notification to Creator
      if (mockTimetable.creator_id) {
        const notificationData = NotificationService.sendPublishedNotification(
          parseInt(user!.id),
          mockTimetable.creator_id,
          mockTimetable.id,
          mockTimetable.name
        );
        addNotification(notificationData);
      }

      // Log the change
      const changeLog = ChangeTrackingService.logTimetablePublished(
        mockTimetable.id,
        parseInt(user!.id),
        `${user!.first_name} ${user!.last_name}`,
        `${user!.role} ${user!.mentor_type || ''}`.trim(),
        publishMessage
      );
      logChange(changeLog);
      
      toast({
        title: "Success",
        description: "Timetable approved and published successfully.",
      });
      
      navigate('/timetables');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish timetable. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
      setShowPublishDialog(false);
      setPublishMessage('');
    }
  };

  const getWorkflowBadge = () => {
    switch (mockTimetable.workflow_stage) {
      case 'creation':
        return <Badge variant="secondary">In Creation</Badge>;
      case 'finalized':
        return <Badge variant="outline">Awaiting Approval</Badge>;
      case 'under_review':
        return <Badge variant="default">Under Review</Badge>;
      case 'published':
        return <Badge variant="default" className="bg-green-100 text-green-800">Published</Badge>;
      default:
        return <Badge variant="secondary">{mockTimetable.workflow_stage}</Badge>;
    }
  };

  const getStatusIcon = () => {
    switch (mockTimetable.workflow_stage) {
      case 'creation':
        return <Edit className="h-4 w-4" />;
      case 'finalized':
        return <Send className="h-4 w-4" />;
      case 'under_review':
        return <Eye className="h-4 w-4" />;
      case 'published':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/timetables')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{mockTimetable.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusIcon()}
              {getWorkflowBadge()}
              <span className="text-sm text-muted-foreground">
                Quality Score: {(mockTimetable.quality_score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {canFinalize() && (
            <Button onClick={() => setShowFinalizeDialog(true)}>
              <Send className="h-4 w-4 mr-2" />
              Finalize & Send for Approval
            </Button>
          )}
          
          {canPublish() && (
            <Button onClick={() => setShowPublishDialog(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve & Publish
            </Button>
          )}
        </div>
      </div>

      {/* Workflow Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workflow Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg border ${
              mockTimetable.workflow_stage === 'creation' ? 'border-primary bg-primary/5' : 'border-muted'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Edit className="h-4 w-4" />
                <span className="font-medium">Creation</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {mockTimetable.workflow_stage === 'creation' ? 'Currently editing' : 'Completed'}
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              mockTimetable.workflow_stage === 'finalized' ? 'border-primary bg-primary/5' : 'border-muted'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Send className="h-4 w-4" />
                <span className="font-medium">Finalized</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {mockTimetable.finalized_at ? 'Sent for approval' : 'Pending finalization'}
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              mockTimetable.workflow_stage === 'under_review' ? 'border-primary bg-primary/5' : 'border-muted'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4" />
                <span className="font-medium">Under Review</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {mockTimetable.workflow_stage === 'under_review' ? 'Being reviewed' : 'Awaiting review'}
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              mockTimetable.workflow_stage === 'published' ? 'border-green-300 bg-green-50' : 'border-muted'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Published</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {mockTimetable.approved_at ? 'Live and active' : 'Awaiting publication'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Post-Publication Editing Alert */}
      {mockTimetable.workflow_stage === 'published' && canEdit() && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Post-Publication Editing:</strong> This timetable is currently published and live. 
            Any changes you make will be immediately visible to all users. The other mentor will be 
            automatically notified of your modifications.
          </AlertDescription>
        </Alert>
      )}

      {/* Timetable Editor with Change Tracking */}
      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editor">Timetable Editor</TabsTrigger>
          <TabsTrigger value="history">Change History</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          <TimetableEditor
            classes={mockClasses}
            faculty={mockFaculty}
            subjects={mockSubjects}
            classrooms={mockClassrooms}
            batches={mockBatches}
            timetableId={mockTimetable.id}
            isReadOnly={!canEdit()}
            onClassUpdated={(classData) => {
              // Handle class updates
              console.log('Class updated:', classData);
              
              // Log the change
              const changeLog = ChangeTrackingService.logClassUpdated(
                mockTimetable.id,
                parseInt(user!.id),
                `${user!.first_name} ${user!.last_name}`,
                `${user!.role} ${user!.mentor_type || ''}`.trim(),
                {}, // Would be the old data in real implementation
                classData
              );
              logChange(changeLog);
              
              // If this is a post-publication edit, notify the other mentor
              if (mockTimetable.workflow_stage === 'published') {
                const otherMentorId = isCreatorMentor() 
                  ? mockTimetable.approved_by || mockTimetable.publisher_id 
                  : mockTimetable.created_by || mockTimetable.creator_id;
                
                if (otherMentorId && otherMentorId !== parseInt(user?.id || '0')) {
                  const notificationData = NotificationService.sendUpdatedNotification(
                    parseInt(user!.id),
                    otherMentorId,
                    mockTimetable.id,
                    mockTimetable.name
                  );
                  addNotification(notificationData);
                }
              }
            }}
            onSave={() => {
              // Handle save
              console.log('Timetable saved');
              
              const isPostPublicationEdit = mockTimetable.workflow_stage === 'published';
              
              toast({
                title: "Success",
                description: isPostPublicationEdit 
                  ? "Timetable updated successfully. The other mentor has been notified."
                  : "Timetable saved successfully.",
              });
            }}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <ChangeTracking 
            timetableId={mockTimetable.id} 
            timetableName={mockTimetable.name}
          />
        </TabsContent>
      </Tabs>

      {/* Finalize Dialog */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Draft</DialogTitle>
            <DialogDescription>
              This will send the timetable to Faculty Mentor 1 (Publisher) for review and approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                value={finalizeMessage}
                onChange={(e) => setFinalizeMessage(e.target.value)}
                placeholder="Add any notes for the reviewer..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleFinalizeDraft} disabled={isFinalizingDraft}>
                {isFinalizingDraft ? 'Finalizing...' : 'Finalize & Send'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve & Publish Timetable</DialogTitle>
            <DialogDescription>
              This will make the timetable live and visible to all students and faculty.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Once published, the timetable will be visible to all users. You can still make edits after publication.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="publishMessage">Publication Notes (Optional)</Label>
              <Textarea
                id="publishMessage"
                value={publishMessage}
                onChange={(e) => setPublishMessage(e.target.value)}
                placeholder="Add any notes about this publication..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? 'Publishing...' : 'Approve & Publish'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}