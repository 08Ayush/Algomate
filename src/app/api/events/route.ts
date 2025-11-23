import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Use service role key for server-side operations (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function mask(val?: string) {
  if (!val) return '<<missing>>';
  try { return val.slice(0, 8) + '...' + val.slice(-4); } catch { return '<<masked>>'; }
}

function checkSupabaseConfig() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase config missing:', { 
      SUPABASE_URL: mask(supabaseUrl), 
      SUPABASE_SERVICE_ROLE_KEY: mask(supabaseServiceKey) 
    });
    return false;
  }
  return true;
}

// GET - Fetch all events or single event by ID
export async function GET(request: NextRequest) {
  try {
    if (!checkSupabaseConfig()) {
      return NextResponse.json({ error: 'Supabase configuration missing on server. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 });
    }
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

      // Transform single event data (map database schema to frontend)
      const transformedEvent = {
        id: eventData.id,
        title: eventData.title,
        description: eventData.description,
        event_type: eventData.event_type,
        department_id: eventData.department_id,
        department_name: eventData.department?.name || '',
        created_by: eventData.created_by,
        created_by_name: eventData.creator ? `${eventData.creator.first_name} ${eventData.creator.last_name}` : '',
        start_date: eventData.event_date, // Map event_date to start_date
        end_date: eventData.event_date, // Same date for both
        start_time: eventData.event_time, // Map event_time to start_time
        end_time: eventData.end_time,
        venue: eventData.location, // Map location to venue
        expected_participants: eventData.max_participants,
        status: eventData.status,
        priority_level: eventData.priority === 'high' ? 1 : eventData.priority === 'medium' ? 2 : 3,
        is_public: eventData.is_featured,
        registration_required: eventData.registration_required,
        max_registrations: eventData.max_participants,
        registration_link: eventData.registration_link,
        created_at: eventData.created_at,
        published_at: eventData.published_at
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
      .order('event_date', { ascending: true });

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

    // Transform data to match frontend interface (map database schema)
    const transformedData = data?.map((event: any) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      department_id: event.department_id,
      department_name: event.department?.name || '',
      created_by: event.created_by,
      created_by_name: event.creator ? `${event.creator.first_name} ${event.creator.last_name}` : '',
      start_date: event.event_date, // Map event_date to start_date
      end_date: event.event_date, // Same date for both
      start_time: event.event_time, // Map event_time to start_time
      end_time: event.end_time,
      venue: event.location, // Map location to venue
      expected_participants: event.max_participants,
      status: event.status,
      priority_level: event.priority === 'high' ? 1 : event.priority === 'medium' ? 2 : 3,
      is_public: event.is_featured,
      registration_required: event.registration_required,
      max_registrations: event.max_participants,
      registration_link: event.registration_link,
      created_at: event.created_at,
      published_at: event.published_at,
      date: event.event_date // Alias for calendar compatibility
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
    if (!checkSupabaseConfig()) {
      return NextResponse.json({ error: 'Supabase configuration missing on server. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 });
    }
    
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
      expected_participants,
      priority_level,
      is_public,
      registration_required,
      max_registrations,
      registration_link,
      created_by,
      college_id
    } = body;

    // Get college_id from user if not provided
    let eventCollegeId = college_id;
    if (!eventCollegeId && created_by) {
      const { data: userData } = await supabase
        .from('users')
        .select('college_id')
        .eq('id', created_by)
        .single();
      eventCollegeId = userData?.college_id;
    }

    // Validation - only check required fields (matching database schema)
    if (!title || !start_date || !created_by || !eventCollegeId) {
      console.error('Missing required fields:', {
        title: !!title,
        start_date: !!start_date,
        created_by: !!created_by,
        college_id: !!eventCollegeId
      });
      return NextResponse.json({ error: 'Missing required fields: title, start_date (event_date), created_by, college_id', success: false }, { status: 400 });
    }

    // Insert event - map to actual database schema
    const { data, error } = await supabase
      .from('events')
      .insert([{
        title,
        description,
        event_type,
        department_id,
        college_id: eventCollegeId,
        created_by,
        event_date: start_date, // Use start_date as the main event date
        event_time: start_time,
        end_time,
        location: venue, // venue maps to location
        max_participants: expected_participants || max_registrations || null,
        registration_link: registration_link || null,
        priority: priority_level === 1 ? 'high' : priority_level === 2 ? 'medium' : 'normal',
        is_featured: is_public !== undefined ? is_public : false,
        registration_required: registration_required || false,
        status: 'draft' // Default status for new events
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check for conflicts after creation
    let hasConflict = false;
    if (data && venue && start_date) {
      const { data: existingEvents } = await supabase
        .from('events')
        .select('id, title')
        .eq('location', venue)
        .eq('status', 'approved')
        .neq('id', data.id)
        .gte('event_date', start_date)
        .lte('event_date', end_date || start_date);

      hasConflict = !!(existingEvents && existingEvents.length > 0);
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
    if (!checkSupabaseConfig()) {
      return NextResponse.json({ error: 'Supabase configuration missing on server. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 });
    }
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
