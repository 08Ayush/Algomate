import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { notificationService } from '@/services/notifications/notificationService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    
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
