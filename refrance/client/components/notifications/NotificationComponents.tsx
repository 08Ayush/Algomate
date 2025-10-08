import React from 'react';
import { Bell, Clock, CheckCircle, AlertTriangle, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/contexts/NotificationContext';
import { WorkflowNotification } from '@/store/api';

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

function getNotificationIcon(type: WorkflowNotification['type']) {
  switch (type) {
    case 'draft_ready':
      return <Calendar className="h-4 w-4 text-blue-500" />;
    case 'published':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'updated':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'conflict_detected':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'exam_scheduled':
      return <Calendar className="h-4 w-4 text-purple-500" />;
    case 'assignment_posted':
      return <Bell className="h-4 w-4 text-indigo-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
}

function getNotificationColor(type: WorkflowNotification['type']) {
  switch (type) {
    case 'draft_ready':
      return 'border-l-blue-500 bg-blue-50';
    case 'published':
      return 'border-l-green-500 bg-green-50';
    case 'updated':
      return 'border-l-yellow-500 bg-yellow-50';
    case 'conflict_detected':
      return 'border-l-red-500 bg-red-50';
    case 'exam_scheduled':
      return 'border-l-purple-500 bg-purple-50';
    case 'assignment_posted':
      return 'border-l-indigo-500 bg-indigo-50';
    default:
      return 'border-l-gray-500 bg-gray-50';
  }
}

interface NotificationItemProps {
  notification: WorkflowNotification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
  onTimetableClick: (timetableId: number) => void;
}

function NotificationItem({ notification, onMarkAsRead, onRemove, onTimetableClick }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.timetable_id) {
      onTimetableClick(notification.timetable_id);
    }
  };

  return (
    <div
      className={`p-3 border-l-4 cursor-pointer transition-colors hover:bg-gray-50 ${
        getNotificationColor(notification.type)
      } ${!notification.is_read ? 'font-medium' : 'opacity-75'}`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          {getNotificationIcon(notification.type)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {notification.title}
              </h4>
              {!notification.is_read && (
                <Badge variant="secondary" className="h-2 w-2 p-0 bg-blue-500" />
              )}
            </div>
            <p className="text-xs text-gray-600 mb-1 line-clamp-2">
              {notification.message}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {formatTimeAgo(notification.created_at)}
              </span>
              {notification.timetable_id && (
                <span className="text-xs text-blue-600 hover:text-blue-700">
                  View Timetable →
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-red-100"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(notification.id);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

interface NotificationBellProps {
  onTimetableClick?: (timetableId: number) => void;
}

export function NotificationBell({ onTimetableClick }: NotificationBellProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification
  } = useNotifications();

  const handleTimetableClick = (timetableId: number) => {
    if (onTimetableClick) {
      onTimetableClick(timetableId);
    } else {
      // Default navigation - you can customize this based on your routing
      window.location.href = `/timetables/${timetableId}/edit`;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={markAllAsRead}
                >
                  Mark all read
                </Button>
              )}
            </div>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-500">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs">We'll notify you when there's something new</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                      onTimetableClick={handleTimetableClick}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

// Notification List Page Component
export function NotificationList() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    getNotificationsByType
  } = useNotifications();

  const draftReadyNotifications = getNotificationsByType('draft_ready');
  const publishedNotifications = getNotificationsByType('published');
  const updatedNotifications = getNotificationsByType('updated');
  const conflictNotifications = getNotificationsByType('conflict_detected');
  const examNotifications = getNotificationsByType('exam_scheduled');
  const assignmentNotifications = getNotificationsByType('assignment_posted');

  const handleTimetableClick = (timetableId: number) => {
    window.location.href = `/timetables/${timetableId}/edit`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline">
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-500">You're all caught up! Check back later for updates.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {conflictNotifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Conflicts ({conflictNotifications.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {conflictNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                      onTimetableClick={handleTimetableClick}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {examNotifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Calendar className="h-5 w-5" />
                  Exam Schedules ({examNotifications.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {examNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                      onTimetableClick={handleTimetableClick}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {assignmentNotifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-600">
                  <Bell className="h-5 w-5" />
                  Assignments ({assignmentNotifications.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {assignmentNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                      onTimetableClick={handleTimetableClick}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {draftReadyNotifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Calendar className="h-5 w-5" />
                  Ready for Review ({draftReadyNotifications.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {draftReadyNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                      onTimetableClick={handleTimetableClick}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {publishedNotifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Published ({publishedNotifications.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {publishedNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                      onTimetableClick={handleTimetableClick}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {updatedNotifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <Clock className="h-5 w-5" />
                  Updates ({updatedNotifications.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {updatedNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                      onTimetableClick={handleTimetableClick}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}