import { serviceDb as supabase } from '@/shared/database';
import { emailService } from '../email/emailService';
export class NotificationService {
  /**
   * Notify about schedule change or class rescheduling
   */
  async notifyScheduleChange(changeDetails: {
    batchId: string;
    subjectName: string;
    subjectCode: string;
    originalDate?: string;
    newDate?: string;
    originalTime?: string;
    newTime?: string;
    originalRoom?: string;
    newRoom?: string;
    facultyName: string;
    reason?: string;
    changeType: 'reschedule' | 'cancellation' | 'room_change' | 'time_change';
  }) {
    try {
      console.log('📧 Sending schedule change notifications...');

      // Get batch details
      const { data: batch } = await supabase
        .from('batches')
        .select('id, name, section, course_id, semester')
        .eq('id', changeDetails.batchId)
        .single();

      if (!batch) throw new Error('Batch not found');

      // Get all enrolled students
      const { data: students } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('role', 'student')
        .eq('course_id', batch.course_id)
        .eq('current_semester', batch.semester)
        .eq('is_active', true);

      // Get all faculty for this batch
      const { data: faculty } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('role', 'faculty')
        .eq('course_id', batch.course_id)
        .eq('is_active', true);

      const recipients = [
        ...(students || []),
        ...(faculty || []),
      ];

      console.log(`📨 Sending to ${recipients.length} recipients...`);

      let emailsSent = 0;
      const emailAddresses = recipients
        .filter(r => r.email)
        .map(r => r.email);

      if (emailAddresses.length > 0) {
        // Send batch email
        const result = await emailService.sendEmail({
          to: emailAddresses,
          subject: `⚠️ Schedule Change Alert - ${changeDetails.subjectName}`,
          template: 'schedule/change',
          data: {
            recipientName: 'Student/Faculty',
            batchName: `${batch.name} ${batch.section}`,
            subjectName: changeDetails.subjectName,
            subjectCode: changeDetails.subjectCode,
            changeType: changeDetails.changeType,
            originalDate: changeDetails.originalDate,
            newDate: changeDetails.newDate,
            originalTime: changeDetails.originalTime,
            newTime: changeDetails.newTime,
            originalRoom: changeDetails.originalRoom,
            newRoom: changeDetails.newRoom,
            facultyName: changeDetails.facultyName,
            reason: changeDetails.reason,
            scheduleUrl: `${process.env.NEXT_PUBLIC_APP_URL}/student/dashboard`,
          },
        });

        if (result.success) {
          emailsSent = emailAddresses.length;
        }
      }

      // Log notifications in database
      for (const recipient of recipients) {
        await supabase.from('notifications').insert({
          recipient_id: recipient.id,
          type: 'schedule_change',
          title: 'Schedule Change Alert',
          message: `${changeDetails.subjectName} has been ${changeDetails.changeType === 'cancellation' ? 'cancelled' : 'rescheduled'}`,
          batch_id: changeDetails.batchId,
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        });
      }

      console.log(`✅ Notifications sent to ${emailsSent} recipients`);
      return { success: true, notified: emailsSent };
    } catch (error: any) {
      console.error('❌ Schedule change notification error:', error);
      throw error;
    }
  }

