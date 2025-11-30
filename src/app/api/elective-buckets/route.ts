import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Elective Buckets Management API
 * 
 * GET /api/elective-buckets?batch_id=xxx - Fetch all buckets for a batch
 * POST /api/elective-buckets - Create a new bucket
 * PUT /api/elective-buckets - Update an existing bucket
 * DELETE /api/elective-buckets?id=xxx - Delete a bucket
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const batch_id = searchParams.get('batch_id');
    const bucket_id = searchParams.get('id');

    if (bucket_id) {
      // Fetch single bucket with subjects
      const { data: bucket, error } = await supabaseAdmin
        .from('elective_buckets')
        .select(`
          *,
          subjects:subjects!subjects_course_group_id_fkey (*)
        `)
        .eq('id', bucket_id)
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, bucket });
    }

    if (batch_id) {
      // Fetch all buckets for a batch with subjects
      const { data: buckets, error } = await supabaseAdmin
        .from('elective_buckets')
        .select(`
          *,
          subjects:subjects!subjects_course_group_id_fkey (*)
        `)
        .eq('batch_id', batch_id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return NextResponse.json({ success: true, buckets: buckets || [] });
    }

    return NextResponse.json(
      { success: false, error: 'batch_id or id parameter required' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error fetching elective buckets:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      batch_id,
      bucket_name,
      min_selection = 1,
      max_selection = 1,
      is_common_slot = true,
      subject_ids = []
    } = body;

    // Validate required fields
    if (!batch_id || !bucket_name) {
      return NextResponse.json(
        { success: false, error: 'batch_id and bucket_name are required' },
        { status: 400 }
      );
    }

    // Create the bucket
    const { data: bucket, error: bucketError } = await supabaseAdmin
      .from('elective_buckets')
      .insert({
        batch_id,
        bucket_name,
        min_selection,
        max_selection,
        is_common_slot
      })
      .select()
      .single();

    if (bucketError) throw bucketError;

    // Link subjects to this bucket
    if (subject_ids.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('subjects')
        .update({ course_group_id: bucket.id })
        .in('id', subject_ids);

      if (updateError) throw updateError;
    }

    // Fetch complete bucket with subjects
    const { data: completeBucket } = await supabaseAdmin
      .from('elective_buckets')
      .select(`
        *,
        subjects:subjects!subjects_course_group_id_fkey (*)
      `)
      .eq('id', bucket.id)
      .single();

    return NextResponse.json({
      success: true,
      bucket: completeBucket || bucket
    });

  } catch (error: any) {
    console.error('Error creating elective bucket:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      bucket_name,
      min_selection,
      max_selection,
      is_common_slot,
      subject_ids
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Bucket id is required' },
        { status: 400 }
      );
    }

    // Update bucket
    const updateData: any = {};
    if (bucket_name !== undefined) updateData.bucket_name = bucket_name;
    if (min_selection !== undefined) updateData.min_selection = min_selection;
    if (max_selection !== undefined) updateData.max_selection = max_selection;
    if (is_common_slot !== undefined) updateData.is_common_slot = is_common_slot;

    const { error: bucketError } = await supabaseAdmin
      .from('elective_buckets')
      .update(updateData)
      .eq('id', id);

    if (bucketError) throw bucketError;

    // Update subject associations if provided
    if (subject_ids) {
      // First, remove all subjects from this bucket
      await supabaseAdmin
        .from('subjects')
        .update({ course_group_id: null })
        .eq('course_group_id', id);

      // Then add the new subjects
      if (subject_ids.length > 0) {
        await supabaseAdmin
          .from('subjects')
          .update({ course_group_id: id })
          .in('id', subject_ids);
      }
    }

    // Fetch updated bucket
    const { data: updatedBucket } = await supabaseAdmin
      .from('elective_buckets')
      .select(`
        *,
        subjects:subjects!subjects_course_group_id_fkey (*)
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({
      success: true,
      bucket: updatedBucket
    });

  } catch (error: any) {
    console.error('Error updating elective bucket:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Bucket id is required' },
        { status: 400 }
      );
    }

    // Remove bucket association from subjects first
    await supabaseAdmin
      .from('subjects')
      .update({ course_group_id: null })
      .eq('course_group_id', id);

    // Delete the bucket
    const { error } = await supabaseAdmin
      .from('elective_buckets')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Bucket deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting elective bucket:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
