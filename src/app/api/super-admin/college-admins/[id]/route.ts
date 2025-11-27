import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// GET - Get college admin by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const { data: admin, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        college_uid,
        phone,
        is_active,
        created_at,
        college:colleges!inner(
          id,
          name,
          code
        )
      `)
      .eq('id', id)
      .eq('role', 'college_admin')
      .single();

    if (error || !admin) {
      return NextResponse.json(
        { error: 'College admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ admin });

  } catch (error: any) {
    console.error('College admin fetch API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update college admin
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();

    // Check if admin exists
    const { data: existingAdmin } = await supabaseAdmin
      .from('users')
      .select('id, email, college_id, college_uid')
      .eq('id', id)
      .eq('role', 'college_admin')
      .single();

    if (!existingAdmin) {
      return NextResponse.json(
        { error: 'College admin not found' },
        { status: 404 }
      );
    }

    // Check for duplicate email if it's being changed
    if (body.email && body.email !== existingAdmin.email) {
      const { data: duplicate } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', body.email)
        .neq('id', id)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      phone: body.phone,
      college_uid: body.college_uid,
      is_active: body.is_active,
      updated_at: new Date().toISOString()
    };

    // Hash new password if provided
    if (body.password) {
      updateData.password_hash = await bcrypt.hash(body.password, 10);
    }

    // Update admin
    const { data: updatedAdmin, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('College admin update error:', error);
      return NextResponse.json(
        { error: 'Failed to update college admin' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'College admin updated successfully',
      admin: updatedAdmin
    });

  } catch (error: any) {
    console.error('College admin update API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete college admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Check if admin exists
    const { data: existingAdmin } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', id)
      .eq('role', 'college_admin')
      .single();

    if (!existingAdmin) {
      return NextResponse.json(
        { error: 'College admin not found' },
        { status: 404 }
      );
    }

    // Check if this is the only admin for the college
    const { data: adminCount } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'college_admin')
      .eq('is_active', true);

    if (adminCount && adminCount.length <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last active college admin' },
        { status: 400 }
      );
    }

    // Delete admin
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('College admin deletion error:', error);
      return NextResponse.json(
        { error: `Failed to delete college admin: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'College admin deleted successfully'
    });

  } catch (error: any) {
    console.error('College admin deletion API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
