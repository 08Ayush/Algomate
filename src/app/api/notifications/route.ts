import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

/**
 * GET /api/notifications?user_id={id}&unread_only={true/false}&limit={number}
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id') || user.id;
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'user_id is required' }, { status: 400 });
    }

    const pool = getPool();
    const params: any[] = [userId];
    let filter = '';
    if (unreadOnly) {
      filter = ' AND is_read = false';
    }

    const result = await pool.query(
      `SELECT * FROM notifications WHERE recipient_id = $1${filter}
       ORDER BY created_at DESC LIMIT $2`,
      [...params, limit]
    );

    const unreadCount = result.rows.filter((n: any) => !n.is_read).length;

    return NextResponse.json({
      success: true,
      data: result.rows,
      unread_count: unreadCount
    });
  } catch (error: any) {
    console.error('❌ Error in notifications GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Mark notification(s) as read
 * Body: { notification_ids?: string[], user_id?: string, mark_all_read?: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { notification_ids, user_id, mark_all_read } = body;

    const pool = getPool();
    const targetUserId = user_id || user.id;

    if (mark_all_read) {
      await pool.query(
        `UPDATE notifications SET is_read = true, read_at = NOW() WHERE recipient_id = $1 AND is_read = false`,
        [targetUserId]
      );
    } else if (notification_ids && notification_ids.length > 0) {
      await pool.query(
        `UPDATE notifications SET is_read = true, read_at = NOW()
         WHERE id = ANY($1::uuid[]) AND recipient_id = $2`,
        [notification_ids, targetUserId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error in notifications PATCH:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/notifications
 * Broadcast a notification to recipients
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { recipient_ids, title, message, type, priority, action_url, batch_id } = body;

    if (!recipient_ids || !Array.isArray(recipient_ids) || recipient_ids.length === 0) {
      return NextResponse.json({ success: false, error: 'recipient_ids array is required' }, { status: 400 });
    }
    if (!title || !message || !type) {
      return NextResponse.json({ success: false, error: 'title, message, type are required' }, { status: 400 });
    }

    const pool = getPool();
    await pool.query(
      `INSERT INTO notifications
         (id, recipient_id, sender_id, type, title, message, batch_id, priority, action_url, is_read, created_at)
       SELECT gen_random_uuid(), UNNEST($1::uuid[]), $2, $3, $4, $5, $6, $7, $8, false, NOW()`,
      [recipient_ids, user.id, type, title, message, batch_id || null, priority || 'normal', action_url || null]
    );

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${recipient_ids.length} recipient(s)`,
      recipients_count: recipient_ids.length,
      data: []
    });
  } catch (error: any) {
    console.error('❌ Error in notifications POST:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


