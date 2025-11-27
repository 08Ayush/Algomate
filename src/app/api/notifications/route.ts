import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type NotificationType = 'timetable_published' | 'schedule_change' | 'system_alert' | 'approval_request';

/**
 * GET /api/notifications?user_id={id}&unread_only={true/false}&limit={number}
 * Fetches notifications for a user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('❌ Error fetching notifications:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    return NextResponse.json({
      success: true,
      data: notifications || [],
      unread_count: unreadCount || 0
    });
  } catch (error: any) {
    console.error('❌ Error in notifications API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark notification(s) as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification_ids, user_id, mark_all_read } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('recipient_id', user_id);

    if (mark_all_read) {
      // Mark all as read for this user
      query = query.eq('is_read', false);
    } else if (notification_ids && notification_ids.length > 0) {
      // Mark specific notifications as read
      query = query.in('id', notification_ids);
    } else {
      return NextResponse.json(
        { success: false, error: 'notification_ids or mark_all_read is required' },
        { status: 400 }
      );
    }

    const { error } = await query;

    if (error) {
      console.error('❌ Error marking notifications as read:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error in notifications PATCH:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create a new notification (broadcast to students/faculty about timetable changes)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sender_id, 
      type, 
      title, 
      message, 
      timetable_id, 
      batch_id,
      recipient_ids,
      broadcast_to_batch,
      broadcast_to_department,
      department_id
    } = body;

    // Validate required fields
    if (!sender_id || !type || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'sender_id, type, title, and message are required' },
        { status: 400 }
      );
    }

    // Validate notification type
    const validTypes: NotificationType[] = ['timetable_published', 'schedule_change', 'system_alert', 'approval_request'];
    if (!validTypes.includes(type as NotificationType)) {
      return NextResponse.json(
        { success: false, error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify sender exists and is a creator or publisher
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('id, role, faculty_type')
      .eq('id', sender_id)
      .single();

    if (senderError || !sender) {
      return NextResponse.json(
        { success: false, error: 'Invalid sender' },
        { status: 400 }
      );
    }

    if (sender.role !== 'faculty' || !['creator', 'publisher'].includes(sender.faculty_type)) {
      return NextResponse.json(
        { success: false, error: 'Only creator and publisher faculty can send notifications' },
        { status: 403 }
      );
    }

    let recipientIdsList: string[] = [];

    // Determine recipients
    if (broadcast_to_batch && batch_id) {
      // Get all students in the batch + faculty teaching that batch
      const { data: batchStudents, error: studentsError } = await supabase
        .from('student_batch_enrollment')
        .select('student_id')
        .eq('batch_id', batch_id)
        .eq('is_active', true);

      if (studentsError) {
        console.error('Error fetching batch students:', studentsError);
      } else {
        recipientIdsList.push(...(batchStudents?.map(s => s.student_id) || []));
      }

      // Get faculty teaching subjects in this batch
      const { data: batchFaculty, error: facultyError } = await supabase
        .from('batch_subjects')
        .select('assigned_faculty_id')
        .eq('batch_id', batch_id)
        .not('assigned_faculty_id', 'is', null);

      if (facultyError) {
        console.error('Error fetching batch faculty:', facultyError);
      } else {
        const uniqueFacultyIds = [...new Set(batchFaculty?.map(f => f.assigned_faculty_id).filter(Boolean) || [])];
        recipientIdsList.push(...uniqueFacultyIds);
      }
    } else if (broadcast_to_department && department_id) {
      // Get all users in the department (faculty and students)
      const { data: deptUsers, error: deptError } = await supabase
        .from('users')
        .select('id')
        .eq('department_id', department_id)
        .eq('is_active', true)
        .in('role', ['faculty', 'student']);

      if (deptError) {
        console.error('Error fetching department users:', deptError);
      } else {
        recipientIdsList.push(...(deptUsers?.map(u => u.id) || []));
      }
    } else if (recipient_ids && recipient_ids.length > 0) {
      // Specific recipients
      recipientIdsList = recipient_ids;
    } else {
      return NextResponse.json(
        { success: false, error: 'Must specify recipients (recipient_ids, broadcast_to_batch, or broadcast_to_department)' },
        { status: 400 }
      );
    }

    // Remove duplicates and sender from recipients
    recipientIdsList = [...new Set(recipientIdsList)].filter(id => id !== sender_id);

    if (recipientIdsList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid recipients found' },
        { status: 400 }
      );
    }

    // Create notifications for all recipients
    const notificationsToCreate = recipientIdsList.map(recipientId => ({
      recipient_id: recipientId,
      sender_id: sender_id,
      type: type,
      title: title,
      message: message,
      timetable_id: timetable_id || null,
      batch_id: batch_id || null,
      is_read: false,
      created_at: new Date().toISOString()
    }));

    const { data: createdNotifications, error: createError } = await supabase
      .from('notifications')
      .insert(notificationsToCreate)
      .select();

    if (createError) {
      console.error('❌ Error creating notifications:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${recipientIdsList.length} recipient(s)`,
      recipients_count: recipientIdsList.length,
      data: createdNotifications
    });
  } catch (error: any) {
    console.error('❌ Error in notifications POST:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
