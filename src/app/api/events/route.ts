import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// GET - Fetch all events or single event by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');
    const status = searchParams.get('status');
    const departmentId = searchParams.get('department_id');
    
    // If fetching a single event by ID
    if (eventId) {
      const { data: eventData, error } = await supabase
        .from('events')
        .select(`
          *,
          department:departments(id, name, code),
          creator:users!events_created_by_fkey(id, first_name, last_name)
        `)
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('Error fetching event:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!eventData) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      // Transform single event data
      const transformedEvent = {
        id: eventData.id,
        title: eventData.title,
        description: eventData.description,
        event_type: eventData.event_type,
        department_id: eventData.department_id,
        department_name: eventData.department?.name || '',
        created_by: eventData.created_by,
        created_by_name: eventData.creator ? `${eventData.creator.first_name} ${eventData.creator.last_name}` : '',
        start_date: eventData.start_date,
        end_date: eventData.end_date,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        venue: eventData.venue,
        classroom_id: eventData.classroom_id,
        expected_participants: eventData.expected_participants,
        budget_allocated: eventData.budget_allocated,
        status: eventData.status,
        priority_level: eventData.priority_level,
        is_public: eventData.is_public,
        registration_required: eventData.registration_required,
        max_registrations: eventData.max_registrations,
        contact_person: eventData.contact_person,
        contact_email: eventData.contact_email,
        contact_phone: eventData.contact_phone,
        created_at: eventData.created_at,
        current_participants: eventData.current_participants || 0
      };

      return NextResponse.json({ success: true, data: transformedEvent });
    }
    
    // Fetch all events with filters
    let query = supabase
      .from('events')
      .select(`
        *,
        department:departments(id, name, code),
        creator:users!events_created_by_fkey(id, first_name, last_name)
      `)
      .order('start_date', { ascending: true });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (departmentId && departmentId !== 'all') {
      query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data to match frontend interface
    const transformedData = data?.map((event: any) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      department_id: event.department_id,
      department_name: event.department?.name || '',
      created_by: event.created_by,
      created_by_name: event.creator ? `${event.creator.first_name} ${event.creator.last_name}` : '',
      start_date: event.start_date,
      end_date: event.end_date,
      start_time: event.start_time,
      end_time: event.end_time,
      venue: event.venue,
      classroom_id: event.classroom_id,
      expected_participants: event.expected_participants,
      status: event.status,
      priority_level: event.priority_level,
      is_public: event.is_public,
      registration_required: event.registration_required,
      max_registrations: event.max_registrations,
      contact_person: event.contact_person,
      contact_email: event.contact_email,
      contact_phone: event.contact_phone,
      created_at: event.created_at,
      date: event.start_date, // Alias for calendar compatibility
      current_participants: event.current_participants || 0
    }));

    return NextResponse.json({ success: true, data: transformedData });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received event creation request:', JSON.stringify(body, null, 2));
    
    const {
      title,
      description,
      event_type,
      department_id,
      start_date,
      end_date,
      start_time,
      end_time,
      venue,
      classroom_id,
      expected_participants,
      budget_allocated,
      contact_person,
      contact_email,
      contact_phone,
      priority_level,
      is_public,
      registration_required,
      max_registrations,
      registration_deadline,
      created_by
    } = body;

    // Validation - only check required fields
    if (!title || !event_type || !department_id || !start_date || !end_date || !start_time || !end_time || !venue || !created_by) {
      console.error('Missing required fields:', {
        title: !!title,
        event_type: !!event_type,
        department_id: !!department_id,
        start_date: !!start_date,
        end_date: !!end_date,
        start_time: !!start_time,
        end_time: !!end_time,
        venue: !!venue,
        created_by: !!created_by
      });
      return NextResponse.json({ error: 'Missing required fields', success: false }, { status: 400 });
    }

    // Check for conflicts
    const { data: existingEvents } = await supabase
      .from('events')
      .select('id, title, start_date, end_date, venue')
      .eq('venue', venue)
      .eq('status', 'approved')
      .or(`start_date.lte.${end_date},end_date.gte.${start_date}`);

    const hasConflict = existingEvents && existingEvents.length > 0;
    const conflictingEvents = existingEvents?.map((e: any) => e.id) || [];

    // Insert event
    const { data, error } = await supabase
      .from('events')
      .insert([{
        title,
        description,
        event_type,
        department_id,
        created_by,
        start_date,
        end_date,
        start_time,
        end_time,
        venue,
        classroom_id,
        expected_participants,
        budget_allocated,
        contact_person,
        contact_email,
        contact_phone,
        priority_level: priority_level || 1,
        is_public: is_public !== undefined ? is_public : true,
        registration_required: registration_required || false,
        max_registrations: max_registrations || 0,
        registration_deadline,
        status: hasConflict ? 'pending' : 'approved',
        has_conflict: hasConflict,
        conflicting_events: conflictingEvents,
        queue_position: hasConflict ? conflictingEvents.length + 1 : null
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data, 
      hasConflict,
      message: hasConflict ? 'Event created but requires approval due to conflicts' : 'Event created successfully'
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update event
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Check for conflicts if date/venue changed
    if (updateData.start_date || updateData.end_date || updateData.venue) {
      const { data: event } = await supabase
        .from('events')
        .select('start_date, end_date, venue')
        .eq('id', id)
        .single();

      if (event) {
        const checkStartDate = updateData.start_date || event.start_date;
        const checkEndDate = updateData.end_date || event.end_date;
        const checkVenue = updateData.venue || event.venue;

        const { data: existingEvents } = await supabase
          .from('events')
          .select('id, title')
          .eq('venue', checkVenue)
          .eq('status', 'approved')
          .neq('id', id)
          .or(`start_date.lte.${checkEndDate},end_date.gte.${checkStartDate}`);

        const hasConflict = existingEvents && existingEvents.length > 0;
        updateData.has_conflict = hasConflict;
        updateData.conflicting_events = existingEvents?.map((e: any) => e.id) || [];
        
        if (hasConflict) {
          updateData.status = 'pending';
          updateData.queue_position = existingEvents.length + 1;
        }
      }
    }

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete event
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting event:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
