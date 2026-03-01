import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Create admin Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper function to get user from Authorization header
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const userString = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userString);

    const { data: dbUser, error } = await supabaseAdmin
      .from('users')
      .select('id, college_id, role, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .in('role', ['admin', 'college_admin'])
      .single();

    if (error || !dbUser) {
      return null;
    }

    return dbUser;
  } catch {
    return null;
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const id = params.id;
    const body = await request.json();

    // Validate required fields
    const { name, capacity, type } = body;
    if (!name || !capacity || !type) {
      return NextResponse.json(
        { error: 'Name, capacity, and type are required' },
        { status: 400 }
      );
    }

    // Validate capacity
    if (capacity < 1 || capacity > 500) {
      return NextResponse.json(
        { error: 'Capacity must be between 1 and 500' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['Lecture Hall', 'Lab', 'Seminar Room', 'Tutorial Room', 'Auditorium'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid classroom type' },
        { status: 400 }
      );
    }

    // Validate floor number
    if (body.floor_number !== undefined && (body.floor_number < 0 || body.floor_number > 20)) {
      return NextResponse.json(
        { error: 'Floor number must be between 0 and 20' },
        { status: 400 }
      );
    }

    // Validate priority
    if (body.classroom_priority !== undefined && (body.classroom_priority < 1 || body.classroom_priority > 10)) {
      return NextResponse.json(
        { error: 'Classroom priority must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Check if classroom exists and belongs to user's college
    const { data: existingClassroom } = await supabaseAdmin
      .from('classrooms')
      .select('id, name, college_id')
      .eq('id', id)
      .eq('college_id', user.college_id)
      .single();

    if (!existingClassroom) {
      return NextResponse.json({ error: 'Classroom not found in your college' }, { status: 404 });
    }

    // Check if another classroom has the same name in the same college (excluding current one)
    const { data: duplicateClassroom } = await supabaseAdmin
      .from('classrooms')
      .select('id')
      .eq('name', name)
      .eq('college_id', user.college_id)
      .neq('id', id)
      .single();

    if (duplicateClassroom) {
      return NextResponse.json(
        { error: 'A classroom with this name already exists' },
        { status: 400 }
      );
    }

    // Prepare updated classroom data
    const classroomData = {
      name: name.trim(),
      building: body.building?.trim() || null,
      floor_number: body.floor_number || 1,
      capacity,
      type,
      has_projector: body.has_projector || false,
      has_ac: body.has_ac || false,
      has_computers: body.has_computers || false,
      has_lab_equipment: body.has_lab_equipment || false,
      is_smart_classroom: body.is_smart_classroom || false,
      classroom_priority: body.classroom_priority || 5,
      booking_weight: body.booking_weight || 1.0,
      facilities: body.facilities || [],
      location_notes: body.location_notes?.trim() || null,
      is_available: body.is_available !== undefined ? body.is_available : true,
      updated_at: new Date().toISOString(),
    };

    const { data: classroom, error } = await supabaseAdmin
      .from('classrooms')
      .update(classroomData)
      .eq('id', id)
      .eq('college_id', user.college_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating classroom:', error);
      return NextResponse.json({ error: 'Failed to update classroom' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Classroom updated successfully',
      classroom
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const id = params.id;

    // Check if classroom exists and belongs to user's college
    const { data: existingClassroom } = await supabaseAdmin
      .from('classrooms')
      .select('id, name, college_id')
      .eq('id', id)
      .eq('college_id', user.college_id)
      .single();

    if (!existingClassroom) {
      return NextResponse.json({ error: 'Classroom not found in your college' }, { status: 404 });
    }

    // Check if classroom is being used in schedules or bookings
    // You might want to add this check based on your schema
    /*
    const { data: schedules } = await supabaseAdmin
      .from('schedules')
      .select('id')
      .eq('classroom_id', id)
      .limit(1);

    if (schedules && schedules.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete classroom as it is being used in schedules' },
        { status: 400 }
      );
    }
    */

    const { error } = await supabaseAdmin
      .from('classrooms')
      .delete()
      .eq('id', id)
      .eq('college_id', user.college_id);

    if (error) {
      console.error('Error deleting classroom:', error);
      return NextResponse.json({ error: 'Failed to delete classroom' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Classroom deleted successfully' });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}