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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch subject IDs from bucket_subjects junction table
    const { data: bucketSubjects, error } = await supabaseAdmin
      .from('bucket_subjects')
      .select('subject_id')
      .eq('bucket_id', id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching bucket subjects:', error);
      return NextResponse.json({ error: 'Failed to fetch bucket subjects' }, { status: 500 });
    }

    return NextResponse.json({ 
      subject_ids: bucketSubjects?.map(bs => bs.subject_id) || [] 
    });

  } catch (error: any) {
    console.error('Error in bucket GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Build update object efficiently
    const updateData: any = { updated_at: new Date().toISOString() };
    if (bucket_name !== undefined) updateData.bucket_name = bucket_name;
    if (min_selection !== undefined) updateData.min_selection = min_selection;
    if (max_selection !== undefined) updateData.max_selection = max_selection;
    if (is_common_slot !== undefined) updateData.is_common_slot = is_common_slot;

    // Parallel operations for better performance
    const operations = [
      supabaseAdmin
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
          bucket_subjects (
            subject_id,
            subjects (id, code, name)
          )
        `)
        .single()
    ];

    // Handle subject associations via bucket_subjects junction table
    if (subject_ids !== undefined) {
      // Delete existing bucket_subjects entries for this bucket
      operations.push(
        supabaseAdmin
          .from('bucket_subjects')
          .delete()
          .eq('bucket_id', id)
      );
      
      // Insert new bucket_subjects entries if there are subjects
      if (subject_ids.length > 0) {
        const bucketSubjectsData = subject_ids.map((subject_id: string) => ({
          bucket_id: id,
          subject_id: subject_id,
          is_active: true
        }));
        
        operations.push(
          supabaseAdmin
            .from('bucket_subjects')
            .insert(bucketSubjectsData)
        );
      }
    }

    const results = await Promise.all(operations);
    const bucket = results[0].data;
    const bucketError = results[0].error;

    if (bucketError) {
      console.error('Error updating bucket:', bucketError);
      return NextResponse.json({ error: 'Failed to update bucket' }, { status: 500 });
    }

    return NextResponse.json({ bucket });

  } catch (error: any) {
    console.error('Error in bucket PUT:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parallel deletion for better performance
    const [bucketSubjectsDelete, studentChoicesDelete] = await Promise.all([
      // Remove bucket_subjects entries
      supabaseAdmin
        .from('bucket_subjects')
        .delete()
        .eq('bucket_id', id),
      // Delete student choices
      supabaseAdmin
        .from('student_subject_choices')
        .delete()
        .eq('bucket_id', id)
    ]);

    // Now delete the bucket
    const { error } = await supabaseAdmin
      .from('elective_buckets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting bucket:', error);
      return NextResponse.json({ error: 'Failed to delete bucket' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Deleted successfully' });

  } catch (error: any) {
    console.error('Error in bucket DELETE:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
