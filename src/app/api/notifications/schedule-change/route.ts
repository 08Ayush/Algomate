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
    const user = await getAuthenticatedUser(request);

    if (!user || !['admin', 'publisher', 'faculty'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admin, publisher, or faculty can send notifications' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      batchId,
      subjectName,
      subjectCode,
      originalDate,
      newDate,
      originalTime,
      newTime,
      originalRoom,
      newRoom,
      facultyName,
      reason,
      changeType = 'reschedule'
    } = body;

    if (!batchId || !subjectName || !subjectCode || !facultyName) {
      return NextResponse.json(
        { error: 'Missing required fields: batchId, subjectName, subjectCode, facultyName' },
        { status: 400 }
      );
    }

    console.log('📧 Processing schedule change notification request...');

    const result = await notificationService.notifyScheduleChange({
      batchId,
      subjectName,
      subjectCode,
      originalDate,
      newDate,
      originalTime,
      newTime,
      originalRoom,
      newRoom,
      facultyName,
      reason,
      changeType,
    });

    return NextResponse.json({
      success: true,
      message: `Schedule change notifications sent to ${result.notified} recipients`,
      data: result,
    });
  } catch (error: any) {
    console.error('❌ Schedule change notification API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send schedule change notifications' },
      { status: 500 }
    );
  }
}
