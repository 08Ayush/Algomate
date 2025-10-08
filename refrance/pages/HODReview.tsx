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
import { useNavigate } from "react-router-dom";

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

  const [selectedTimetable, setSelectedTimetable] = useState<PendingTimetable | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'edit'>('approve');
  const [approvalMessage, setApprovalMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'finalized' | 'under_review'>('all');

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

  const filteredTimetables = mockPendingTimetables.filter(timetable => {
    const matchesSearch = timetable.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         timetable.creator_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || timetable.workflow_stage === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleReviewTimetable = (timetable: PendingTimetable) => {
    navigate(`/timetables/${timetable.id}/edit`);
  };

  const handleApprovalAction = (action: 'approve' | 'edit', timetable: PendingTimetable) => {
    setSelectedTimetable(timetable);
    setApprovalAction(action);
    setIsApprovalDialogOpen(true);
  };

  const executeApproval = () => {
    if (!selectedTimetable) return;

    if (approvalAction === 'approve') {
      // Approve and publish directly
      console.log('Publishing timetable:', selectedTimetable.id);
    } else {
      // Navigate to edit page for modifications
      navigate(`/timetables/${selectedTimetable.id}/edit`);
    }
    
    setIsApprovalDialogOpen(false);
    setApprovalMessage('');
    setSelectedTimetable(null);
  };

  const getWorkflowBadge = (stage: string) => {
    switch (stage) {
      case 'finalized':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Awaiting Review</Badge>;
      case 'under_review':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Under Review</Badge>;
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
                <p className="text-2xl font-bold">{mockPendingTimetables.filter(t => t.workflow_stage === 'finalized').length}</p>
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
                <p className="text-2xl font-bold">{mockPendingTimetables.filter(t => t.workflow_stage === 'under_review').length}</p>
                <p className="text-sm text-muted-foreground">Under Review</p>
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
                <p className="text-2xl font-bold">{mockPendingTimetables.reduce((sum, t) => sum + t.conflicts_count, 0)}</p>
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
                  {Math.round(mockPendingTimetables.reduce((sum, t) => sum + t.quality_score, 0) / mockPendingTimetables.length * 100)}%
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
                <option value="finalized">Awaiting Review</option>
                <option value="under_review">Under Review</option>
              </select>
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
                      <h3 className="text-lg font-semibold">{timetable.name}</h3>
                      {getWorkflowBadge(timetable.workflow_stage)}
                      {timetable.conflicts_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {timetable.conflicts_count} conflicts
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Created by {timetable.creator_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Finalized {new Date(timetable.finalized_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${getQualityColor(timetable.quality_score)}`}>
                          Quality: {(timetable.quality_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {timetable.message && (
                      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg mb-3">
                        <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">Creator's Message:</p>
                          <p className="text-sm text-muted-foreground">{timetable.message}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{timetable.classes_count} classes scheduled</span>
                      <span>•</span>
                      <span>{timetable.department} Department</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      onClick={() => handleReviewTimetable(timetable)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review
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
                      disabled={timetable.conflicts_count > 0}
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
                <h4 className="font-medium mb-2">{selectedTimetable.name}</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Creator: {selectedTimetable.creator_name}</p>
                  <p>Quality Score: {(selectedTimetable.quality_score * 100).toFixed(0)}%</p>
                  <p>Classes: {selectedTimetable.classes_count}</p>
                  {selectedTimetable.conflicts_count > 0 && (
                    <p className="text-red-600 font-medium">
                      ⚠️ {selectedTimetable.conflicts_count} conflicts detected
                    </p>
                  )}
                </div>
              </div>

              {selectedTimetable.conflicts_count > 0 && approvalAction === 'approve' && (
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
    </div>
  );
}