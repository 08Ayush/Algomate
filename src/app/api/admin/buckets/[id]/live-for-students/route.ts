import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

/**
 * Make Bucket Live for Students API
 * POST - Make bucket visible to students for subject selection
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const body = await request.json();
    const { is_live, admin_id } = body;

    const pool = getPool();

    if (is_live) {
      // Check if bucket has any subjects (bucket_subjects or legacy subjects table)
      const subjectCount = await pool.query(
        `SELECT (
          SELECT COUNT(*) FROM bucket_subjects WHERE bucket_id = $1
        ) + (
          SELECT COUNT(*) FROM subjects WHERE course_group_id = $1
        ) AS total`,
        [id]
      );
      const total = parseInt(subjectCount.rows[0]?.total ?? '0');
      if (total === 0) {
        return NextResponse.json({
          error: 'Cannot make bucket live for students. No subjects have been added to this bucket yet. Please make it live for creators first so they can add subjects.'
        }, { status: 400 });
      }

      await pool.query(
        `UPDATE elective_buckets
         SET is_live_for_students = true, is_published = true,
             student_live_at = NOW(), student_live_by = $1,
             published_at = NOW(), published_by = $1, updated_at = NOW()
         WHERE id = $2`,
        [admin_id || user.id, id]
      );
    } else {
      await pool.query(
        `UPDATE elective_buckets
         SET is_live_for_students = false, student_live_at = NULL, student_live_by = NULL, updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
    }

    // Re-fetch with joins
    const result = await pool.query(`
      SELECT eb.*,
        json_build_object('id', b.id, 'name', b.name, 'semester', b.semester, 'section', b.section,
          'academic_year', b.academic_year, 'department_id', b.department_id, 'course_id', b.course_id,
          'departments', json_build_object('id', d.id, 'name', d.name, 'code', d.code),
          'courses', json_build_object('id', c.id, 'title', c.title, 'code', c.code)) AS batches
      FROM elective_buckets eb
      LEFT JOIN batches b ON b.id = eb.batch_id
      LEFT JOIN departments d ON d.id = b.department_id
      LEFT JOIN courses c ON c.id = b.course_id
      WHERE eb.id = $1
    `, [id]);

    const bucket = result.rows[0] || null;

    if (is_live && bucket) {
      try {
        const batchId = bucket.batch_id;
        if (batchId) {
          const { notifyNEPBucketPublished } = await import('@/lib/notificationService');
          await notifyNEPBucketPublished({
            bucketId: bucket.id,
            bucketName: bucket.bucket_name,
            batchId,
            publisherId: admin_id || user.id,
            publisherName: 'College Admin'
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
