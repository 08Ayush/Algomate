import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get authenticated user from token
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const userString = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userString);
    
    // Verify user exists and is active
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, department_id, college_id, role, faculty_type, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !dbUser) {
      return null;
    }

    return dbUser;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    console.log('📋 Fetching recent timetables for user:', user.id);

    // Fetch recent timetables based on user type
    let query = supabase
      .from('generated_timetables')
      .select('id, title, status, created_at, batch_id, batches!inner(name, department_id)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (user.faculty_type === 'creator') {
      query = query.eq('created_by', user.id);
    } else if (user.faculty_type === 'publisher' && user.department_id) {
      query = query.eq('batches.department_id', user.department_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching recent timetables:', error);
      throw error;
    }

    const formatted = data?.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      created_at: t.created_at,
      batch_name: (t.batches as any)?.name || 'Unknown Batch'
    })) || [];

    console.log('✅ Found', formatted.length, 'recent timetables');

    // Fetch notifications for activities
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (notifError) {
      console.error('❌ Error fetching notifications:', notifError);
    }

    const activities = notifications?.map(n => ({
      id: n.id,
      type: n.type === 'timetable_published' ? 'timetable_published' : 
            n.type === 'approval_request' ? 'modification_request' : 'optimization_completed',
      title: n.title || 'Notification',
      description: n.message || '',
      created_at: n.created_at
    })) || [];

    console.log('✅ Found', activities.length, 'recent activities');

    // Fetch pending review count for publishers
    let pendingReviewCount = 0;
    if (user.faculty_type === 'publisher' && user.department_id) {
      const { data: batches } = await supabase
        .from('batches')
        .select('id')
        .eq('department_id', user.department_id);

      const batchIds = batches?.map(b => b.id) || [];

      if (batchIds.length > 0) {
        const { count } = await supabase
          .from('generated_timetables')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending_approval')
          .in('batch_id', batchIds);

        pendingReviewCount = count || 0;
      }
    }

    console.log('✅ Pending review count:', pendingReviewCount);

    return NextResponse.json({
      success: true,
      recentTimetables: formatted,
      recentActivities: activities,
      pendingReviewCount
    });

  } catch (error) {
    console.error('Unexpected error fetching dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
