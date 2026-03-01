import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

    const allowedRoles = ['college_admin', 'admin', 'super_admin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { id } = await params;

    const { data: bucket, error } = await supabase
      .from('elective_buckets')
      .select(`
        *,
        batches:batch_id(id, name, semester, section, academic_year, department_id),
        bucket_subjects(subject_id, subjects:subject_id(*))
      `)
      .eq('id', id)
      .single();

    if (error || !bucket) {
      return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
    }

    return NextResponse.json(bucket);
  } catch (error: any) {
    console.error('Error fetching bucket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

    const allowedRoles = ['college_admin', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { bucket_name, batch_id, min_selection, max_selection, is_common_slot, subject_ids } = body;

    // Update bucket
    const { data: bucket, error: updateError } = await supabase
      .from('elective_buckets')
      .update({
        bucket_name,
        batch_id,
        min_selection,
        max_selection,
        is_common_slot,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating bucket:', updateError);
      throw updateError;
    }

    // Update subjects if provided
    if (subject_ids !== undefined) {
      // Delete existing bucket_subjects
      await supabase
        .from('bucket_subjects')
        .delete()
        .eq('bucket_id', id);

      // Insert new ones
      if (subject_ids.length > 0) {
        const subjectLinks = subject_ids.map((subject_id: string) => ({
          bucket_id: id,
          subject_id
        }));

        await supabase
          .from('bucket_subjects')
          .insert(subjectLinks);
      }
    }

    return NextResponse.json({ success: true, bucket });
  } catch (error: any) {
    console.error('Error updating bucket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

    const allowedRoles = ['college_admin', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { id } = await params;

    // Delete bucket_subjects first
    await supabase
      .from('bucket_subjects')
      .delete()
      .eq('bucket_id', id);

    // Delete the bucket
    const { error } = await supabase
      .from('elective_buckets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting bucket:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting bucket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
