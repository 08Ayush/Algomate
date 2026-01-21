import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/shared/database';
import { SupabaseEventRepository } from '@/modules/events/infrastructure/persistence/SupabaseEventRepository';
import { CreateEventUseCase } from '@/modules/events/application/use-cases/CreateEventUseCase';
import { GetEventsUseCase } from '@/modules/events/application/use-cases/GetEventsUseCase';
import { UpdateEventUseCase } from '@/modules/events/application/use-cases/UpdateEventUseCase';
import { DeleteEventUseCase } from '@/modules/events/application/use-cases/DeleteEventUseCase';
import { handleError } from '@/shared/utils/response';
import { Event } from '@/modules/events/domain/entities/Event';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const departmentId = searchParams.get('department_id');

    const eventRepo = new SupabaseEventRepository(supabase);
    const getEventsUseCase = new GetEventsUseCase(eventRepo);

    const result = await getEventsUseCase.execute({
      id: id || undefined,
      status: status === 'all' ? undefined : (status || undefined),
      departmentId: departmentId === 'all' ? undefined : (departmentId || undefined)
    });

    if (id && !result) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Transform to match old API response shape if needed
    // Old API enriched data with department name and creator name. 
    // Use Case returns clean entities.
    // We might need to enrich here for frontend compatibility.

    const dataToTransform = Array.isArray(result) ? result : [result as Event];

    // Quick enrichment (similar to timetables)
    // If high performance needed, this N+1 should be optimized by join in repo
    const transformed = await Promise.all(dataToTransform.map(async (e) => {
      if (!e) return null;
      // Fetch extra details if not in entity
      const { data: dept } = await supabase.from('departments').select('name').eq('id', e.departmentId).single();
      const { data: creator } = await supabase.from('users').select('first_name, last_name').eq('id', e.createdBy).single();

      return {
        ...e.toJSON(),
        department_name: dept?.name || '',
        created_by_name: creator ? `${creator.first_name} ${creator.last_name}` : '',
        // Legacy fields mapping
        start_date: e.eventDate.toISOString(),
        end_date: e.eventDate.toISOString(),
        start_time: '00:00', // Entity missing time?
        end_time: '00:00',
        venue: e.location,
        expected_participants: e.maxParticipants,
        // These fields might be missing in Entity, assuming defaults or extending Entity later
        priority_level: 3,
        is_public: false,
        registration_required: false
      };
    }));

    const responseData = id ? transformed[0] : transformed;

    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic validation
    if (!body.title || !body.start_date || !body.created_by) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const eventRepo = new SupabaseEventRepository(supabase);
    const createEventUseCase = new CreateEventUseCase(eventRepo);

    const { event, hasConflict } = await createEventUseCase.execute({
      title: body.title,
      description: body.description,
      event_date: body.start_date, // Map old field to DTO
      location: body.venue,
      max_participants: body.expected_participants,
      department_id: body.department_id,
      created_by: body.created_by
    });

    return NextResponse.json({
      success: true,
      data: event,
      hasConflict,
      message: hasConflict ? 'Event created but requires approval due to conflicts' : 'Event created successfully'
    });

  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const eventRepo = new SupabaseEventRepository(supabase);
    const updateEventUseCase = new UpdateEventUseCase(eventRepo);

    const { event, hasConflict, conflictingEvents } = await updateEventUseCase.execute({
      id,
      title: updateData.title,
      description: updateData.description,
      eventDate: updateData.start_date ? new Date(updateData.start_date) : undefined,
      location: updateData.venue,
      maxParticipants: updateData.expected_participants
    });

    // If conflict detected during update, we might want to update status to "pending" manually
    if (hasConflict) {
      await supabase.from('events').update({ status: 'pending' }).eq('id', id);
    }

    return NextResponse.json({
      success: true,
      data: event.toJSON(),
      has_conflict: hasConflict,
      conflicting_events: conflictingEvents.map(e => e.id)
    });

  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const eventRepo = new SupabaseEventRepository(supabase);
    const deleteEventUseCase = new DeleteEventUseCase(eventRepo);

    await deleteEventUseCase.execute(id);

    return NextResponse.json({ success: true, message: 'Event deleted successfully' });

  } catch (error) {
    return handleError(error);
  }
}
