import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Create server-side supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
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
    
    // Verify user exists and is active - include department_id
    const { data: dbUser, error } = await supabaseAdmin
      .from('users')
      .select('id, college_id, department_id, role, faculty_type, is_active')
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

// GET - Fetch subjects for authenticated user's college (and department if creator)
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

    // Build query based on user role
    let query = supabaseAdmin
      .from('subjects')
      .select(`
        *,
        departments:department_id (
          id,
          name,
          code
        ),
        courses:course_id (
          id,
          title,
          code
        )
      `)
      .eq('college_id', user.college_id);

    // Filter by department for creator role
    if (user.role === 'faculty' && user.faculty_type === 'creator' && user.department_id) {
      query = query.eq('department_id', user.department_id);
    }

    const { data: subjects, error } = await query
      .order('semester')
      .order('code');

    if (error) {
      console.error('Subjects fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subjects' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subjects: subjects || []
    });

  } catch (error: any) {
    console.error('Subjects API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new subject
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user - require admin role for write operations
    const user = await getAuthenticatedUser(request, true);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can create subjects.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      code,
      name,
      credits_per_week,
      semester,
      department_id,
      course_id,
      nep_category,
      subject_type,
      description,
      requires_lab,
      requires_projector,
      is_active
    } = body;

    // Debug logging
    console.log('Received body:', JSON.stringify(body, null, 2));
    console.log('nep_category value:', nep_category, 'type:', typeof nep_category);
    console.log('subject_type value:', subject_type, 'type:', typeof subject_type);

    // Validate required fields
    if (!code || !name || !credits_per_week || !department_id || !nep_category) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, credits_per_week, department_id, nep_category' },
        { status: 400 }
      );
    }

    // Verify department belongs to user's college
    const { data: department, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('id, college_id')
      .eq('id', department_id)
      .eq('college_id', user.college_id)
      .single();

    if (deptError || !department) {
      return NextResponse.json(
        { error: 'Invalid department or access denied' },
        { status: 403 }
      );
    }

    // Check if subject code already exists in the same department
    const { data: existingSubject, error: checkError } = await supabaseAdmin
      .from('subjects')
      .select('id')
      .eq('code', code)
      .eq('department_id', department_id)
      .eq('college_id', user.college_id)
      .maybeSingle();

    // Only throw error if we found a duplicate (not if there's a query error)
    if (existingSubject && !checkError) {
      return NextResponse.json(
        { error: 'Subject code already exists in this department' },
        { status: 409 }
      );
    }

    // Create the subject - Generate UUID explicitly
    const subjectId = randomUUID();
    
    const insertData = {
      id: subjectId,
      code,
      name,
      credits_per_week,
      semester: semester || 1,
      college_id: user.college_id,
      department_id,
      course_id: course_id && course_id.trim() !== '' ? course_id : null,
      subject_type: subject_type || 'THEORY',  // Delivery type enum: THEORY, LAB, PRACTICAL, TUTORIAL
      nep_category: nep_category || 'CORE',  // NEP classification enum: MAJOR, MINOR, CORE, etc.
      description: description || null,
      preferred_duration: 60,
      max_continuous_hours: 2,
      requires_lab: requires_lab || false,
      requires_projector: requires_projector || false,
      is_active: is_active !== false,
    };

    console.log('Insert data (matching actual DB schema):', JSON.stringify(insertData, null, 2));

    // Try to refresh Supabase schema cache
    try {
      await supabaseAdmin.rpc('refresh_schema_cache');
    } catch (e) {
      console.log('Schema cache refresh not available, continuing...');
    }

    const { data: newSubject, error: createError } = await supabaseAdmin
      .from('subjects')
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error('Subject creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create subject' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subject: newSubject,
      message: 'Subject created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create subject error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
