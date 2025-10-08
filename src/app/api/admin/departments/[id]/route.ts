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

// PUT - Update department
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { name, code, description } = await request.json();

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Check if department exists
    const { data: existingDept } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingDept) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Check if code is taken by another department
    const { data: conflictDept } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('code', code)
      .neq('id', id)
      .single();

    if (conflictDept) {
      return NextResponse.json(
        { error: 'Department code already exists' },
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
    const id = params.id;

    // Check if department exists
    const { data: existingDept } = await supabaseAdmin
      .from('departments')
      .select('id, name')
      .eq('id', id)
      .single();

    if (!existingDept) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Check if department has users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('department_id', id)
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
      .eq('id', id);

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