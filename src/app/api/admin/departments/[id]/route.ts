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

// PUT - Update department
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in as an admin.' },
        { status: 401 }
      );
    }

    const id = params.id;
    const { name, code, description } = await request.json();

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Check if department exists and belongs to user's college
    const { data: existingDept } = await supabaseAdmin
      .from('departments')
      .select('id, college_id')
      .eq('id', id)
      .eq('college_id', user.college_id)
      .single();

    if (!existingDept) {
      return NextResponse.json(
        { error: 'Department not found in your college' },
        { status: 404 }
      );
    }

    // Check if code is taken by another department in the same college
    const { data: conflictDept } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('code', code)
      .eq('college_id', user.college_id)
      .neq('id', id)
      .single();

    if (conflictDept) {
      return NextResponse.json(
        { error: 'Department code already exists in your college' },
        { status: 400 }
      );
    }

    // Update department
    const { data: updatedDept, error } = await supabaseAdmin
      .from('departments')
      .update({
        name,
        code: code.toUpperCase(),
        description: description || null
      })
      .eq('id', id)
      .eq('college_id', user.college_id)
      .select()
      .single();

    if (error) {
      console.error('Department update error:', error);
      return NextResponse.json(
        { error: 'Failed to update department' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Department updated successfully',
      department: updatedDept
    });

  } catch (error: any) {
    console.error('Department update API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete department
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in as an admin.' },
        { status: 401 }
      );
    }

    const id = params.id;

    // Check if department exists and belongs to user's college
    const { data: existingDept } = await supabaseAdmin
      .from('departments')
      .select('id, name, college_id')
      .eq('id', id)
      .eq('college_id', user.college_id)
      .single();

    if (!existingDept) {
      return NextResponse.json(
        { error: 'Department not found in your college' },
        { status: 404 }
      );
    }

    // Check if department has users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('department_id', id)
      .eq('college_id', user.college_id)
      .limit(1);

    if (usersError) {
      console.error('Users check error:', usersError);
      return NextResponse.json(
        { error: 'Failed to check department dependencies' },
        { status: 500 }
      );
    }

    if (users && users.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete department with assigned users' },
        { status: 400 }
      );
    }

    // Delete department
    const { error } = await supabaseAdmin
      .from('departments')
      .delete()
      .eq('id', id)
      .eq('college_id', user.college_id);

    if (error) {
      console.error('Department deletion error:', error);
      return NextResponse.json(
        { error: 'Failed to delete department' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Department deleted successfully'
    });

  } catch (error: any) {
    console.error('Department deletion API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}