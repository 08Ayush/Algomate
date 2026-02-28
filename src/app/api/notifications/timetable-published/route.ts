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
