import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

// POST - Add subjects to bucket
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const params = await context.params;
    const body = await request.json();
    const { subjectIds } = body;

    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      return NextResponse.json({ error: 'subjectIds must be a non-empty array' }, { status: 400 });
    }

    const pool = getPool();

    // Insert each subject into bucket_subjects, ignore duplicates
    for (const subjectId of subjectIds) {
      await pool.query(
        `INSERT INTO bucket_subjects (bucket_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [params.id, subjectId]
      );
    }

    // Get bucket name for notification
    try {
      if (user.id && user.college_id) {
        const bucketRow = await pool.query(`SELECT bucket_name FROM elective_buckets WHERE id = $1`, [params.id]);
        const bucketName = bucketRow.rows[0]?.bucket_name || 'Elective Bucket';
        const { notifySubjectsAddedToBucket } = await import('@/lib/notificationService');
        await notifySubjectsAddedToBucket({
          bucketId: params.id,
          bucketName,
          subjectCount: subjectIds.length,
          facultyId: user.id,
          facultyName: `${user.first_name || 'Faculty'} ${user.last_name || ''}`.trim(),
          collegeId: user.college_id
        });
      }
    } catch (subErr) {
      console.error('Subject Notification Error:', subErr);
    }

    return NextResponse.json({ success: true, message: 'Subjects added to bucket successfully' });

  } catch (error: any) {
    console.error('Error adding subjects:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove subject from bucket
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const params = await context.params;
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');

    if (!subjectId) {
      return NextResponse.json({ error: 'subjectId query parameter is required' }, { status: 400 });
    }

    await getPool().query(
      `DELETE FROM bucket_subjects WHERE bucket_id = $1 AND subject_id = $2`,
      [params.id, subjectId]
    );

    return NextResponse.json({ success: true, message: 'Subject removed from bucket successfully' });

  } catch (error: any) {
    console.error('Error removing subject:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update/Replace all subjects in bucket
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const params = await context.params;
    const body = await request.json();
    const { subject_ids } = body;

    if (!Array.isArray(subject_ids)) {
      return NextResponse.json({ error: 'subject_ids must be an array' }, { status: 400 });
    }

    const pool = getPool();
    await pool.query(`DELETE FROM bucket_subjects WHERE bucket_id = $1`, [params.id]);

    if (subject_ids.length > 0) {
      for (const subjectId of subject_ids) {
        await pool.query(
          `INSERT INTO bucket_subjects (bucket_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [params.id, subjectId]
        );
      }
    }

    return NextResponse.json({ success: true, message: 'Subjects linked to bucket successfully' });

  } catch (error: any) {
    console.error('Error linking subjects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
