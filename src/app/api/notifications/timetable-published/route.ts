import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { notificationService } from '@/services/notifications/notificationService';
// Helper function to get authenticated user
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
      .select('id, first_name, last_name, role, is_active')
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

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (!['admin', 'publisher'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admin or publisher can send timetable notifications' },
        { status: 403 }
      );
    }

    const { timetableId } = await request.json();

    if (!timetableId) {
      return NextResponse.json(
        { error: 'Timetable ID is required' },
        { status: 400 }
      );
    }

    console.log('📅 Processing timetable published notification request...');

    const result = await notificationService.notifyTimetablePublished(timetableId);

    return NextResponse.json({
      success: true,
      message: `Timetable published notifications sent to ${result.notified} recipients`,
      data: result,
    });
  } catch (error: any) {
    console.error('❌ Timetable published notification API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send timetable published notifications' },
      { status: 500 }
    );
  }
}
