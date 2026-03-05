import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { randomUUID } from 'crypto';

type Params = { params: Promise<{ id: string }> };

// ──────────────────────────────────────────────────────────────
// GET  /api/timetables/[id]/classes
// Returns timetable + all enriched classes + metadata needed
// by the edit page (time slots, batch subjects, faculty, rooms)
// ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { id: timetableId } = await params;
    const pool = getPool();

    // 1. Fetch timetable
    const ttResult = await pool.query(
      `SELECT gt.*, b.name AS batch_name, b.department_id, b.semester
       FROM generated_timetables gt
       LEFT JOIN batches b ON b.id = gt.batch_id
       WHERE gt.id = $1 AND gt.college_id = $2`,
      [timetableId, user.college_id]
    );
    if (ttResult.rows.length === 0) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }
    const timetable = ttResult.rows[0];

    // 2. Fetch scheduled classes with enriched data
    const classesResult = await pool.query(
      `SELECT sc.*,
         s.name  AS subject_name, s.code AS subject_code, s.subject_type AS subject_category,
         s.credit_value, s.credits_per_week,
         u.first_name || ' ' || u.last_name AS faculty_name,
         cr.name AS classroom_name, cr.building, cr.floor_number,
         ts.day, ts.start_time, ts.end_time
       FROM scheduled_classes sc
       LEFT JOIN subjects       s  ON s.id  = sc.subject_id
       LEFT JOIN users          u  ON u.id  = sc.faculty_id
       LEFT JOIN classrooms     cr ON cr.id = sc.classroom_id
       LEFT JOIN time_slots     ts ON ts.id = sc.time_slot_id
       WHERE sc.timetable_id = $1
       ORDER BY ts.day, ts.start_time`,
      [timetableId]
    );

    // 3. Fetch all active time slots for this college
    const tsResult = await pool.query(
      `SELECT id, day, start_time, end_time, slot_number, is_break_time, is_lunch_time
       FROM time_slots
       WHERE college_id = $1 AND is_active = true
         AND (is_break_time = false OR is_break_time IS NULL)
         AND (is_lunch_time = false OR is_lunch_time IS NULL)
       ORDER BY slot_number, start_time, day`,
      [user.college_id]
    );

    // 4. Fetch batch subjects (subjects mapped to this batch)
    const subjectsResult = await pool.query(
      `SELECT DISTINCT s.id, s.name, s.code, s.subject_type, s.credits_per_week, s.credit_value, s.semester
       FROM subjects s
       JOIN batch_subjects bs ON bs.subject_id = s.id
       WHERE bs.batch_id = $1 AND s.is_active = true
       ORDER BY s.semester, s.name`,
      [timetable.batch_id]
    );

    // 5. Fetch faculty for this college
    const facultyResult = await pool.query(
      `SELECT id, first_name || ' ' || last_name AS name, department_id
       FROM users
       WHERE college_id = $1 AND role = 'faculty' AND is_active = true
       ORDER BY first_name, last_name`,
      [user.college_id]
    );

    // 6. Fetch classrooms for this college
    const roomsResult = await pool.query(
      `SELECT id, name, building, floor_number, capacity, type, is_lab
       FROM classrooms
       WHERE college_id = $1 AND is_available = true
       ORDER BY name`,
      [user.college_id]
    );

    return NextResponse.json({
      success: true,
      timetable,
      classes: classesResult.rows,
      timeSlots: tsResult.rows,
      subjects: subjectsResult.rows,
      faculty: facultyResult.rows,
      classrooms: roomsResult.rows,
    });
  } catch (err: any) {
    console.error('GET timetable classes error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/timetables/[id]/classes
// Add a single scheduled class to a draft timetable.
// Body: { time_slot_id, subject_id?, faculty_id, classroom_id?,
//         class_type?, custom_subject_name?, custom_subject_code? }
// ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { id: timetableId } = await params;
    const pool = getPool();

    // Verify timetable belongs to college and is in draft
    const ttCheck = await pool.query(
      `SELECT id, status, batch_id FROM generated_timetables
       WHERE id = $1 AND college_id = $2`,
      [timetableId, user.college_id]
    );
    if (ttCheck.rows.length === 0)
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    if (ttCheck.rows[0].status !== 'draft')
      return NextResponse.json({ error: 'Only draft timetables can be edited' }, { status: 409 });

    const body = await request.json();
    const {
      time_slot_id,
      faculty_id,
      classroom_id,
      class_type = 'THEORY',
      custom_subject_name,
      custom_subject_code,
    } = body;
    let { subject_id } = body;

    if (!time_slot_id || !faculty_id)
      return NextResponse.json({ error: 'time_slot_id and faculty_id are required' }, { status: 400 });

    // If custom extra-curricular subject requested, find or create it
    if (!subject_id && custom_subject_name) {
      const cleanName = custom_subject_name.trim();
      const cleanCode = (custom_subject_code || cleanName.slice(0, 8).toUpperCase().replace(/\s+/g, '_'));

      const existing = await pool.query(
        `SELECT id FROM subjects WHERE college_id = $1 AND LOWER(name) = LOWER($2) AND credits_per_week = 0`,
        [user.college_id, cleanName]
      );
      if (existing.rows.length > 0) {
        subject_id = existing.rows[0].id;
      } else {
        const newSubj = await pool.query(
          `INSERT INTO subjects (id, college_id, code, name, credits_per_week,
             subject_type, is_elective, is_active, created_at, updated_at)
           VALUES ($1,$2,$3,$4,1,'THEORY',true,true,NOW(),NOW()) RETURNING id`,
          [randomUUID(), user.college_id, cleanCode, cleanName]
        );
        subject_id = newSubj.rows[0].id;
      }
    }

    if (!subject_id)
      return NextResponse.json({ error: 'subject_id or custom_subject_name is required' }, { status: 400 });

    // Conflict check: same time slot + same classroom (if classroom provided)
    if (classroom_id) {
      const roomConflict = await pool.query(
        `SELECT sc.id FROM scheduled_classes sc
         JOIN generated_timetables gt ON gt.id = sc.timetable_id
         WHERE sc.time_slot_id = $1 AND sc.classroom_id = $2
           AND gt.college_id = $3 AND gt.status IN ('draft','pending_approval','published')
           AND sc.timetable_id != $4`,
        [time_slot_id, classroom_id, user.college_id, timetableId]
      );
      if (roomConflict.rows.length > 0)
        return NextResponse.json({ error: 'Classroom is already occupied in this time slot' }, { status: 409 });

      // Also check within same timetable
      const sameConflict = await pool.query(
        `SELECT id FROM scheduled_classes
         WHERE timetable_id = $1 AND time_slot_id = $2 AND classroom_id = $3`,
        [timetableId, time_slot_id, classroom_id]
      );
      if (sameConflict.rows.length > 0)
        return NextResponse.json({ error: 'Classroom already assigned in this slot in this timetable' }, { status: 409 });
    }

    // Conflict check: same timetable + same time slot + same subject (avoid duplicating)
    const dupCheck = await pool.query(
      `SELECT id FROM scheduled_classes
       WHERE timetable_id = $1 AND time_slot_id = $2 AND subject_id = $3`,
      [timetableId, time_slot_id, subject_id]
    );
    if (dupCheck.rows.length > 0)
      return NextResponse.json({ error: 'This subject is already scheduled in this time slot' }, { status: 409 });

    const newId = randomUUID();
    const batchId = ttCheck.rows[0].batch_id;
    await pool.query(
      `INSERT INTO scheduled_classes
         (id, timetable_id, batch_id, subject_id, faculty_id, classroom_id, time_slot_id,
          class_type, is_lab, is_continuation, session_duration, session_number, credit_hour_number, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false,60,1,1,$10,NOW())`,
      [
        newId,
        timetableId,
        batchId,
        subject_id,
        faculty_id,
        classroom_id || null,
        time_slot_id,
        class_type,
        class_type === 'LAB',
        custom_subject_name ? `Extra-curricular: ${custom_subject_name}` : null,
      ]
    );

    // Return enriched class
    const created = await pool.query(
      `SELECT sc.*,
         s.name AS subject_name, s.code AS subject_code,
         u.first_name || ' ' || u.last_name AS faculty_name,
         cr.name AS classroom_name,
         ts.day, ts.start_time, ts.end_time
       FROM scheduled_classes sc
       LEFT JOIN subjects   s  ON s.id  = sc.subject_id
       LEFT JOIN users      u  ON u.id  = sc.faculty_id
       LEFT JOIN classrooms cr ON cr.id = sc.classroom_id
       LEFT JOIN time_slots ts ON ts.id = sc.time_slot_id
       WHERE sc.id = $1`,
      [newId]
    );

    return NextResponse.json({ success: true, class: created.rows[0] });
  } catch (err: any) {
    console.error('POST timetable classes error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────
// DELETE /api/timetables/[id]/classes?class_id=xxx
// Remove a single scheduled class from a draft timetable
// ──────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { id: timetableId } = await params;
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');

    if (!classId)
      return NextResponse.json({ error: 'class_id is required' }, { status: 400 });

    const pool = getPool();

    // Verify ownership
    const check = await pool.query(
      `SELECT sc.id FROM scheduled_classes sc
       JOIN generated_timetables gt ON gt.id = sc.timetable_id
       WHERE sc.id = $1 AND sc.timetable_id = $2 AND gt.college_id = $3`,
      [classId, timetableId, user.college_id]
    );
    if (check.rows.length === 0)
      return NextResponse.json({ error: 'Class not found or access denied' }, { status: 404 });

    await pool.query('DELETE FROM scheduled_classes WHERE id = $1', [classId]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE timetable class error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
