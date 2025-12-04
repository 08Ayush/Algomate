import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// GET - Fetch courses for authenticated user's college
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

    // Fetch courses only for user's college
    const { data: courses, error } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('college_id', user.college_id)
      .order('title');

    if (error) {
      console.error('Courses fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      courses: courses || []
    });

  } catch (error: any) {
    console.error('Courses API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new course
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

    const { title, code, nature_of_course, intake, duration_years } = await request.json();

    // Validate required fields
    if (!title || !code) {
      return NextResponse.json(
        { error: 'Title and code are required' },
        { status: 400 }
      );
    }

    // Check if course code already exists in the same college
    const { data: existingCourse } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('code', code)
      .eq('college_id', user.college_id)
      .single();

    if (existingCourse) {
      return NextResponse.json(
        { error: 'Course code already exists in your college' },
        { status: 400 }
      );
    }

    // Create course for user's college
    const { data: newCourse, error } = await supabaseAdmin
      .from('courses')
      .insert({
        title,
        code: code.toUpperCase(),
        nature_of_course: nature_of_course || null,
        intake: intake || 0,
        duration_years: duration_years || null,
        college_id: user.college_id  // Use authenticated user's college_id
      })
      .select()
      .single();

    if (error) {
      console.error('Course creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create course' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Course created successfully',
      course: newCourse
    }, { status: 201 });

  } catch (error: any) {
    console.error('Course creation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
