import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '@/shared/middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow college_admin, admin, and super_admin
    const allowedRoles = ['college_admin', 'admin', 'super_admin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    // Get college_id from query params (for super_admin) or from user
    const { searchParams } = new URL(request.url);
    const queryCollegeId = searchParams.get('college_id');
    const collegeId = user.role === 'super_admin' ? queryCollegeId : user.college_id;

    if (!collegeId) {
      return NextResponse.json({ error: 'College ID is required' }, { status: 400 });
    }

    // Fetch buckets with related data using joins
    const { data: buckets, error } = await supabase
      .from('elective_buckets')
      .select(`
        *,
        batches:batch_id(id, name, semester, section, academic_year, department_id, departments:department_id(id, name)),
        bucket_subjects(subject_id, subjects:subject_id(*))
      `)
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching buckets:', error);
      throw error;
    }

    return NextResponse.json({ buckets: buckets || [] });
  } catch (error: any) {
    console.error('Error fetching admin buckets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow college_admin, admin
    const allowedRoles = ['college_admin', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { bucket_name, batch_id, min_selection, max_selection, is_common_slot, subject_ids } = body;

    if (!bucket_name || !batch_id) {
      return NextResponse.json({ error: 'Bucket name and batch are required' }, { status: 400 });
    }

    // Create the bucket
    const { data: bucket, error: bucketError } = await supabase
      .from('elective_buckets')
      .insert({
        bucket_name,
        batch_id,
        college_id: user.college_id,
        min_selection: min_selection || 1,
        max_selection: max_selection || 1,
        is_common_slot: is_common_slot !== false,
        is_published: false,
        is_live_for_creators: false,
        is_live_for_students: false,
        created_by: user.id
      })
      .select()
      .single();

    if (bucketError) {
      console.error('Error creating bucket:', bucketError);
      throw bucketError;
    }

    // Add subjects if provided
    if (subject_ids && subject_ids.length > 0) {
      const subjectLinks = subject_ids.map((subject_id: string) => ({
        bucket_id: bucket.id,
        subject_id
      }));

      const { error: subjectError } = await supabase
        .from('bucket_subjects')
        .insert(subjectLinks);

      if (subjectError) {
        console.error('Error adding bucket subjects:', subjectError);
      }
    }

    return NextResponse.json({ success: true, bucket });
  } catch (error: any) {
    console.error('Error creating bucket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
