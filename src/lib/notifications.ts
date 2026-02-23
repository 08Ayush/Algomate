/**
 * Notification Utility Functions
 * Handles creation of notifications for various system events
 */

import { createClient } from '@supabase/supabase-js';
import type { ConstraintViolation } from './constraintRules';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface NotificationRecipient {
  userId: string;
  role: 'creator' | 'publisher' | 'hod' | 'admin';
}

interface ConstraintViolationNotificationOptions {
  timetableId: string;
  batchId: string;
  violations: ConstraintViolation[];
  creatorId: string;
  departmentId: string;
  timetableTitle?: string;
}

/**
 * Create notifications for constraint violations
 * Notifies both the creator and publisher(s) about violations in the timetable
 */
export async function createConstraintViolationNotifications(
  options: ConstraintViolationNotificationOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const { 
      timetableId, 
      batchId, 
      violations, 
      creatorId, 
      departmentId,
      timetableTitle = 'Generated Timetable'
    } = options;

    if (violations.length === 0) {
      return { success: true }; // No violations, no notifications needed
    }

    // Categorize violations by severity
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    const highViolations = violations.filter(v => v.severity === 'HIGH');
    const mediumViolations = violations.filter(v => v.severity === 'MEDIUM');
    const lowViolations = violations.filter(v => v.severity === 'LOW');

    // Create notification message
    let message = `Timetable "${timetableTitle}" has been generated with constraint violations:\n\n`;
    
    if (criticalViolations.length > 0) {
      message += `🔴 CRITICAL: ${criticalViolations.length} violation(s)\n`;
      criticalViolations.slice(0, 3).forEach(v => {
        message += `   • ${v.description}\n`;
      });
      if (criticalViolations.length > 3) {
        message += `   ... and ${criticalViolations.length - 3} more\n`;
      }
    }
    
    if (highViolations.length > 0) {
      message += `🟠 HIGH: ${highViolations.length} violation(s)\n`;
      highViolations.slice(0, 2).forEach(v => {
        message += `   • ${v.description}\n`;
      });
      if (highViolations.length > 2) {
        message += `   ... and ${highViolations.length - 2} more\n`;
      }
    }
    
    if (mediumViolations.length > 0) {
      message += `🟡 MEDIUM: ${mediumViolations.length} violation(s)\n`;
    }
    
    if (lowViolations.length > 0) {
      message += `🟢 LOW: ${lowViolations.length} violation(s)\n`;
    }

    message += `\nPlease review the timetable and resolve the violations before publishing.`;

    // Determine notification title based on severity
    let title = '⚠️ Timetable Constraint Violations';
    if (criticalViolations.length > 0) {
      title = '🔴 CRITICAL: Timetable Constraint Violations';
    } else if (highViolations.length > 0) {
      title = '🟠 HIGH Priority: Timetable Constraint Violations';
    }

    // Find all publishers in the department
    const { data: publishers, error: publisherError } = await supabase
      .from('users')
      .select('id')
      .eq('department_id', departmentId)
      .eq('role', 'faculty')
      .eq('is_active', true)
      .or('can_publish_timetables.eq.true,role.eq.hod');

    if (publisherError) {
      console.error('❌ Error fetching publishers:', publisherError);
      return { success: false, error: 'Failed to fetch publishers' };
    }

    // Create list of recipients (creator + all publishers)
    const recipients: string[] = [creatorId];
    if (publishers && publishers.length > 0) {
      publishers.forEach(p => {
        if (p.id !== creatorId) { // Don't duplicate if creator is also publisher
          recipients.push(p.id);
        }
      });
    }

    // Create notifications for all recipients
    const notifications = recipients.map(recipientId => ({
      recipient_id: recipientId,
      sender_id: null, // System-generated notification
      type: 'system_alert' as const,
      title: title,
      message: message,
      timetable_id: timetableId,
      batch_id: batchId,
      is_read: false,
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('❌ Error creating constraint violation notifications:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log(`✅ Created ${notifications.length} constraint violation notification(s)`);
    console.log(`   - Recipients: Creator + ${publishers?.length || 0} publisher(s)`);
    console.log(`   - Severity breakdown: ${criticalViolations.length} critical, ${highViolations.length} high, ${mediumViolations.length} medium, ${lowViolations.length} low`);

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error in createConstraintViolationNotifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a generic notification
 */
export async function createNotification(data: {
  recipientId: string;
  senderId?: string;
  type: 'timetable_published' | 'schedule_change' | 'system_alert' | 'approval_request';
  title: string;
  message: string;
  timetableId?: string;
  batchId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: data.recipientId,
        sender_id: data.senderId || null,
        type: data.type,
        title: data.title,
        message: data.message,
        timetable_id: data.timetableId || null,
        batch_id: data.batchId || null,
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('❌ Error creating notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error in createNotification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get publishers for a department
 */
export async function getDepartmentPublishers(departmentId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .or('can_publish_timetables.eq.true,role.eq.hod');

    if (error) {
      console.error('❌ Error fetching department publishers:', error);
      return [];
    }

    return data?.map(u => u.id) || [];
  } catch (error) {
    console.error('❌ Error in getDepartmentPublishers:', error);
    return [];
  }
}
