import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/shared/database/client';

/**
 * Make Bucket Live for Students API
 * POST - Make bucket visible to students for subject selection
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

    const body = await request.json();
    const { is_live, admin_id } = body;

    // Validate admin_id
    if (!admin_id) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
    }

    // First, check if bucket has subjects added (using bucket_subjects table for new workflow)
    const { data: bucketSubjects, error: checkError } = await supabaseAdmin
      .from('bucket_subjects')
      .select('id')
      .eq('bucket_id', id);

    if (checkError) {
      console.error('Error checking bucket subjects:', checkError);
      return NextResponse.json({ error: 'Failed to check bucket subjects' }, { status: 500 });
    }

    // Also check old subjects table for backwards compatibility
    const { data: oldSubjects, error: oldError } = await supabaseAdmin
      .from('subjects')
      .select('id')
      .eq('course_group_id', id);

    const hasSubjects = (bucketSubjects && bucketSubjects.length > 0) || (oldSubjects && oldSubjects.length > 0);

    // Validate that bucket has subjects before making it live for students
    if (is_live && !hasSubjects) {
      return NextResponse.json({
        error: 'Cannot make bucket live for students. No subjects have been added to this bucket yet. Please make it live for creators first so they can add subjects.'
      }, { status: 400 });
    }

    const updateData: any = {
      is_live_for_students: is_live,
      is_published: is_live, // Also set is_published when making live for students
      updated_at: new Date().toISOString()
    };

    if (is_live) {
      updateData.student_live_at = new Date().toISOString();
      updateData.student_live_by = admin_id;
      updateData.published_at = new Date().toISOString();
      updateData.published_by = admin_id;
    } else {
      // Making it not live for students
      updateData.student_live_at = null;
      updateData.student_live_by = null;
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
      console.error('Error updating bucket student status:', error);
      return NextResponse.json({ error: 'Failed to update bucket' }, { status: 500 });
    }

    const isPublished = is_live && !bucket.student_live_at; // Only notify if it wasn't live before? Or just always if is_live is true?
    // The update logic overwrites. If student_live_at was null, it's a new publish.
    // But we don't know if it was null before update.
    // However, usually this toggle is significant.

    if (is_live) {
      // Send Notification
      try {
        const batchId = (bucket.batches as any)?.id || bucket.batch_id;
        if (batchId) {
          const { notifyNEPBucketPublished } = await import('@/lib/notificationService');
          await notifyNEPBucketPublished({
            bucketId: bucket.id,
            bucketName: bucket.bucket_name,
            batchId: batchId,
            publisherId: admin_id,
            publisherName: 'College Admin' // Placeholder as we don't have name readily available
          });
        }
      } catch (nErr) {
        console.error('Notification error:', nErr);
      }
    }

    return NextResponse.json({
      bucket,
      message: is_live
        ? 'Bucket is now live for students to select subjects'
        : 'Bucket is no longer live for students'
    });

  } catch (error: any) {
    console.error('Error in bucket student publish:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
