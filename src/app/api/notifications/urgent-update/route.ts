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
