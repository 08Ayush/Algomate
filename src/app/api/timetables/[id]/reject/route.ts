import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { notifyTimetableRejected } from '@/lib/notificationService';

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
        { success: false, error: 'Only publishers can reject timetables.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { reason } = body;

    const pool = getPool();

    // Update status to rejected
    const { rows } = await pool.query(
      `UPDATE generated_timetables
       SET status = 'rejected', updated_at = NOW()
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
       VALUES (gen_random_uuid(), $1, 'rejected', $2, $3, 'creator')`,
      [id, user.id, reason || 'Rejected by publisher']
    ).catch(() => { /* workflow log is non-critical */ });

    // Notify creator
    if (timetable.created_by && timetable.created_by !== user.id) {
      const rejectorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'A reviewer';
      await notifyTimetableRejected({
        timetableId: id,
        timetableTitle: timetable.title || 'Untitled Timetable',
        batchId: timetable.batch_id,
        creatorId: timetable.created_by,
        rejectorId: user.id,
        rejectorName,
        reason
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Timetable rejected successfully.',
      timetable
    });
  } catch (error: any) {
    console.error('Error rejecting timetable:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
