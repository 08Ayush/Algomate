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
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    // Decode and verify the user token
    const userString = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userString);
    
    // Verify user exists and is active admin
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

// GET - Fetch subjects for authenticated user's college
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in as an admin.' },
        { status: 401 }
      );
    }

    // Fetch subjects only for user's college with department info
    const { data: subjects, error } = await supabaseAdmin
      .from('subjects')
      .select(`
        *,
        departments:department_id (
          id,
          name,
          code
        )
      `)
      .eq('college_id', user.college_id)
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
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in as an admin.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      code,
      name,
      credits_per_week,
      semester,
      department_id,
      subject_type,
      is_active
    } = body;

    // Validate required fields
    if (!code || !name || !credits_per_week || !semester || !department_id || !subject_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
      id: subjectId,  // Explicitly provide UUID
      code,
      name,
      credits_per_week,
      semester,
      college_id: user.college_id,
      department_id,
      subject_type,
      is_active: is_active !== false,
      // NEP 2020 fields
      nep_category: 'CORE',
      lecture_hours: 1,
      tutorial_hours: 0,
      practical_hours: subject_type === 'LAB' || subject_type === 'PRACTICAL' ? 2 : 0,
      // Scheduling fields
      preferred_duration: 60,
      max_continuous_hours: 2,
      requires_lab: subject_type === 'LAB',
      requires_projector: false,
      requires_special_room: false,
      is_intensive_subject: false,
      min_gap_hours: 0,
      algorithm_complexity: 5,
      is_core_subject: true
    };

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
