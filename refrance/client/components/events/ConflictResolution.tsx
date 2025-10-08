import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Calendar,
  Users,
  ArrowUp,
  ArrowDown,
  Trash2,
  Info,
  Timer
} from 'lucide-react';
import { format } from 'date-fns';

interface QueueItem {
  id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_time: string;
  department_name: string;
  created_by: string;
  created_by_name: string;
  position: number;
  priority_level: number;
  submitted_at: string;
  conflicting_with: string[];
  estimated_approval_date?: string;
}

interface Notification {
  id: string;
  type: 'queue_update' | 'conflict_resolved' | 'event_approved' | 'event_rejected' | 'reminder';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  read: boolean;
  action_required?: boolean;
}

interface ConflictResolutionProps {
  onQueueUpdate?: (queueItems: QueueItem[]) => void;
}

// Mock data for demonstration
const mockQueueItems: QueueItem[] = [
  {
    id: '1',
    event_id: '3',
    event_title: 'Cultural Night',
    event_date: '2025-09-20',
    event_time: '18:00-22:00',
    department_name: 'Computer Science & Engineering',
    created_by: '3',
    created_by_name: 'Prof. Mike Brown',
    position: 1,
    priority_level: 1,
    submitted_at: '2025-09-13T09:00:00Z',
    conflicting_with: ['AI/ML Workshop'],
    estimated_approval_date: '2025-09-21'
  },
  {
    id: '2',
    event_id: '4',
    event_title: 'Tech Symposium',
    event_date: '2025-09-20',
    event_time: '14:00-17:00',
    department_name: 'Information Technology',
    created_by: '4',
    created_by_name: 'Dr. Emily Davis',
    position: 2,
    priority_level: 2,
    submitted_at: '2025-09-14T10:00:00Z',
    conflicting_with: ['AI/ML Workshop', 'Cultural Night'],
    estimated_approval_date: '2025-09-22'
  }
];

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'queue_update',
    title: 'Queue Position Updated',
    message: 'Your event "Cultural Night" has moved to position #1 in the queue for September 20th.',
    timestamp: '2025-09-14T14:30:00Z',
    read: false,
    action_required: false
  },
  {
    id: '2',
    type: 'conflict_resolved',
    title: 'Date Available',
    message: 'September 22nd is now available for your event "Tech Symposium". Would you like to approve this date?',
    timestamp: '2025-09-14T12:00:00Z',
    read: false,
    action_required: true,
    data: { event_id: '4', new_date: '2025-09-22' }
  },
  {
    id: '3',
    type: 'event_approved',
    title: 'Event Approved',
    message: 'Your event "AI/ML Workshop" has been approved and scheduled for September 20th.',
    timestamp: '2025-09-14T10:00:00Z',
    read: true,
    action_required: false
  }
];

