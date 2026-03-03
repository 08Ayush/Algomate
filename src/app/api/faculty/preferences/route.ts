import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

// GET: Fetch saved scheduling preferences for the logged-in faculty
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM faculty_scheduling_preferences WHERE faculty_id = $1 LIMIT 1`,
      [user.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: true, settings: null });
    }

    const pref = rows[0];
    let timePreferences = null;
    if (pref.notes) {
      try { timePreferences = JSON.parse(pref.notes); } catch { /* ignore */ }
    }

    return NextResponse.json({
      success: true,
      settings: {
        max_hours_per_day: pref.max_hours_per_day,
        prefer_consecutive: pref.prefer_consecutive,
        time_preferences: timePreferences
      }
    });
  } catch (error: any) {
    console.error('Error in GET /api/faculty/preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Save / update scheduling preferences for the logged-in faculty
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { time_preferences, max_hours_per_day = 6, prefer_consecutive = false } = body;

    const pool = getPool();

    await pool.query(
      `
      INSERT INTO faculty_scheduling_preferences
        (faculty_id, max_hours_per_day, prefer_consecutive, notes, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (faculty_id)
      DO UPDATE SET
        max_hours_per_day = EXCLUDED.max_hours_per_day,
        prefer_consecutive = EXCLUDED.prefer_consecutive,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      `,
      [user.id, max_hours_per_day, prefer_consecutive, JSON.stringify(time_preferences)]
    );

    return NextResponse.json({ success: true, message: 'Preferences saved' });
  } catch (error: any) {
    console.error('Error in POST /api/faculty/preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
