import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Admin Bucket Management API
 * GET - Fetch all buckets with filters
 * POST - Create a new bucket
 */
export async function GET(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const collegeId = searchParams.get('college_id');
    const courseId = searchParams.get('course_id');
    const departmentId = searchParams.get('department_id');
    const semester = searchParams.get('semester');

    let query = supabaseAdmin
      .from('elective_buckets')
      .select(`
        *,
        batches:batches!elective_buckets_batch_id_fkey (
          id,
          name,
          semester,
          section,
          academic_year,
          course,
          department_id,
          college_id,
          departments:departments (id, name, code)
        ),
        subjects:subjects!subjects_course_group_id_fkey (id)
      `)
      .order('created_at', { ascending: false });

    // Apply filters through batch relationship
    if (collegeId) {
      const { data: batches } = await supabaseAdmin
        .from('batches')
        .select('id')
        .eq('college_id', collegeId);
      
      if (batches && batches.length > 0) {
        const batchIds = batches.map(b => b.id);
        query = query.in('batch_id', batchIds);
      }
    }

    const { data: buckets, error } = await query;

    if (error) {
      console.error('Error fetching buckets:', error);
      return NextResponse.json({ error: 'Failed to fetch buckets' }, { status: 500 });
    }

    // Post-filter by course, department, and semester
    let filteredBuckets = buckets || [];

    if (courseId) {
      filteredBuckets = filteredBuckets.filter(b => b.batches?.course === courseId);
    }

    if (departmentId) {
      filteredBuckets = filteredBuckets.filter(b => b.batches?.department_id === departmentId);
    }

    if (semester) {
      filteredBuckets = filteredBuckets.filter(b => b.batches?.semester === parseInt(semester));
    }

    return NextResponse.json({ buckets: filteredBuckets });

  } catch (error: any) {
    console.error('Error in buckets GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        { error: 'Batch and bucket name are required' },
        { status: 400 }
      );
    }

    // Create the bucket
    const { data: bucket, error } = await supabaseAdmin
      .from('elective_buckets')
      .insert({
        batch_id,
        bucket_name,
        min_selection,
        max_selection,
        is_common_slot
      })
      .select(`
        *,
        batches:batches!elective_buckets_batch_id_fkey (
          id,
          name,
          semester,
          section,
          academic_year,
          course,
          department_id,
          departments:departments (id, name, code)
        )
      `)
      .single();

    if (error) {
      console.error('Error creating bucket:', error);
      return NextResponse.json({ error: 'Failed to create bucket' }, { status: 500 });
    }

    // Link subjects to this bucket if provided
    if (subject_ids && subject_ids.length > 0) {
      const { error: subjectError } = await supabaseAdmin
        .from('subjects')
        .update({ course_group_id: bucket.id })
        .in('id', subject_ids);

      if (subjectError) {
        console.error('Error linking subjects to bucket:', subjectError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ bucket });

  } catch (error: any) {
    console.error('Error in buckets POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