export default function ConflictResolution({ onQueueUpdate }: ConflictResolutionProps) {
  const { user, hasPermission } = useAuth();
  const [queueItems, setQueueItems] = useState<QueueItem[]>(mockQueueItems);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMoveUp = (itemId: string) => {
    setQueueItems(prev => {
      const items = [...prev];
      const index = items.findIndex(item => item.id === itemId);
      if (index > 0) {
        const temp = items[index];
        items[index] = { ...items[index - 1], position: temp.position };
        items[index - 1] = { ...temp, position: items[index - 1].position };
        [items[index], items[index - 1]] = [items[index - 1], items[index]];
      }
      return items;
    });
  };

  const handleMoveDown = (itemId: string) => {
    setQueueItems(prev => {
      const items = [...prev];
      const index = items.findIndex(item => item.id === itemId);
      if (index < items.length - 1) {
        const temp = items[index];
        items[index] = { ...items[index + 1], position: temp.position };
        items[index + 1] = { ...temp, position: items[index + 1].position };
        [items[index], items[index + 1]] = [items[index + 1], items[index]];
      }
      return items;
    });
  };

  const handleRemoveFromQueue = (itemId: string) => {
    if (confirm('Are you sure you want to remove this event from the queue?')) {
      setQueueItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const handleApproveAlternateDate = (notificationId: string, eventId: string, newDate: string) => {
    // Simulate approving alternate date
    handleMarkAsRead(notificationId);
    setQueueItems(prev => prev.filter(item => item.event_id !== eventId));
    
    // Add success notification
    const successNotification: Notification = {
      id: Date.now().toString(),
      type: 'event_approved',
      title: 'Event Approved',
      message: `Your event has been rescheduled to ${format(new Date(newDate), 'PPP')} and approved.`,
      timestamp: new Date().toISOString(),
      read: false,
      action_required: false
    };
    setNotifications(prev => [successNotification, ...prev]);
  };

  const getPriorityColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (level: number) => {
    switch (level) {
      case 1: return 'High';
      case 2: return 'Medium';
      case 3: return 'Low';
      default: return 'Unknown';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'queue_update': return Clock;
      case 'conflict_resolved': return CheckCircle;
      case 'event_approved': return CheckCircle;
      case 'event_rejected': return X;
      case 'reminder': return Bell;
      default: return Info;
    }
  };

  useEffect(() => {
    onQueueUpdate?.(queueItems);
  }, [queueItems, onQueueUpdate]);

  return (
    <div className="space-y-6">
      {/* Notification Bell */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Conflict Resolution & Queue Management</h2>
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No notifications</p>
                ) : (
                  notifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    return (
                      <Alert key={notification.id} className={notification.read ? 'opacity-60' : ''}>
                        <Icon className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold">{notification.title}</h4>
                              <p className="text-sm">{notification.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(notification.timestamp), 'PPp')}
                              </p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              {notification.action_required && notification.data && (
                                <Button
                                  size="sm"
                                  onClick={() => 
                                    handleApproveAlternateDate(
                                      notification.id, 
                                      notification.data.event_id, 
                                      notification.data.new_date
                                    )
                                  }
                                >
                                  Approve
                                </Button>
                              )}
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Queue Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Event Queue - First Come First Serve
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queueItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No events in queue</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queueItems.map((item, index) => (
                <Card key={item.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-lg font-bold">
                            #{item.position}
                          </Badge>
                          <Badge className={getPriorityColor(item.priority_level)}>
                            {getPriorityLabel(item.priority_level)} Priority
                          </Badge>
                          <Badge variant="outline">
                            Queue since {format(new Date(item.submitted_at), 'MMM d')}
                          </Badge>
                        </div>
                        
                        <h3 className="font-semibold text-lg">{item.event_title}</h3>
                        <p className="text-sm text-muted-foreground">{item.department_name}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(item.event_date), 'PPP')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {item.event_time}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            By {item.created_by_name}
                          </div>
                        </div>

                        {item.conflicting_with.length > 0 && (
                          <Alert className="mt-3">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Conflicts with:</strong> {item.conflicting_with.join(', ')}
                            </AlertDescription>
                          </Alert>
                        )}

                        {item.estimated_approval_date && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <strong>Estimated approval:</strong> {format(new Date(item.estimated_approval_date), 'PPP')}
                          </div>
                        )}
                      </div>

                      {/* Queue Management Actions */}
                      {hasPermission('manage_event_queue') && (
                        <div className="flex flex-col gap-1 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMoveUp(item.id)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMoveDown(item.id)}
                            disabled={index === queueItems.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFromQueue(item.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total in Queue</p>
                <p className="text-2xl font-bold text-blue-600">{queueItems.length}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600">
                  {queueItems.filter(item => item.priority_level === 1).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unread Notifications</p>
                <p className="text-2xl font-bold text-orange-600">{unreadCount}</p>
              </div>
              <Bell className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Wait Time</p>
                <p className="text-2xl font-bold text-purple-600">2.3 days</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}