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
      return NextResponse.json({ error: 'Supabase configuration missing on server.' }, { status: 500 });
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
          creator:users!created_by(id, first_name, last_name)
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

      const transformedEvent = {
        id: eventData.id,
        title: eventData.title,
        description: eventData.description,
        event_type: eventData.event_type,
        department_id: eventData.department_id,
        department_name: eventData.department?.name || '',
        created_by: eventData.created_by,
        created_by_name: eventData.creator ? `${eventData.creator.first_name} ${eventData.creator.last_name}` : '',
        // Map deployed schema columns to frontend expected names
        start_date: eventData.event_date, // Deployed: event_date
        end_date: eventData.event_date, // No end_date in deployed schema
        start_time: eventData.event_time, // Deployed: event_time
        end_time: eventData.end_time,
        venue: eventData.location, // Deployed: location
        expected_participants: eventData.max_participants || 0,
        max_registrations: eventData.max_participants || 0,
        current_participants: 0, // Not in deployed schema
        status: eventData.status,
        priority_level: eventData.priority === 'high' ? 5 : (eventData.priority === 'low' ? 1 : 3),
        is_public: !eventData.is_featured,
        registration_required: eventData.registration_required || false,
        has_conflict: false,
        created_at: eventData.created_at,
        updated_at: eventData.updated_at
      };

      return NextResponse.json({ success: true, data: transformedEvent });
    }

    // Fetch all events with filters
    let query = supabase
      .from('events')
      .select(`
        *,
        department:departments(id, name, code),
        creator:users!created_by(id, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

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

    // Transform data - map deployed schema columns to frontend expected names
    const transformedData = data?.map((event: any) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      department_id: event.department_id,
      department_name: event.department?.name || '',
      created_by: event.created_by,
      creator_name: event.creator ? `${event.creator.first_name} ${event.creator.last_name}` : '',
      start_date: event.event_date, // Deployed: event_date → Frontend: start_date
      end_date: event.event_date, // No end_date in deployed schema, use start
      start_time: event.event_time, // Deployed: event_time → Frontend: start_time
      end_time: event.end_time,
      venue: event.location, // Deployed: location → Frontend: venue
      expected_participants: event.max_participants || 0,
      max_registrations: event.max_participants || 0,
      status: event.status,
      priority_level: event.priority === 'high' ? 5 : (event.priority === 'low' ? 1 : 3),
      is_public: !event.is_featured, // Approximate mapping
      registration_required: event.registration_required || false,
      has_conflict: false,
      created_at: event.created_at,
      updated_at: event.updated_at
    }));

    return NextResponse.json({ success: true, data: transformedData, events: transformedData });
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
      return NextResponse.json({ error: 'Supabase configuration missing on server.' }, { status: 500 });
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
      max_registrations,
      priority_level,
      is_public,
      registration_required,
      created_by
    } = body;

    // Validation
    if (!title || !start_date || !created_by || !department_id) {
      return NextResponse.json({
        error: 'Missing required fields: title, start_date, created_by, department_id',
        success: false
      }, { status: 400 });
    }

    // Map to DEPLOYED schema (not new_schema.sql)
    // Deployed DB uses: event_date, event_time, location, college_id (required)

    // Get college_id from request body
    const college_id = body.college_id;

    if (!college_id) {
      return NextResponse.json({
        error: 'college_id is required',
        success: false
      }, { status: 400 });
    }

    // Generate UUID for id since deployed schema doesn't have DEFAULT gen_random_uuid()
    const eventId = crypto.randomUUID();

    const insertData: any = {
      id: eventId, // REQUIRED - deployed schema has no default UUID generator
      title,
      description: description || '',
      event_type: event_type || 'workshop', // VARCHAR, not ENUM
      department_id,
      created_by,
      college_id, // REQUIRED in deployed schema
      event_date: start_date, // Deployed uses 'event_date' not 'start_date'
      event_time: start_time || '09:00', // Deployed uses 'event_time' not 'start_time'
      end_time: end_time || '10:00',
      location: venue || 'TBA', // Deployed uses 'location' not 'venue'
      status: 'draft', // Deployed uses content_status enum (draft/published/archived)
      registration_required: registration_required || false,
      max_participants: max_registrations || expected_participants || 0,
      priority: priority_level ? (priority_level > 3 ? 'high' : 'normal') : 'normal'
    };

    const { data, error } = await supabase
      .from('events')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Event created successfully'
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}

// PUT - Update event
export async function PUT(request: NextRequest) {
  try {
    if (!checkSupabaseConfig()) {
      return NextResponse.json({ error: 'Supabase configuration missing on server.' }, { status: 500 });
    }
    const body = await request.json();
    console.log('Received event update request:', JSON.stringify(body, null, 2));

    const { id, ...rawUpdateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Map frontend field names to DEPLOYED schema column names
    const updateData: any = {};
    if (rawUpdateData.title !== undefined) updateData.title = rawUpdateData.title;
    if (rawUpdateData.description !== undefined) updateData.description = rawUpdateData.description;
    if (rawUpdateData.event_type !== undefined) updateData.event_type = rawUpdateData.event_type;
    if (rawUpdateData.department_id !== undefined) updateData.department_id = rawUpdateData.department_id;
    if (rawUpdateData.status !== undefined) updateData.status = rawUpdateData.status;
    if (rawUpdateData.registration_required !== undefined) updateData.registration_required = rawUpdateData.registration_required;

    // Map to deployed schema column names (different from frontend!)
    if (rawUpdateData.start_date !== undefined) updateData.event_date = rawUpdateData.start_date; // Frontend: start_date → DB: event_date
    if (rawUpdateData.start_time !== undefined) updateData.event_time = rawUpdateData.start_time; // Frontend: start_time → DB: event_time
    if (rawUpdateData.end_time !== undefined) updateData.end_time = rawUpdateData.end_time;
    if (rawUpdateData.venue !== undefined) updateData.location = rawUpdateData.venue; // Frontend: venue → DB: location

    // Map participants fields
    if (rawUpdateData.expected_participants !== undefined || rawUpdateData.max_registrations !== undefined) {
      updateData.max_participants = rawUpdateData.max_registrations || rawUpdateData.expected_participants || 0; // Frontend: max_registrations → DB: max_participants
    }

    // Map priority
    if (rawUpdateData.priority_level !== undefined) {
      updateData.priority = rawUpdateData.priority_level > 3 ? 'high' : (rawUpdateData.priority_level < 2 ? 'low' : 'normal'); // Frontend: priority_level (number) → DB: priority (varchar)
    }

    // is_public doesn't exist in deployed schema, map to is_featured
    if (rawUpdateData.is_public !== undefined) {
      updateData.is_featured = !rawUpdateData.is_public; // Invert logic
    }

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, message: 'Event updated successfully' });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}

// DELETE - Delete event
export async function DELETE(request: NextRequest) {
  try {
    if (!checkSupabaseConfig()) {
      return NextResponse.json({ error: 'Supabase configuration missing on server.' }, { status: 500 });
    }

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
