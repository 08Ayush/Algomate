import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Get college by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const { data: college, error } = await supabaseAdmin
      .from('colleges')
      .select(`
        *,
        departments:departments(count),
        users:users(count)
      `)
      .eq('id', id)
      .single();

    if (error || !college) {
      return NextResponse.json(
        { error: 'College not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ college });

  } catch (error: any) {
    console.error('College fetch API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update college
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();

    // Check if college exists
    const { data: existingCollege } = await supabaseAdmin
      .from('colleges')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingCollege) {
      return NextResponse.json(
        { error: 'College not found' },
        { status: 404 }
      );
    }

    // Check for duplicate code/name if they're being changed
    if (body.code || body.name) {
      const conditions = [];
      if (body.code) conditions.push(`code.eq.${body.code}`);
      if (body.name) conditions.push(`name.eq.${body.name}`);

      const { data: duplicate } = await supabaseAdmin
        .from('colleges')
        .select('id, code, name')
        .or(conditions.join(','))
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        if (duplicate.code === body.code) {
          return NextResponse.json(
            { error: 'College code already exists' },
            { status: 400 }
          );
        }
        if (duplicate.name === body.name) {
          return NextResponse.json(
            { error: 'College name already exists' },
            { status: 400 }
          );
        }
      }
    }

    // Update college
    const { data: updatedCollege, error } = await supabaseAdmin
      .from('colleges')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('College update error:', error);
      return NextResponse.json(
        { error: 'Failed to update college' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'College updated successfully',
      college: updatedCollege
    });

  } catch (error: any) {
    console.error('College update API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete college
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Check if college exists
    const { data: existingCollege } = await supabaseAdmin
      .from('colleges')
      .select('id, name')
      .eq('id', id)
      .single();

    if (!existingCollege) {
      return NextResponse.json(
        { error: 'College not found' },
        { status: 404 }
      );
    }

    // Check for dependencies (users, departments, etc.)
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('college_id', id)
      .limit(1);

    const { data: departments } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('college_id', id)
      .limit(1);

    if (users && users.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete college with existing users. Please remove all users first.' },
        { status: 400 }
      );
    }

    if (departments && departments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete college with existing departments. Please remove all departments first.' },
        { status: 400 }
      );
    }

    // Delete college
    const { error } = await supabaseAdmin
      .from('colleges')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('College deletion error:', error);
      return NextResponse.json(
        { error: `Failed to delete college: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'College deleted successfully'
    });

  } catch (error: any) {
    console.error('College deletion API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
