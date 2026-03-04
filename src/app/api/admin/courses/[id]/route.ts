import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

// PUT - Update existing course
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const { title, code, nature_of_course, intake, duration_years } = await request.json();

    if (!title || !code) {
      return NextResponse.json({ error: 'Title and code are required' }, { status: 400 });
    }

    const pool = getPool();

    // Verify the course belongs to the user's college
    const existing = await pool.query(
      `SELECT id FROM courses WHERE id = $1 AND college_id = $2`,
      [id, user.college_id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found or access denied' }, { status: 404 });
    }

    // Check for duplicate code (exclude self)
    const dup = await pool.query(
      `SELECT id FROM courses WHERE code = $1 AND college_id = $2 AND id != $3`,
      [code.toUpperCase(), user.college_id, id]
    );
    if (dup.rows.length > 0) {
      return NextResponse.json({ error: 'Course code already exists in your college' }, { status: 400 });
    }

    const result = await pool.query(`
      UPDATE courses
      SET title = $1, code = $2, nature_of_course = $3, intake = $4, duration_years = $5, updated_at = NOW()
      WHERE id = $6 AND college_id = $7
      RETURNING *
    `, [
      title, code.toUpperCase(), nature_of_course || null,
      intake ?? 60, duration_years ?? null,
      id, user.college_id
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Course updated successfully', course: result.rows[0] });

  } catch (error: any) {
    console.error('Course update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete course
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const pool = getPool();

    // Verify the course belongs to the user's college
    const existing = await pool.query(
      `SELECT id FROM courses WHERE id = $1 AND college_id = $2`,
      [id, user.college_id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found or access denied' }, { status: 404 });
    }

    // Check if course is being used by subjects
    const subjectCheck = await pool.query(
      `SELECT id FROM subjects WHERE course_id = $1 LIMIT 1`,
      [id]
    );
    if (subjectCheck.rows.length > 0) {
      return NextResponse.json({ error: 'Cannot delete course. It is being used by subjects.' }, { status: 400 });
    }

    await pool.query(`DELETE FROM courses WHERE id = $1 AND college_id = $2`, [id, user.college_id]);

    return NextResponse.json({ success: true, message: 'Course deleted successfully' });

  } catch (error: any) {
    console.error('Course deletion error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
