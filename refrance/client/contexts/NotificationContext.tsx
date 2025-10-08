import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WorkflowNotification } from '@/store/api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: WorkflowNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<WorkflowNotification, 'id' | 'created_at' | 'is_read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  getNotificationsByType: (type: WorkflowNotification['type']) => WorkflowNotification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);

  // Mock notifications for demonstration + fetch real notifications
  useEffect(() => {
    if (user) {
      const fetchNotifications = async () => {
        try {
          // Fetch real notifications from server
          const apiUrl = `/api/new-generation/notifications/${user.id}`;
          console.log('🔍 Fetching notifications from:', apiUrl, 'for user role:', user.role, 'mentor_type:', user.mentor_type);
          
          const response = await fetch(apiUrl);
          console.log('📡 API Response status:', response.status);
          
          if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
          }
          
          const data = await response.json();
          console.log('� Real notifications received:', data.count, 'notifications');
          
          const realNotifications = data.data || [];
          
          // Add mock timetable notifications for demonstration
          const mockTimetableNotifications: WorkflowNotification[] = [
            {
              id: '1',
              type: 'draft_ready',
              title: 'New Timetable Ready for Review',
              message: 'Dr. John Smith has finalized a new timetable for Computer Science department.',
              timetable_id: 1,
              from_user_id: 2,
              to_user_id: parseInt(user.id),
              created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
              is_read: false
            },
            {
              id: '2',
              type: 'published',
              title: 'Timetable Published',
              message: 'The Computer Science Semester 1 timetable has been approved and published.',
              timetable_id: 2,
              from_user_id: 3,
              to_user_id: parseInt(user.id),
              created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
              is_read: true
            }
          ];
          
          // Combine real notifications with mock timetable notifications
          const allNotifications = [...realNotifications, ...mockTimetableNotifications];
          console.log(`🔗 Total: ${allNotifications.length} (${realNotifications.length} real + ${mockTimetableNotifications.length} mock)`);
          
          // Filter notifications based on user role and permissions
          const filteredNotifications = allNotifications.filter(notification => {
            if (user.role === 'admin') return true;
            
            // Publisher mentors get draft_ready and exam/assignment notifications
            if (user.role === 'mentor' && user.mentor_type === 'publisher') {
              return ['draft_ready', 'conflict_detected', 'exam_scheduled', 'assignment_posted'].includes(notification.type);
            }
            
            // Creator mentors get published/updated notifications
            if (user.role === 'mentor' && user.mentor_type === 'creator') {
              return ['published', 'updated', 'conflict_detected'].includes(notification.type);
            }
            
            // Students get exam and assignment notifications
            if (user.role === 'student') {
              return ['exam_scheduled', 'assignment_posted'].includes(notification.type);
            }
            
            return false;
          });
          
          console.log(`✅ Filtered notifications for ${user.role}/${user.mentor_type}:`, filteredNotifications.length);
          setNotifications(filteredNotifications);
        } catch (error) {
          console.error('Failed to fetch notifications:', error);
          // Fall back to mock data
          setNotifications([]);
        }
      };
      
      fetchNotifications();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const addNotification = (notificationData: Omit<WorkflowNotification, 'id' | 'created_at' | 'is_read'>) => {
    const newNotification: WorkflowNotification = {
      ...notificationData,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      is_read: false
    };

    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, is_read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, is_read: true }))
    );
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const getNotificationsByType = (type: WorkflowNotification['type']) => {
    return notifications.filter(notification => notification.type === type);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    getNotificationsByType
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Notification service functions
export const NotificationService = {
  // Send notification when Creator finalizes a draft
  sendDraftReadyNotification: (creatorId: number, publisherId: number, timetableId: number, timetableName: string) => {
    return {
      type: 'draft_ready' as const,
      title: 'New Timetable Ready for Review',
      message: `A new timetable "${timetableName}" has been finalized and is ready for your review.`,
      timetable_id: timetableId,
      from_user_id: creatorId,
      to_user_id: publisherId
    };
  },

  // Send notification when Publisher publishes a timetable
  sendPublishedNotification: (publisherId: number, creatorId: number, timetableId: number, timetableName: string) => {
    return {
      type: 'published' as const,
      title: 'Timetable Published',
      message: `Your timetable "${timetableName}" has been approved and published successfully.`,
      timetable_id: timetableId,
      from_user_id: publisherId,
      to_user_id: creatorId
    };
  },

  // Send notification when timetable is updated after publication
  sendUpdatedNotification: (modifierId: number, recipientId: number, timetableId: number, timetableName: string) => {
    return {
      type: 'updated' as const,
      title: 'Timetable Updated',
      message: `The published timetable "${timetableName}" has been modified. Please review the changes.`,
      timetable_id: timetableId,
      from_user_id: modifierId,
      to_user_id: recipientId
    };
  },

  // Send notification when conflicts are detected
  sendConflictNotification: (timetableId: number, recipientId: number, conflictCount: number, timetableName: string) => {
    return {
      type: 'conflict_detected' as const,
      title: 'Conflicts Detected',
      message: `${conflictCount} conflicts have been detected in "${timetableName}". Please review and resolve them.`,
      timetable_id: timetableId,
      from_user_id: 1, // System notification
      to_user_id: recipientId
    };
  },

  // Send notification when Creator schedules an exam
  sendExamNotification: (creatorId: number, recipientId: number, examId: string, examDetails: { type: string, subject: string, date: string, time: string }) => {
    return {
      type: 'exam_scheduled' as const,
      title: `${examDetails.type} Exam Scheduled`,
      message: `${examDetails.type} exam for ${examDetails.subject} has been scheduled on ${examDetails.date} at ${examDetails.time}.`,
      exam_id: examId,
      from_user_id: creatorId,
      to_user_id: recipientId
    };
  },

  // Send notification when Creator posts an assignment
  sendAssignmentNotification: (creatorId: number, recipientId: number, assignmentId: string, assignmentDetails: { title: string, subject: string, dueDate: string }) => {
    return {
      type: 'assignment_posted' as const,
      title: 'New Assignment Posted',
      message: `Assignment "${assignmentDetails.title}" for ${assignmentDetails.subject} has been posted. Due date: ${assignmentDetails.dueDate}.`,
      assignment_id: assignmentId,
      from_user_id: creatorId,
      to_user_id: recipientId
    };
  }
};