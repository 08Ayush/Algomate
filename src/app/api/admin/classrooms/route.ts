import { NextRequest, NextResponse } from 'next/server';
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
async function getAuthenticatedUser(request: NextRequest, requireAdmin = false) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    // Decode and verify the user token
    const userString = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userString);
    
    // Verify user exists and is active
    const { data: dbUser, error } = await supabaseAdmin
      .from('users')
      .select('id, college_id, role, faculty_type, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !dbUser) {
      return null;
    }

    // For write operations, only allow admin/college_admin
    if (requireAdmin && !['admin', 'college_admin'].includes(dbUser.role)) {
      return null;
    }

    // For read operations, allow admin, college_admin, and faculty with creator/publisher types
    if (!requireAdmin) {
      const allowedRoles = ['admin', 'college_admin'];
      const allowedFacultyTypes = ['creator', 'publisher'];
      
      if (!allowedRoles.includes(dbUser.role) && 
          !(dbUser.role === 'faculty' && allowedFacultyTypes.includes(dbUser.faculty_type))) {
        return null;
      }
    }

    return dbUser;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user - allow read access for creator/publisher
    const user = await getAuthenticatedUser(request, false);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in as an admin.' },
        { status: 401 }
      );
    }

    // Fetch classrooms only for user's college
    const { data: classrooms, error } = await supabaseAdmin
      .from('classrooms')
      .select('*')
      .eq('college_id', user.college_id)
      .order('name');

    if (error) {
      console.error('Error fetching classrooms:', error);
      return NextResponse.json({ error: 'Failed to fetch classrooms' }, { status: 500 });
    }

    return NextResponse.json({ classrooms: classrooms || [] });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user - require admin for creating classrooms
    const user = await getAuthenticatedUser(request, true);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can create classrooms.' },
        { status: 403 }
      );
    }

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

    // Check if classroom name already exists in the same college
    const { data: existingClassroom } = await supabaseAdmin
      .from('classrooms')
      .select('id')
      .eq('name', name)
      .eq('college_id', user.college_id)
      .single();

    if (existingClassroom) {
      return NextResponse.json(
        { error: 'A classroom with this name already exists in your college' },
        { status: 400 }
      );
    }

    // Prepare classroom data
    const classroomData = {
      name: name.trim(),
      building: body.building?.trim() || null,
      floor_number: body.floor_number || 1,
      capacity,
      type,
      college_id: user.college_id,  // Use authenticated user's college_id
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
    };

    const { data: classroom, error } = await supabaseAdmin
      .from('classrooms')
      .insert([classroomData])
      .select()
      .single();

    if (error) {
      console.error('Error creating classroom:', error);
      return NextResponse.json({ error: 'Failed to create classroom' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Classroom created successfully',
      classroom 
    }, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}