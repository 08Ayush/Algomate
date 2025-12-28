import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Individual Bucket Management API
 * GET - Get bucket with subjects
 * PUT - Update a bucket
 * DELETE - Delete a bucket
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch subjects linked to this bucket
    const { data: subjects, error } = await supabaseAdmin
      .from('subjects')
      .select('id')
      .eq('course_group_id', params.id);

    if (error) {
      console.error('Error fetching bucket subjects:', error);
      return NextResponse.json({ error: 'Failed to fetch bucket subjects' }, { status: 500 });
    }

    const subject_ids = subjects?.map(s => s.id) || [];

    return NextResponse.json({ subject_ids });

  } catch (error: any) {
    console.error('Error in bucket GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      bucket_name,
      min_selection,
      max_selection,
      is_common_slot,
      subject_ids
    } = body;

    const updateData: any = {};
    if (bucket_name !== undefined) updateData.bucket_name = bucket_name;
    if (min_selection !== undefined) updateData.min_selection = min_selection;
    if (max_selection !== undefined) updateData.max_selection = max_selection;
    if (is_common_slot !== undefined) updateData.is_common_slot = is_common_slot;
    updateData.updated_at = new Date().toISOString();

    const { data: bucket, error } = await supabaseAdmin
      .from('elective_buckets')
      .update(updateData)
      .eq('id', params.id)
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
        )
      `)
      .single();

    if (error) {
      console.error('Error updating bucket:', error);
      return NextResponse.json({ error: 'Failed to update bucket' }, { status: 500 });
    }

    // Update subject associations if provided
    if (subject_ids !== undefined) {
      // First, remove all existing associations
      await supabaseAdmin
        .from('subjects')
        .update({ course_group_id: null })
        .eq('course_group_id', params.id);

      // Then add new associations
      if (subject_ids.length > 0) {
        await supabaseAdmin
          .from('subjects')
          .update({ course_group_id: params.id })
          .in('id', subject_ids);
      }
    }

    return NextResponse.json({ bucket });

  } catch (error: any) {
    console.error('Error in bucket PUT:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, remove all subject associations
    await supabaseAdmin
      .from('subjects')
      .update({ course_group_id: null })
      .eq('course_group_id', params.id);

    // Delete the bucket
    const { error } = await supabaseAdmin
      .from('elective_buckets')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting bucket:', error);
      return NextResponse.json({ error: 'Failed to delete bucket' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Bucket deleted successfully' });

  } catch (error: any) {
    console.error('Error in bucket DELETE:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
