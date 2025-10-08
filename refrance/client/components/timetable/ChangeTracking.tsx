import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Clock, 
  User, 
  Edit, 
  Plus, 
  Trash2, 
  Send, 
  CheckCircle, 
  Eye, 
  Filter,
  Download,
  GitBranch,
  Activity,
  TrendingUp,
  Calendar
} from "lucide-react";
import { TimetableChangeLog, TimetableVersion, ChangeTrackingStats } from "@/store/api-simple";
import { useAuth } from "@/contexts/AuthContext";

interface ChangeTrackingProps {
  timetableId: number;
  timetableName: string;
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
}

function getChangeTypeIcon(changeType: TimetableChangeLog['change_type']) {
  switch (changeType) {
    case 'created':
      return <Plus className="h-4 w-4 text-green-600" />;
    case 'updated':
    case 'modified':
      return <Edit className="h-4 w-4 text-blue-600" />;
    case 'finalized':
      return <Send className="h-4 w-4 text-yellow-600" />;
    case 'published':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'class_added':
      return <Plus className="h-4 w-4 text-green-500" />;
    case 'class_updated':
      return <Edit className="h-4 w-4 text-blue-500" />;
    case 'class_deleted':
      return <Trash2 className="h-4 w-4 text-red-500" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
  }
}

