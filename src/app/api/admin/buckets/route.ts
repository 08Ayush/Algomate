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

    // Extract user data from token
    let userCollegeId: string | null = null;
    let userRole: string | null = null;
    try {
      const token = authHeader.replace('Bearer ', '');
      const userData = JSON.parse(Buffer.from(token, 'base64').toString());
      userCollegeId = userData.college_id;
      userRole = userData.role;
    } catch (e) {
      console.error('Failed to parse auth token:', e);
    }

    const searchParams = request.nextUrl.searchParams;
    let collegeId = searchParams.get('college_id');
    const courseId = searchParams.get('course_id');
    const departmentId = searchParams.get('department_id');
    const semester = searchParams.get('semester');

    // Enforce college filtering for non-super-admin users
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      // Use user's college_id if not provided in query params
      if (!collegeId && userCollegeId) {
        collegeId = userCollegeId;
      }
      // If still no college_id, return empty
      if (!collegeId) {
        return NextResponse.json({ buckets: [] });
      }
    }

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
          course_id,
          department_id,
          college_id,
          departments:departments (id, name, code),
          courses:courses (id, title, code)
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
      } else {
        // No batches for this college means no buckets should be returned
        return NextResponse.json({ buckets: [] });
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
      filteredBuckets = filteredBuckets.filter(b => b.batches?.course_id === courseId);
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

    // Fetch batch info to get college_id, course, and semester
    const { data: batchInfo, error: batchError } = await supabaseAdmin
      .from('batches')
      .select(`
        id,
        college_id,
        semester,
        course_id,
        courses:courses (code, title)
      `)
      .eq('id', batch_id)
      .single();

    if (batchError || !batchInfo) {
      console.error('Error fetching batch info:', batchError);
      return NextResponse.json({ error: 'Invalid batch ID' }, { status: 400 });
    }

    // Get course code from the batch's course
    const courseCode = (batchInfo.courses as any)?.code || (batchInfo.courses as any)?.title || 'Unknown';

    // Create the bucket with all required fields
    const { data: bucket, error } = await supabaseAdmin
      .from('elective_buckets')
      .insert({
        batch_id,
        bucket_name,
        min_selection,
        max_selection,
        is_common_slot,
        // Always populate these fields to avoid NULL values
        college_id: batchInfo.college_id,
        course: courseCode,
        semester: batchInfo.semester,
      })
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
