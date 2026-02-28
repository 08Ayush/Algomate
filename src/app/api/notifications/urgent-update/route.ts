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
    
    if (!user || !['admin', 'publisher'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admin or publisher can send urgent updates' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      batchId,
      updateMessage,
      effectiveDate,
      priority = 'high'
    } = body;

    if (!batchId || !updateMessage || !effectiveDate) {
      return NextResponse.json(
        { error: 'Missing required fields: batchId, updateMessage, effectiveDate' },
        { status: 400 }
      );
    }

    console.log('🚨 Processing urgent update notification request...');

    const updatedBy = `${user.first_name} ${user.last_name}`;

    const result = await notificationService.notifyUrgentUpdate({
      batchId,
      updateMessage,
      effectiveDate,
      updatedBy,
      priority,
    });

    return NextResponse.json({
      success: true,
      message: `Urgent update notifications sent to ${result.notified} recipients`,
      data: result,
    });
  } catch (error: any) {
    console.error('❌ Urgent update notification API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send urgent update notifications' },
      { status: 500 }
    );
  }
}