function getChangeTypeColor(changeType: TimetableChangeLog['change_type']): string {
  switch (changeType) {
    case 'created':
      return 'bg-green-100 text-green-800';
    case 'updated':
    case 'modified':
      return 'bg-blue-100 text-blue-800';
    case 'finalized':
      return 'bg-yellow-100 text-yellow-800';
    case 'published':
      return 'bg-green-100 text-green-800';
    case 'class_added':
      return 'bg-emerald-100 text-emerald-800';
    case 'class_updated':
      return 'bg-sky-100 text-sky-800';
    case 'class_deleted':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

interface ChangeLogItemProps {
  change: TimetableChangeLog;
  onViewDetails?: (change: TimetableChangeLog) => void;
}

function ChangeLogItem({ change, onViewDetails }: ChangeLogItemProps) {
  return (
    <div className="flex items-start gap-3 p-4 border-b last:border-b-0 hover:bg-gray-50">
      <div className="flex-shrink-0 mt-1">
        {getChangeTypeIcon(change.change_type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge className={getChangeTypeColor(change.change_type)}>
            {change.change_type.replace('_', ' ')}
          </Badge>
          <span className="text-sm text-gray-500">
            by {change.user_name} ({change.user_role})
          </span>
          <span className="text-xs text-gray-400">
            {formatTimeAgo(change.timestamp)}
          </span>
        </div>
        
        <p className="text-sm text-gray-900 mb-1">
          {change.description}
        </p>
        
        {change.affected_entity && (
          <div className="text-xs text-gray-500">
            Affected: {change.affected_entity}
            {change.affected_entity_id && ` (ID: ${change.affected_entity_id})`}
          </div>
        )}
        
        {(change.old_value || change.new_value) && onViewDetails && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2 h-7 text-xs"
            onClick={() => onViewDetails(change)}
          >
            <Eye className="h-3 w-3 mr-1" />
            View Details
          </Button>
        )}
      </div>
    </div>
  );
}

interface VersionListProps {
  versions: TimetableVersion[];
  onRestoreVersion?: (version: TimetableVersion) => void;
  onViewVersion?: (version: TimetableVersion) => void;
}

function VersionList({ versions, onRestoreVersion, onViewVersion }: VersionListProps) {
  return (
    <div className="space-y-2">
      {versions.map((version) => (
        <div key={version.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-gray-500" />
              <span className="font-medium">v{version.version_number}</span>
              {version.is_major_version && (
                <Badge variant="outline" className="text-xs">Major</Badge>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{version.description}</p>
              <p className="text-xs text-gray-500">
                {formatTimeAgo(version.created_at)} • {version.change_summary}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onViewVersion && (
              <Button variant="ghost" size="sm" onClick={() => onViewVersion(version)}>
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
            )}
            {onRestoreVersion && (
              <Button variant="outline" size="sm" onClick={() => onRestoreVersion(version)}>
                Restore
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChangeTracking({ timetableId, timetableName }: ChangeTrackingProps) {
  const { user } = useAuth();
  const [selectedChangeType, setSelectedChangeType] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedChange, setSelectedChange] = useState<TimetableChangeLog | null>(null);
  
  // Mock data for demonstration
  const mockChanges: TimetableChangeLog[] = [
    {
      id: '1',
      timetable_id: timetableId,
      user_id: 2,
      user_name: 'Dr. John Smith',
      user_role: 'Creator Mentor',
      change_type: 'created',
      description: 'Created new timetable for Computer Science department',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      session_id: 'session-1'
    },
    {
      id: '2',
      timetable_id: timetableId,
      user_id: 2,
      user_name: 'Dr. John Smith',
      user_role: 'Creator Mentor',
      change_type: 'class_added',
      description: 'Added Data Structures lecture on Monday 9:00 AM',
      affected_entity: 'class',
      affected_entity_id: 101,
      old_value: null,
      new_value: { subject: 'Data Structures', time: 'Monday 9:00 AM', room: 'Room 101' },
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      session_id: 'session-2'
    },
    {
      id: '3',
      timetable_id: timetableId,
      user_id: 2,
      user_name: 'Dr. John Smith',
      user_role: 'Creator Mentor',
      change_type: 'class_updated',
      description: 'Changed classroom from Room 101 to Room 102 for Data Structures',
      affected_entity: 'class',
      affected_entity_id: 101,
      old_value: { room: 'Room 101' },
      new_value: { room: 'Room 102' },
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      session_id: 'session-3'
    },
    {
      id: '4',
      timetable_id: timetableId,
      user_id: 2,
      user_name: 'Dr. John Smith',
      user_role: 'Creator Mentor',
      change_type: 'finalized',
      description: 'Finalized timetable and sent for approval',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      session_id: 'session-4'
    },
    {
      id: '5',
      timetable_id: timetableId,
      user_id: 3,
      user_name: 'Prof. Sarah Johnson',
      user_role: 'Publisher Mentor',
      change_type: 'published',
      description: 'Approved and published the timetable',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      session_id: 'session-5'
    },
    {
      id: '6',
      timetable_id: timetableId,
      user_id: 3,
      user_name: 'Prof. Sarah Johnson',
      user_role: 'Publisher Mentor',
      change_type: 'class_updated',
      description: 'Updated Algorithm lecture time from 2:00 PM to 3:00 PM',
      affected_entity: 'class',
      affected_entity_id: 102,
      old_value: { time: '2:00 PM' },
      new_value: { time: '3:00 PM' },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      session_id: 'session-6'
    }
  ];

  const mockVersions: TimetableVersion[] = [
    {
      id: 'v1',
      timetable_id: timetableId,
      version_number: 1,
      created_by: 2,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Initial draft creation',
      change_summary: 'Created base timetable structure',
      is_major_version: true,
      data_snapshot: {}
    },
    {
      id: 'v2',
      timetable_id: timetableId,
      version_number: 2,
      created_by: 2,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Added all classes and finalized',
      change_summary: 'Completed class scheduling',
      is_major_version: true,
      data_snapshot: {}
    },
    {
      id: 'v3',
      timetable_id: timetableId,
      version_number: 3,
      created_by: 3,
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      description: 'Published version',
      change_summary: 'Approved and published',
      is_major_version: true,
      data_snapshot: {}
    },
    {
      id: 'v4',
      timetable_id: timetableId,
      version_number: 4,
      created_by: 3,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      description: 'Post-publication updates',
      change_summary: 'Minor schedule adjustments',
      is_major_version: false,
      data_snapshot: {}
    }
  ];

  const mockStats: ChangeTrackingStats = {
    total_changes: mockChanges.length,
    changes_last_24h: mockChanges.filter(change => 
      new Date(change.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length,
    most_active_user: 'Dr. John Smith',
    most_common_change_type: 'class_updated',
    version_count: mockVersions.length,
    last_major_version: 'v3'
  };

  const filteredChanges = mockChanges.filter(change => {
    if (selectedChangeType !== 'all' && change.change_type !== selectedChangeType) {
      return false;
    }
    if (selectedUser !== 'all' && change.user_name !== selectedUser) {
      return false;
    }
    return true;
  });

  const uniqueUsers = Array.from(new Set(mockChanges.map(change => change.user_name)));
  const uniqueChangeTypes = Array.from(new Set(mockChanges.map(change => change.change_type)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Change Tracking</h2>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export History
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{mockStats.total_changes}</p>
                <p className="text-sm text-gray-500">Total Changes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{mockStats.changes_last_24h}</p>
                <p className="text-sm text-gray-500">Last 24 Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{mockStats.version_count}</p>
                <p className="text-sm text-gray-500">Versions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-lg font-bold truncate">{mockStats.most_active_user}</p>
                <p className="text-sm text-gray-500">Most Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="changes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="changes">Change Log</TabsTrigger>
          <TabsTrigger value="versions">Version History</TabsTrigger>
        </TabsList>

        <TabsContent value="changes" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={selectedChangeType} onValueChange={setSelectedChangeType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Change Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueChangeTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map(user => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Change Log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Changes</CardTitle>
              <CardDescription>
                {filteredChanges.length} changes found
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                {filteredChanges.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    <Calendar className="h-8 w-8 mb-2 opacity-50" />
                    <div className="text-center">
                      <p className="text-sm">No changes found</p>
                      <p className="text-xs">Try adjusting your filters</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    {filteredChanges.map((change) => (
                      <ChangeLogItem
                        key={change.id}
                        change={change}
                        onViewDetails={setSelectedChange}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Version History</CardTitle>
              <CardDescription>
                {mockVersions.length} versions available
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VersionList
                versions={mockVersions}
                onViewVersion={(version) => {
                  console.log('View version:', version);
                }}
                onRestoreVersion={(version) => {
                  console.log('Restore version:', version);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Details Dialog */}
      <Dialog open={!!selectedChange} onOpenChange={() => setSelectedChange(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Change Details</DialogTitle>
            <DialogDescription>
              Detailed information about this change
            </DialogDescription>
          </DialogHeader>
          
          {selectedChange && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type:</label>
                  <p className="text-sm">{selectedChange.change_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">User:</label>
                  <p className="text-sm">{selectedChange.user_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Time:</label>
                  <p className="text-sm">{formatTimeAgo(selectedChange.timestamp)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Session:</label>
                  <p className="text-sm">{selectedChange.session_id || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Description:</label>
                <p className="text-sm">{selectedChange.description}</p>
              </div>
              
              {selectedChange.old_value && (
                <div>
                  <label className="text-sm font-medium">Before:</label>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
                    {JSON.stringify(selectedChange.old_value, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedChange.new_value && (
                <div>
                  <label className="text-sm font-medium">After:</label>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
                    {JSON.stringify(selectedChange.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}