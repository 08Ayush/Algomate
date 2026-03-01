import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
<<<<<<< HEAD
=======
import { requireRoles } from '@/lib/auth';
>>>>>>> origin/response-time

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
<<<<<<< HEAD
=======
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;

>>>>>>> origin/response-time
    const { id } = params;
    const body = await request.json();

    const {
      first_name,
      last_name,
      email,
      phone,
      college_id,
      college_uid,
      password,
      is_active
    } = body;

    const updates: any = {
      first_name,
      last_name,
      email,
      phone,
      college_id,
      college_uid,
      is_active,
      updated_at: new Date().toISOString()
    };

    // Only update password if a new one is provided
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(password, salt);
    }

    const { data: updatedAdmin, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating admin:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ admin: updatedAdmin });
  } catch (error) {
    console.error('SERVER ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
<<<<<<< HEAD
=======
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;

>>>>>>> origin/response-time
    const { id } = params;

    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting admin:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('SERVER ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