  /**
   * Notify about urgent timetable updates
   */
  async notifyUrgentUpdate(updateDetails: {
    batchId: string;
    updateMessage: string;
    effectiveDate: string;
    updatedBy: string;
    priority: 'high' | 'urgent';
  }) {
    try {
      console.log('🚨 Sending urgent update notifications...');

      const { data: batch } = await supabase
        .from('batches')
        .select('id, name, section, course_id, semester')
        .eq('id', updateDetails.batchId)
        .single();

      if (!batch) throw new Error('Batch not found');

      const { data: students } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('role', 'student')
        .eq('course_id', batch.course_id)
        .eq('current_semester', batch.semester)
        .eq('is_active', true);

      const { data: faculty } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('role', 'faculty')
        .eq('course_id', batch.course_id)
        .eq('is_active', true);

      const recipients = [...(students || []), ...(faculty || [])];
      const emailAddresses = recipients.filter(r => r.email).map(r => r.email);

      if (emailAddresses.length > 0) {
        await emailService.sendEmail({
          to: emailAddresses,
          subject: `🚨 URGENT: Timetable Update - ${batch.name} ${batch.section}`,
          template: 'schedule/urgent-update',
          data: {
            batchName: `${batch.name} ${batch.section}`,
            updateMessage: updateDetails.updateMessage,
            effectiveDate: updateDetails.effectiveDate,
            updatedBy: updateDetails.updatedBy,
            priority: updateDetails.priority,
            scheduleUrl: `${process.env.NEXT_PUBLIC_APP_URL}/student/dashboard`,
          },
        });
      }

      for (const recipient of recipients) {
        await supabase.from('notifications').insert({
          recipient_id: recipient.id,
          type: 'urgent_update',
          title: 'Urgent Timetable Update',
          message: updateDetails.updateMessage,
          batch_id: updateDetails.batchId,
          priority: updateDetails.priority,
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        });
      }

      return { success: true, notified: emailAddresses.length };
    } catch (error: any) {
      console.error('❌ Urgent update notification error:', error);
      throw error;
    }
  }

  /**
   * Notify when timetable is published
   */
  async notifyTimetablePublished(timetableId: string) {
    try {
      console.log('📅 Sending timetable published notifications...');

      const { data: timetable } = await supabase
        .from('generated_timetables')
        .select(`
          *,
          batches (
            id,
            name,
            section,
            semester,
            academic_year,
            course_id
          ),
          created_by_user:users!created_by(first_name, last_name)
        `)
        .eq('id', timetableId)
        .single();

      if (!timetable) throw new Error('Timetable not found');

      const { data: students } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('role', 'student')
        .eq('course_id', timetable.batches.course_id)
        .eq('current_semester', timetable.batches.semester)
        .eq('is_active', true);

      const { data: scheduledClasses } = await supabase
        .from('scheduled_classes')
        .select('faculty_id, faculty:users!faculty_id(id, email, first_name, last_name)')
        .eq('timetable_id', timetableId);

      const facultyMap = new Map();
      scheduledClasses?.forEach((sc: any) => {
        if (sc.faculty?.email) {
          facultyMap.set(sc.faculty.id, sc.faculty);
        }
      });

      const recipients = [
        ...(students || []),
        ...Array.from(facultyMap.values()),
      ];

      const emailAddresses = recipients.filter(r => r.email).map(r => r.email);

      if (emailAddresses.length > 0) {
        await emailService.sendEmail({
          to: emailAddresses,
          subject: `📅 New Timetable Published - ${timetable.batches.name} ${timetable.batches.section}`,
          template: 'timetable/published',
          data: {
            recipientName: 'Student/Faculty',
            batchName: `${timetable.batches.name} ${timetable.batches.section}`,
            semester: timetable.semester,
            academicYear: timetable.academic_year,
            effectiveFrom: timetable.effective_from || new Date().toISOString(),
            publishedBy: `${timetable.created_by_user.first_name} ${timetable.created_by_user.last_name}`,
            publishedAt: timetable.approved_at || timetable.created_at,
            timetableUrl: `${process.env.NEXT_PUBLIC_APP_URL}/student/dashboard`,
          },
        });
      }

      for (const recipient of recipients) {
        await supabase.from('notifications').insert({
          recipient_id: recipient.id,
          type: 'timetable_published',
          title: 'New Timetable Published',
          message: `A new timetable has been published for ${timetable.batches.name} ${timetable.batches.section}`,
          timetable_id: timetableId,
          batch_id: timetable.batch_id,
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        });
      }

      return { success: true, notified: emailAddresses.length };
    } catch (error: any) {
      console.error('❌ Timetable published notification error:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
