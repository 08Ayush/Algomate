import { NextRequest, NextResponse } from 'next/server';
import {
  registerForEvent,
  cancelEventRegistration,
  markAttendance,
  getEventRegistrations,
  getUserRegistrations,
  isUserRegistered,
  RegistrationStatus,
} from '@/lib/eventRegistrations';
import { requireAuth } from '@/lib/auth';

// ============================================================================
// GET - Query event registrations
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Get registrations for specific event
    if (action === 'event') {
      const eventId = searchParams.get('event_id');
      const status = searchParams.get('status') as RegistrationStatus | undefined;
      const includeCancelled = searchParams.get('include_cancelled') === 'true';

      if (!eventId) {
        return NextResponse.json(
          { error: 'event_id is required' },
          { status: 400 }
        );
      }

      const result = await getEventRegistrations(eventId, {
        status,
        include_cancelled: includeCancelled,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    // Get user's registrations
    if (action === 'user') {
      const userId = searchParams.get('user_id') || undefined;
      const status = searchParams.get('status') as RegistrationStatus | undefined;
      const upcomingOnly = searchParams.get('upcoming_only') === 'true';

      const result = await getUserRegistrations(userId, {
        status,
        upcoming_only: upcomingOnly,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    // Check if user is registered
    if (action === 'check') {
      const eventId = searchParams.get('event_id');
      const userId = searchParams.get('user_id') || undefined;

      if (!eventId) {
        return NextResponse.json(
          { error: 'event_id is required' },
          { status: 400 }
        );
      }

      const result = await isUserRegistered(eventId, userId);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        registered: result.registered,
        status: result.status,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: event, user, or check' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Event registrations GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Register for event or mark attendance
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { action, event_id, user_id, notes, custom_fields } = body;

    // Register for event
    if (!action || action === 'register') {
      if (!event_id) {
        return NextResponse.json(
          { error: 'event_id is required' },
          { status: 400 }
        );
      }

      const result = await registerForEvent({
        event_id,
        user_id,
        notes,
        custom_fields,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        registration_id: result.registrationId,
        status: result.status,
        message: result.message,
      });
    }

    // Mark attendance
    if (action === 'mark_attendance') {
      if (!event_id || !user_id) {
        return NextResponse.json(
          { error: 'event_id and user_id are required' },
          { status: 400 }
        );
      }

      const result = await markAttendance(event_id, user_id);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: result.message,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: register or mark_attendance' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Event registrations POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Cancel registration
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    const userId = searchParams.get('user_id') || undefined;

    if (!eventId) {
      return NextResponse.json(
        { error: 'event_id is required' },
        { status: 400 }
      );
    }

    const result = await cancelEventRegistration(eventId, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('❌ Event registrations DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
