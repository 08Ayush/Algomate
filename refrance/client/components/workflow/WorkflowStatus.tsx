import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, User, Eye, Zap, ArrowRight } from 'lucide-react';

interface WorkflowStatusProps {
  stage: 'creation' | 'review' | 'approved' | 'published';
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected';
  creatorName?: string;
  publisherName?: string;
  lastUpdated?: string;
  qualityScore?: number;
  isLive?: boolean;
}

const WorkflowStatus: React.FC<WorkflowStatusProps> = ({
  stage,
  status,
  creatorName,
  publisherName,
  lastUpdated,
  qualityScore,
  isLive = false
}) => {
  const getStageIcon = (currentStage: string, activeStage: string) => {
    const isActive = currentStage === activeStage;
    const isCompleted = ['creation', 'review', 'approved', 'published'].indexOf(currentStage) <= 
                      ['creation', 'review', 'approved', 'published'].indexOf(activeStage);
    
    if (isCompleted && currentStage !== activeStage) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    
    if (isActive) {
      return <div className="h-5 w-5 rounded-full bg-primary animate-pulse" />;
    }
    
    return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'draft':
        return <Badge className="status-draft">Draft</Badge>;
      case 'pending_review':
        return <Badge className="status-review pulse-live">Under Review</Badge>;
      case 'approved':
        return <Badge className="status-approved">Approved</Badge>;
      case 'published':
        return <Badge className="status-published">Published</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const stages = [
    { 
      key: 'creation', 
      label: 'Creation', 
      icon: User, 
      description: 'AI-assisted timetable generation',
      actor: creatorName || 'Creator'
    },
    { 
      key: 'review', 
      label: 'Review', 
      icon: Eye, 
      description: 'Publisher review and validation',
      actor: publisherName || 'Publisher'
    },
    { 
      key: 'approved', 
      label: 'Approved', 
      icon: CheckCircle, 
      description: 'Ready for publication',
      actor: publisherName || 'Publisher'
    },
    { 
      key: 'published', 
      label: 'Published', 
      icon: Zap, 
      description: 'Live and accessible to all',
      actor: 'System'
    }
  ];

  return (
    <Card className="modern-card overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Workflow Status</h3>
            {isLive && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-green-600 font-medium">Live</span>
              </div>
            )}
          </div>
          {getStatusBadge()}
        </div>

        {/* Progress Line */}
        <div className="relative mb-8">
          <div className="flex items-center justify-between">
            {stages.map((stageItem, index) => (
              <div key={stageItem.key} className="flex flex-col items-center relative z-10">
                <div className={`workflow-step ${
                  stage === stageItem.key ? 'active' : 
                  stages.findIndex(s => s.key === stage) > index ? 'completed' : 'pending'
                }`}>
                  {getStageIcon(stageItem.key, stage)}
                </div>
                <div className="text-center mt-3 max-w-24">
                  <p className="text-xs font-medium">{stageItem.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stageItem.actor}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Connection Line */}
          <div className="absolute top-6 left-6 right-6 h-0.5 bg-border -z-0">
            <div 
              className="h-full bg-gradient-to-r from-primary to-green-500 transition-all duration-500"
              style={{
                width: `${(stages.findIndex(s => s.key === stage) / (stages.length - 1)) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Current Stage Details */}
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Current Stage</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {stages.find(s => s.key === stage)?.description || 'Processing...'}
            </p>
          </div>

          {/* Quality Score */}
          {qualityScore && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quality Score</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-400 via-green-400 to-green-500 transition-all duration-500"
                    style={{ width: `${qualityScore * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-green-600">
                  {(qualityScore * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-xs text-muted-foreground">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowStatus;