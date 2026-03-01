import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;

    const { id } = params;

    const { data: college, error } = await supabaseAdmin
      .from('colleges')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching college:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!college) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    return NextResponse.json({ college });
  } catch (error) {
    console.error('SERVER ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;

    const { id } = params;
    const body = await request.json();

    const {
      name,
      code,
      email,
      phone,
      address,
      city,
      state,
      country,
      pincode,
      website,
      academic_year,
      semester_system,
      is_active
    } = body;

    const { data: updatedCollege, error } = await supabaseAdmin
      .from('colleges')
      .update({
        name,
        code,
        email,
        phone,
        address,
        city,
        state,
        country,
        pincode,
        website,
        academic_year,
        semester_system,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating college:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ college: updatedCollege });
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
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;

    const { id } = params;

    const { error } = await supabaseAdmin
      .from('colleges')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting college:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'College deleted successfully' });
  } catch (error) {
    console.error('SERVER ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
