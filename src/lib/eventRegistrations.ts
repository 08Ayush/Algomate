/**
 * Event Registration Service
 * RSVP system for users to register for events
 */

import { supabase } from '@/shared/database/client';

// ============================================================================
// TYPES
// ============================================================================

export type RegistrationStatus = 'registered' | 'waitlisted' | 'cancelled' | 'attended';

export interface EventRegistrationInput {
  event_id: string;
  user_id?: string;
  registration_status?: RegistrationStatus;
  notes?: string;
  custom_fields?: Record<string, any>;
}

export interface EventRegistration extends EventRegistrationInput {
  id: string;
  user_id: string;
  registration_status: RegistrationStatus;
  registered_at: string;
  cancelled_at?: string;
  attended_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EventWithRegistrations {
  event_id: string;
  title: string;
  max_participants?: number;
  total_registered: number;
  total_attended: number;
  total_waitlisted: number;
  total_cancelled: number;
  available_slots?: number;
  is_full: boolean;
  registrations?: EventRegistration[];
}

// ============================================================================
// REGISTER FOR EVENT
// ============================================================================

/**
 * Register a user for an event
 */
export async function registerForEvent(
  data: EventRegistrationInput
): Promise<{
  success: boolean;
  registrationId?: string;
  status?: RegistrationStatus;
  message?: string;
  error?: string;
}> {
  try {
    // Get current user if not provided
    let userId = data.user_id;
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if already registered
    const { data: existing, error: checkError } = await supabase
      .from('event_registrations')
      .select('id, registration_status')
      .eq('event_id', data.event_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      return { success: false, error: checkError.message };
    }

    if (existing) {
      if (existing.registration_status === 'registered' || existing.registration_status === 'waitlisted') {
        return {
          success: false,
          error: 'Already registered for this event',
          status: existing.registration_status,
        };
      }
      // If previously cancelled, allow re-registration by updating
    }

    // Get event details to check capacity
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, max_participants')
      .eq('id', data.event_id)
      .single();

    if (eventError) {
      return { success: false, error: 'Event not found' };
    }

    // Count current registrations
    const { count: registeredCount, error: countError } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', data.event_id)
      .eq('registration_status', 'registered');

    if (countError) {
      return { success: false, error: countError.message };
    }

    // Determine registration status
    let registrationStatus: RegistrationStatus = 'registered';
    if (event.max_participants && registeredCount! >= event.max_participants) {
      registrationStatus = 'waitlisted';
    }

    // Insert or update registration
    if (existing) {
      // Update existing registration
      const { data: updated, error: updateError } = await supabase
        .from('event_registrations')
        .update({
          registration_status: registrationStatus,
          notes: data.notes,
          custom_fields: data.custom_fields,
          cancelled_at: null,
          registered_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return {
        success: true,
        registrationId: updated.id,
        status: registrationStatus,
        message: registrationStatus === 'waitlisted' 
          ? 'Added to waitlist - event is full'
          : 'Successfully re-registered for event',
      };
    } else {
      // Create new registration
      const { data: registration, error: insertError } = await supabase
        .from('event_registrations')
        .insert({
          event_id: data.event_id,
          user_id: userId,
          registration_status: registrationStatus,
          notes: data.notes,
          custom_fields: data.custom_fields,
          registered_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      return {
        success: true,
        registrationId: registration.id,
        status: registrationStatus,
        message: registrationStatus === 'waitlisted' 
          ? 'Added to waitlist - event is full'
          : 'Successfully registered for event',
      };
    }
  } catch (error) {
    console.error('❌ Error registering for event:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// CANCEL REGISTRATION
// ============================================================================

/**
 * Cancel event registration
 */
export async function cancelEventRegistration(
  eventId: string,
  userId?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Get current user if not provided
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Update registration status
    const { data, error } = await supabase
      .from('event_registrations')
      .update({
        registration_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Registration not found' };
    }

    // Check if anyone is waitlisted and promote them
    const { data: waitlisted, error: waitlistError } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('registration_status', 'waitlisted')
      .order('registered_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!waitlistError && waitlisted) {
      // Promote first waitlisted user
      await supabase
        .from('event_registrations')
        .update({ registration_status: 'registered' })
        .eq('id', waitlisted.id);
    }

    return {
      success: true,
      message: 'Registration cancelled successfully',
    };
  } catch (error) {
    console.error('❌ Error cancelling registration:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// MARK ATTENDANCE
// ============================================================================

/**
 * Mark user as attended
 */
export async function markAttendance(
  eventId: string,
  userId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .update({
        registration_status: 'attended',
        attended_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Registration not found' };
    }

    return {
      success: true,
      message: 'Attendance marked successfully',
    };
  } catch (error) {
    console.error('❌ Error marking attendance:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// QUERY REGISTRATIONS
// ============================================================================

/**
 * Get event registrations with summary
 */
export async function getEventRegistrations(
  eventId: string,
  filters?: {
    status?: RegistrationStatus;
    include_cancelled?: boolean;
  }
): Promise<{ success: boolean; data?: EventWithRegistrations; error?: string }> {
  try {
    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, max_participants')
      .eq('id', eventId)
      .single();

    if (eventError) {
      return { success: false, error: 'Event not found' };
    }

    // Build registration query
    let query = supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId);

    if (filters?.status) {
      query = query.eq('registration_status', filters.status);
    }

    if (!filters?.include_cancelled) {
      query = query.neq('registration_status', 'cancelled');
    }

    query = query.order('registered_at', { ascending: true });

    const { data: registrations, error: regError } = await query;

    if (regError) {
      return { success: false, error: regError.message };
    }

    // Calculate statistics
    const totalRegistered = registrations.filter((r: any) => r.registration_status === 'registered').length;
    const totalAttended = registrations.filter((r: any) => r.registration_status === 'attended').length;
    const totalWaitlisted = registrations.filter((r: any) => r.registration_status === 'waitlisted').length;
    const totalCancelled = registrations.filter((r: any) => r.registration_status === 'cancelled').length;

    const availableSlots = event.max_participants 
      ? Math.max(0, event.max_participants - totalRegistered)
      : undefined;

    const isFull = event.max_participants 
      ? totalRegistered >= event.max_participants
      : false;

    return {
      success: true,
      data: {
        event_id: eventId,
        title: event.title,
        max_participants: event.max_participants,
        total_registered: totalRegistered,
        total_attended: totalAttended,
        total_waitlisted: totalWaitlisted,
        total_cancelled: totalCancelled,
        available_slots: availableSlots,
        is_full: isFull,
        registrations: registrations,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get user's event registrations
 */
export async function getUserRegistrations(
  userId?: string,
  filters?: {
    status?: RegistrationStatus;
    upcoming_only?: boolean;
  }
): Promise<{ success: boolean; data?: EventRegistration[]; error?: string }> {
  try {
    // Get current user if not provided
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    let query = supabase
      .from('event_registrations')
      .select(`
        *,
        events!inner(id, title, start_date, end_date, location)
      `)
      .eq('user_id', userId);

    if (filters?.status) {
      query = query.eq('registration_status', filters.status);
    }

    if (filters?.upcoming_only) {
      query = query.gte('events.start_date', new Date().toISOString());
    }

    query = query.order('events.start_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Check if user is registered for event
 */
export async function isUserRegistered(
  eventId: string,
  userId?: string
): Promise<{
  success: boolean;
  registered: boolean;
  status?: RegistrationStatus;
  error?: string;
}> {
  try {
    // Get current user if not provided
    if (!userId) {
      return { success: false, registered: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('event_registrations')
      .select('registration_status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { success: false, registered: false, error: error.message };
    }

    if (!data) {
      return { success: true, registered: false };
    }

    const isRegistered = data.registration_status === 'registered' || 
                         data.registration_status === 'waitlisted' ||
                         data.registration_status === 'attended';

    return {
      success: true,
      registered: isRegistered,
      status: data.registration_status,
    };
  } catch (error) {
    return { success: false, registered: false, error: String(error) };
  }
}
