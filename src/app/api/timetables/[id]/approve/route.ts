import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { notifyTimetableApproved, notifyTimetablePublished } from '@/lib/notificationService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    if (user.faculty_type !== 'publisher') {
      return NextResponse.json(
        { success: false, error: 'Only publishers can approve timetables.' },
        { status: 403 }
      );
    }

    let notifyStudents = true;
    try {
      const body = await request.json();
      notifyStudents = body.notifyStudents !== false;
    } catch { /* no body */ }

    const pool = getPool();

    // Update status to published
    const { rows } = await pool.query(
      `UPDATE generated_timetables
       SET status = 'published', published_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (!rows[0]) {
      return NextResponse.json({ success: false, error: 'Timetable not found' }, { status: 404 });
    }

    const timetable = rows[0];

    // Log workflow action
    await pool.query(
      `INSERT INTO workflow_approvals (id, timetable_id, workflow_step, performed_by, comments, approval_level)
       VALUES (gen_random_uuid(), $1, 'approved', $2, 'Approved and published by publisher', 'creator')`,
      [id, user.id]
    ).catch(() => { /* workflow log is non-critical */ });

    // Get batch for notification
    const { rows: batchRows } = await pool.query(
      `SELECT id, department_id FROM batches WHERE id = $1`, [timetable.batch_id]
    );
    const batch = batchRows[0];
    const approverName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'An approver';

    if (timetable.created_by && timetable.created_by !== user.id) {
      await notifyTimetableApproved({
        timetableId: id,
        timetableTitle: timetable.title || 'Untitled Timetable',
        batchId: timetable.batch_id,
        creatorId: timetable.created_by,
        approverId: user.id,
        approverName
      }).catch(console.error);
    }

    if (batch) {
      await notifyTimetablePublished({
        timetableId: id,
        timetableTitle: timetable.title || 'Untitled Timetable',
        batchId: timetable.batch_id,
        departmentId: batch.department_id,
        publisherId: user.id,
        publisherName: approverName,
        notifyStudents,
        notifyFaculty: true
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Timetable approved and published successfully!',
      timetable
    });
  } catch (error: any) {
    console.error('Error approving timetable:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
