import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  X, 
  Search,
  Filter,
  MoreHorizontal,
  Archive,
  Trash2,
  Settings,
  Users,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'timetable' | 'event' | 'system' | 'announcement';
  timestamp: string;
  isRead: boolean;
  isArchived: boolean;
  priority: 'low' | 'medium' | 'high';
  sender?: string;
  actionUrl?: string;
}

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Timetable Draft Ready for Review',
    message: 'Computer Science 3rd Semester timetable has been created and is ready for your review.',
    type: 'info',
    category: 'timetable',
    timestamp: '2025-01-15T10:30:00Z',
    isRead: false,
    isArchived: false,
    priority: 'high',
    sender: 'Dr. John Smith',
    actionUrl: '/timetables/review/123'
  },
  {
    id: '2',
    title: 'Event Registration Deadline Approaching',
    message: 'Technical Symposium 2025 registration ends in 2 days. Encourage students to register.',
    type: 'warning',
    category: 'event',
    timestamp: '2025-01-15T09:15:00Z',
    isRead: false,
    isArchived: false,
    priority: 'medium',
    sender: 'Event Committee',
    actionUrl: '/events/tech-symposium-2025'
  },
  {
    id: '3',
    title: 'Timetable Published Successfully',
    message: 'Mechanical Engineering 5th Semester timetable has been published and is now live.',
    type: 'success',
    category: 'timetable',
    timestamp: '2025-01-15T08:45:00Z',
    isRead: true,
    isArchived: false,
    priority: 'medium',
    sender: 'Prof. Sarah Johnson'
  },
  {
    id: '4',
    title: 'System Maintenance Scheduled',
    message: 'The system will be under maintenance on January 20th from 2:00 AM to 4:00 AM IST.',
    type: 'warning',
    category: 'system',
    timestamp: '2025-01-14T16:20:00Z',
    isRead: true,
    isArchived: false,
    priority: 'low',
    sender: 'System Administrator'
  },
  {
    id: '5',
    title: 'New Faculty Member Added',
    message: 'Dr. Alice Wilson has been added to the Electronics & Communication department.',
    type: 'info',
    category: 'announcement',
    timestamp: '2025-01-14T14:30:00Z',
    isRead: true,
    isArchived: false,
    priority: 'low',
    sender: 'HR Department'
  }
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTab, setSelectedTab] = useState('all');

  const formatTimeAgo = (dateString: string): string => {
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
  };

  const getNotificationIcon = (category: string, type: string) => {
    if (category === 'timetable') return <Calendar className="h-5 w-5" />;
    if (category === 'event') return <Users className="h-5 w-5" />;
    if (category === 'system') return <Settings className="h-5 w-5" />;
    if (category === 'announcement') return <Bell className="h-5 w-5" />;
    return <Bell className="h-5 w-5" />;
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-blue-500';
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'success': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const markAsUnread = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: false }
          : notification
      )
    );
  };

  const archiveNotification = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isArchived: true }
          : notification
      )
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const filteredNotifications = notifications.filter(notification => {
    if (selectedTab === 'unread' && notification.isRead) return false;
    if (selectedTab === 'archived' && !notification.isArchived) return false;
    if (selectedTab === 'all' && notification.isArchived) return false;
    
    if (selectedCategory !== 'all' && notification.category !== selectedCategory) return false;
    
    if (searchTerm && !notification.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !notification.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead && !n.isArchived).length;
  const totalCount = notifications.filter(n => !n.isArchived).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with the latest activities and announcements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {unreadCount} unread
          </Badge>
          <Button onClick={markAllAsRead} variant="outline" size="sm">
            Mark all as read
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-input rounded-md bg-background text-sm"
        >
          <option value="all">All Categories</option>
          <option value="timetable">Timetables</option>
          <option value="event">Events</option>
          <option value="system">System</option>
          <option value="announcement">Announcements</option>
        </select>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">All ({totalCount})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {filteredNotifications.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No notifications found</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTab === 'unread' && 'All caught up! No unread notifications.'}
                      {selectedTab === 'archived' && 'No archived notifications.'}
                      {selectedTab === 'all' && searchTerm && 'Try adjusting your search or filters.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredNotifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`transition-all duration-200 hover:shadow-md ${
                      !notification.isRead ? 'border-l-4 border-l-primary bg-muted/30' : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 ${getNotificationColor(notification.type)}`}>
                            {getNotificationIcon(notification.category, notification.type)}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base leading-tight">
                              {notification.title}
                              {!notification.isRead && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  New
                                </Badge>
                              )}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={getBadgeVariant(notification.type)} className="text-xs">
                                {notification.category}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {notification.priority} priority
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(notification.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => notification.isRead ? markAsUnread(notification.id) : markAsRead(notification.id)}
                          >
                            {notification.isRead ? (
                              <Bell className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => archiveNotification(notification.id)}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm leading-relaxed">
                        {notification.message}
                      </CardDescription>
                      {notification.sender && (
                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>From: {notification.sender}</span>
                        </div>
                      )}
                      {notification.actionUrl && (
                        <div className="mt-3">
                          <Button variant="outline" size="sm" asChild>
                            <a href={notification.actionUrl}>View Details</a>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}