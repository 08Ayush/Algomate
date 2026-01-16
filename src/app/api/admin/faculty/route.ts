import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

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

// GET - Fetch faculty for authenticated user's college (and department if creator)
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

    console.log('🔍 Faculty API - User authenticated:', {
      id: user.id,
      role: user.role,
      department_id: user.department_id,
      college_id: user.college_id
    });

    // Get college_id from query parameter (for super_admin) or use user's college_id
    const { searchParams } = new URL(request.url);
    const queryCollegeId = searchParams.get('college_id');
    
    let targetCollegeId = user.college_id;
    
    // Super admin can view any college's faculty
    if (user.role === 'super_admin' && queryCollegeId) {
      targetCollegeId = queryCollegeId;
    }

    // Build query based on user role
    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        college_uid,
        phone,
        role,
        faculty_type,
        department_id,
        college_id,
        is_active,
        departments!users_department_id_fkey(id, name, code)
      `)
      .eq('college_id', targetCollegeId)
      .in('role', ['admin', 'faculty']);

    // Filter by department for non-admin users (not super_admin or admin)
    if (!['super_admin', 'admin', 'college_admin'].includes(user.role) && user.department_id) {
      console.log('🔒 Filtering faculty by department_id:', user.department_id);
      query = query.eq('department_id', user.department_id);
    } else {
      console.log('👤 User role:', user.role, '- No department filtering applied');
    }

    const { data: faculty, error } = await query.order('first_name');
    
    console.log(`📊 Fetched ${faculty?.length || 0} faculty members for user role: ${user.role}, dept: ${user.department_id}`);

    if (error) {
      console.error('Faculty fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch faculty' },
        { status: 500 }
      );
    }

    // Map faculty_type back to role for display (reverse the mapping from POST/PUT)
    const mappedFaculty = faculty?.map(f => {
      // If role is 'faculty' and faculty_type is 'creator' or 'publisher', show that as the role
      if (f.role === 'faculty' && (f.faculty_type === 'creator' || f.faculty_type === 'publisher')) {
        return { ...f, role: f.faculty_type };
      }
      return f;
    });

    return NextResponse.json({
      faculty: mappedFaculty || []
    });

  } catch (error: any) {
    console.error('Faculty API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new faculty
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user - require admin role for creating faculty
    const user = await getAuthenticatedUser(request, true);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can create faculty members.' },
        { status: 403 }
      );
    }

    const { 
      first_name, 
      last_name, 
      email, 
      phone, 
      role, 
      faculty_type, 
      department_id, 
      is_active 
    } = await request.json();

    // Map creator/publisher role to faculty role with appropriate faculty_type
    let actualRole = role;
    let actualFacultyType = faculty_type || 'general';
    
    if (role === 'creator' || role === 'publisher') {
      actualRole = 'faculty';
      actualFacultyType = role;
    }

    // Validate required fields
    if (!first_name || !last_name || !email || !department_id) {
      return NextResponse.json(
        { error: 'First name, last name, email, and department are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Check if department exists and belongs to user's college
    const { data: department } = await supabaseAdmin
      .from('departments')
      .select('id, code, college_id')
      .eq('id', department_id)
      .eq('college_id', user.college_id)
      .single();

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found in your college' },
        { status: 400 }
      );
    }

    // Generate college UID
    const rolePrefix = actualRole === 'admin' ? 'ADM' : 'FAC';
    const randomSuffix = Math.floor(Math.random() * 900000) + 100000;
    const college_uid = `${rolePrefix}${randomSuffix}`;

    // Generate default password (user should change on first login)
    const defaultPassword = 'faculty123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    // Create faculty user
    const { data: newFaculty, error } = await supabaseAdmin
      .from('users')
      .insert({
        first_name,
        last_name,
        email,
        phone: phone || null,
        college_uid,
        password_hash: passwordHash,
        role: actualRole,
        faculty_type: actualFacultyType,
        department_id,
        college_id: user.college_id,  // Use authenticated user's college_id
        is_active: is_active !== undefined ? is_active : true,
        email_verified: false
      })
      .select(`
        id,
        first_name,
        last_name,
        email,
        college_uid,
        phone,
        role,
        faculty_type,
        department_id,
        college_id,
        is_active,
        departments!users_department_id_fkey(id, name, code)
      `)
      .single();

    if (error) {
      console.error('Faculty creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create faculty' },
        { status: 500 }
      );
    }

    // Map faculty_type back to role for display (reverse the mapping)
    const displayFaculty = {
      ...newFaculty,
      role: (newFaculty.role === 'faculty' && 
             (newFaculty.faculty_type === 'creator' || newFaculty.faculty_type === 'publisher'))
        ? newFaculty.faculty_type
        : newFaculty.role
    };

    return NextResponse.json({
      message: 'Faculty created successfully',
      faculty: displayFaculty,
      defaultPassword: defaultPassword // Include in response for admin reference
    }, { status: 201 });

  } catch (error: any) {
    console.error('Faculty creation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}