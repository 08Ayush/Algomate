import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Calendar, 
  Clock, 
  User, 
  Eye, 
  Edit3, 
  CheckCircle, 
  AlertCircle,
  Zap,
  TrendingUp
} from 'lucide-react';
import Link from '@/lib/navigation';

interface TimetableCardProps {
  id: number;
  title: string;
  department: string;
  semester: string;
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected';
  workflow_stage: 'creation' | 'review' | 'approved' | 'published';
  creator: {
    name: string;
    avatar?: string;
    role: string;
  };
  publisher?: {
    name: string;
    avatar?: string;
    role: string;
  };
  qualityScore: number;
  lastUpdated: string;
  subjectCount: number;
  conflictCount?: number;
  isLive?: boolean;
  canEdit?: boolean;
  canReview?: boolean;
}

const TimetableCard: React.FC<TimetableCardProps> = ({
  id,
  title,
  department,
  semester,
  status,
  workflow_stage,
  creator,
  publisher,
  qualityScore,
  lastUpdated,
  subjectCount,
  conflictCount = 0,
  isLive = false,
  canEdit = false,
  canReview = false
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'draft': return 'status-draft';
      case 'pending_review': return 'status-review';
      case 'approved': return 'status-approved';
      case 'published': return 'status-published';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'draft': return <Edit3 className="h-3 w-3" />;
      case 'pending_review': return <Eye className="h-3 w-3" />;
      case 'approved': return <CheckCircle className="h-3 w-3" />;
      case 'published': return <Zap className="h-3 w-3" />;
      case 'rejected': return <AlertCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getQualityColor = () => {
    if (qualityScore >= 0.9) return 'text-green-600';
    if (qualityScore >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="modern-card group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
              {title}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="font-medium">{department}</span>
              <span>•</span>
              <span>{semester}</span>
              <span>•</span>
              <span>{subjectCount} subjects</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isLive && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-medium">Live</span>
              </div>
            )}
            <Badge className={getStatusColor()}>
              {getStatusIcon()}
              <span className="ml-1 capitalize">{status.replace('_', ' ')}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quality Score & Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Quality Score</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    qualityScore >= 0.9 ? 'bg-green-500' : 
                    qualityScore >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${qualityScore * 100}%` }}
                />
              </div>
              <span className={`text-sm font-semibold ${getQualityColor()}`}>
                {(qualityScore * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Conflicts</span>
            </div>
            <span className={`text-lg font-semibold ${conflictCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {conflictCount}
            </span>
          </div>
        </div>

        {/* Creator & Publisher Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                {creator.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{creator.name}</p>
              <p className="text-xs text-muted-foreground">Creator • {creator.role}</p>
            </div>
          </div>

          {publisher && (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs">
                  {publisher.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{publisher.name}</p>
                <p className="text-xs text-muted-foreground">Publisher • {publisher.role}</p>
              </div>
            </div>
          )}
        </div>

        {/* Last Updated */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Updated {new Date(lastUpdated).toLocaleDateString()}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" asChild className="flex-1 rounded-lg">
            <Link to={`/timetables/${id}`}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </Link>
          </Button>
          
          {canEdit && (
            <Button size="sm" asChild className="flex-1 rounded-lg gradient-primary">
              <Link to={`/timetables/${id}/edit`}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
          
          {canReview && status === 'pending_review' && (
            <Button size="sm" asChild className="flex-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white">
              <Link to={`/timetables/${id}/review`}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Review
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TimetableCard;