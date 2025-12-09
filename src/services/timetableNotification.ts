/**
 * Timetable Notification Service
 * Handles automatic email notifications when timetables are published
 */

interface TimetablePublishNotification {
  timetableId: string;
  publishedBy?: string;
}

/**
 * Trigger email notification when timetable is published
 * Call this function after successfully publishing a timetable
 * 
 * @param timetableId - The ID of the published timetable
 * @param publishedBy - Name of the person who published it (optional)
 * @returns Promise with notification result
 */
export async function notifyTimetablePublished(
  timetableId: string,
  publishedBy?: string
): Promise<{ success: boolean; message: string; stats?: any }> {
  try {
    const response = await fetch('/api/email/sendUpdate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({
        timetableId,
        publishedBy
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send notifications');
    }

    return {
      success: true,
      message: data.message,
      stats: data.stats
    };
  } catch (error) {
    console.error('Error sending timetable notifications:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send notifications'
    };
  }
}

/**
 * Preview how many people will receive the notification
 * 
 * @param timetableId - The ID of the timetable
 * @returns Promise with recipient count
 */
export async function previewTimetableNotificationRecipients(
  timetableId: string
): Promise<{ students: number; faculty: number; total: number } | null> {
  try {
    const response = await fetch(`/api/email/sendUpdate?timetableId=${timetableId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recipients');
    }

    const data = await response.json();
    return data.recipients;
  } catch (error) {
    console.error('Error previewing recipients:', error);
    return null;
  }
}

/**
 * Show notification success message to user
 * 
 * @param stats - Notification statistics
 */
export function showNotificationSuccess(stats: any): string {
  const total = stats.total || 0;
  const sent = stats.sent || 0;
  const students = stats.students || 0;
  const faculty = stats.faculty || 0;

  if (sent === 0) {
    return '⚠️ No recipients found for this timetable.';
  }

  if (sent === total) {
    return `✅ Successfully sent notifications to ${total} recipients (${students} students, ${faculty} faculty members)`;
  }

  return `⚠️ Sent ${sent} out of ${total} notifications (${students} students, ${faculty} faculty members). ${total - sent} failed.`;
}

/**
 * Integration example for Publisher Dashboard
 * 
 * Usage:
 * ```typescript
 * import { notifyTimetablePublished, showNotificationSuccess } from '@/services/timetableNotification';
 * 
 * async function handlePublishTimetable(timetableId: string) {
 *   // First publish the timetable
 *   await publishTimetable(timetableId);
 *   
 *   // Then send notifications
 *   const result = await notifyTimetablePublished(timetableId, 'Publisher Name');
 *   
 *   if (result.success) {
 *     const message = showNotificationSuccess(result.stats);
 *     alert(message);
 *   } else {
 *     alert('Failed to send notifications: ' + result.message);
 *   }
 * }
 * ```
 */
