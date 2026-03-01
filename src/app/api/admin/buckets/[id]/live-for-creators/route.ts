import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/shared/database/client';
import { requireAuth } from '@/lib/auth';

/**
 * Make Bucket Live for Creators API
 * POST - Make bucket visible to departmental creators for adding subjects
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const body = await request.json();
    const { is_live, admin_id } = body;

    // Validate admin_id
    if (!admin_id) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
    }
    // Use admin_id from body if provided, otherwise use authenticated user id
    const adminId = admin_id || user.id;

    const updateData: any = {
      is_live_for_creators: is_live,
      updated_at: new Date().toISOString()
    };

    if (is_live) {
      updateData.creator_live_at = new Date().toISOString();
      updateData.creator_live_by = admin_id;
    } else {
      // Making it not live for creators
      updateData.creator_live_at = null;
      updateData.creator_live_by = null;
    }

    const { data: bucket, error } = await supabaseAdmin
      .from('elective_buckets')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        batches:batches!elective_buckets_batch_id_fkey (
          id,
          name,
          semester,
          section,
          academic_year,
          course_id,
          department_id,
          departments:departments (id, name, code),
          courses:courses (id, title, code)
        ),
        subjects:subjects!subjects_course_group_id_fkey (id, code, name)
      `)
      .single();

    if (error) {
      console.error('Error updating bucket creator status:', error);
      return NextResponse.json({ error: 'Failed to update bucket' }, { status: 500 });
    }

    return NextResponse.json({
      bucket,
      message: is_live
        ? 'Bucket is now live for departmental creators to add subjects'
        : 'Bucket is no longer live for creators'
    });

  } catch (error: any) {
    console.error('Error in bucket creator publish:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
