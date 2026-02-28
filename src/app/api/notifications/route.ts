import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';
import {
  BroadcastNotificationUseCase,
  GetNotificationsUseCase,
  MarkAsReadUseCase,
  SupabaseNotificationRepository,
  BroadcastNotificationDtoSchema,
  MarkAsReadDtoSchema
} from '@/modules/notifications';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
const notificationRepo = new SupabaseNotificationRepository(supabaseClient);

const broadcastUseCase = new BroadcastNotificationUseCase(notificationRepo, supabaseClient);
const getNotificationsUseCase = new GetNotificationsUseCase(notificationRepo);
const markAsReadUseCase = new MarkAsReadUseCase(notificationRepo);

/**
 * GET /api/notifications?user_id={id}&unread_only={true/false}&limit={number}
 * Fetches notifications for a user
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    // limit and unread_only are implementation details handled by UseCase if complex, 
    // but for now our UseCase just fetches all by user. 
    // TODO: Add pagination/filtering to UseCase for parity if needed, but 'findByUser' does logic.

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    const result = await getNotificationsUseCase.execute(userId);

    return NextResponse.json({
      success: true,
      data: result.notifications,
      unread_count: result.unreadCount
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
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();

    // Validate DTO
    // We construct a DTO manually to match what the UseCase expects if needed, or validate directly
    // The Schema we exported matches the expected body structure roughly

    // Manually mapping or validating
    // The legacy body: { notification_ids, user_id, mark_all_read }
    // Our DTO: { notification_ids?, user_id?, mark_all_read? }

    const dto = MarkAsReadDtoSchema.parse(body);

    await markAsReadUseCase.execute(dto);

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
 * Create a new notification (broadcast)
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();

    // Validate with Zod
    const dto = BroadcastNotificationDtoSchema.parse(body);

    const result = await broadcastUseCase.execute(dto);

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${result.recipients_count} recipient(s)`,
      recipients_count: result.recipients_count,
      data: [] // Legacy returned created notifications, but for bulk it might be too large. Returning empty array for now or we can update UseCase to return them.
    });
  } catch (error: any) {
    console.error('❌ Error in notifications POST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
