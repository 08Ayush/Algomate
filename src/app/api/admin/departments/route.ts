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
    // Decode and verify the user token (you can implement JWT verification here)
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

// GET - Fetch departments for authenticated user's college
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

    // Fetch departments only for user's college
    const { data: departments, error } = await supabaseAdmin
      .from('departments')
      .select('*')
      .eq('college_id', user.college_id)
      .order('name');

    if (error) {
      console.error('Departments fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch departments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      departments: departments || []
    });

  } catch (error: any) {
    console.error('Departments API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new department
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

    const { name, code, description } = await request.json();

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Check if department code already exists in the same college
    const { data: existingDept } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('code', code)
      .eq('college_id', user.college_id)
      .single();

    if (existingDept) {
      return NextResponse.json(
        { error: 'Department code already exists in your college' },
        { status: 400 }
      );
    }

    // Create department for user's college
    const { data: newDept, error } = await supabaseAdmin
      .from('departments')
      .insert({
        name,
        code: code.toUpperCase(),
        description: description || null,
        college_id: user.college_id  // Use authenticated user's college_id
      })
      .select()
      .single();

    if (error) {
      console.error('Department creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create department' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Department created successfully',
      department: newDept
    }, { status: 201 });

  } catch (error: any) {
    console.error('Department creation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}