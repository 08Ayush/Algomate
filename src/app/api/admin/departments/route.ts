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
async function getAuthenticatedUser(request: NextRequest, requireAdmin = false) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    // Decode and verify the user token (you can implement JWT verification here)
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

    // For write operations, only allow admin/college_admin/super_admin
    if (requireAdmin && !['admin', 'college_admin', 'super_admin'].includes(dbUser.role)) {
      return null;
    }

    // For read operations, allow admin, college_admin, super_admin, and faculty with creator/publisher types
    if (!requireAdmin) {
      const allowedRoles = ['admin', 'college_admin', 'super_admin'];
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

// GET - Fetch departments for authenticated user's college
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

    // Get college_id from query parameter (for super_admin) or use user's college_id
    const { searchParams } = new URL(request.url);
    const queryCollegeId = searchParams.get('college_id');
    
    let targetCollegeId = user.college_id;
    
    // Super admin can view any college's departments
    if (user.role === 'super_admin' && queryCollegeId) {
      targetCollegeId = queryCollegeId;
    }

    // Fetch departments only for target college
    const { data: departments, error } = await supabaseAdmin
      .from('departments')
      .select('*')
      .eq('college_id', targetCollegeId)
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
    // Get authenticated user - only admins can create departments
    const user = await getAuthenticatedUser(request, true);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can create departments.' },
        { status: 403 }
      );
    }

    const { name, code, description } = await request.json();

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code required' }, { status: 400 });
    }

    // Direct insert (unique constraint handles duplicates)
    const { data: newDept, error } = await supabaseAdmin
      .from('departments')
      .insert({
        name,
        code: code.toUpperCase(),
        description: description || null,
        college_id: user.college_id
      })
      .select('id, name, code, description, college_id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ department: newDept }, { status: 201 });

  } catch (error: any) {
    console.error('Department creation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}