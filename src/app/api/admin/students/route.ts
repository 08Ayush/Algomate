import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { createClient } from '@/shared/database/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db';
import { withCacheAside, invalidateCache } from '@/shared/cache/cache-helper';
import { redisCache } from '@/shared/cache/redis-cache';
import { requireAuth } from '@/lib/auth';

export const GET = asyncHandler(
  async (request: NextRequest): Promise<NextResponse<any>> => {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const queryCollegeId = searchParams.get('college_id');
    let targetCollegeId = user.college_id;

    if (user.role === 'super_admin' && queryCollegeId) {
      targetCollegeId = queryCollegeId;
    }

        const cacheKey = redisCache.buildKey(targetCollegeId ?? '', 'students', 'list');
    const forceRefresh = searchParams.get('refresh') === '1';
    if (forceRefresh) {
      await invalidateCache(cacheKey);
    }

    const pool = getPool();
    const students = await withCacheAside(
      { key: cacheKey, ttl: 1800 },
      async () => {
        // Fetch students with dept + course joins using raw SQL
        const usersResult = await pool.query(`
          SELECT
            u.id, u.first_name, u.last_name, u.email, u.college_uid, u.phone,
            u.student_id, u.course_id, u.department_id, u.current_semester,
            u.admission_year, u.is_active, u.created_at,
            CASE WHEN u.course_id IS NOT NULL
              THEN json_build_object('id', c.id, 'title', c.title, 'code', c.code)
              ELSE NULL END AS courses,
            CASE WHEN u.department_id IS NOT NULL
              THEN json_build_object('id', d.id, 'name', d.name, 'code', d.code)
              ELSE NULL END AS departments
          FROM users u
          LEFT JOIN courses c ON c.id = u.course_id
          LEFT JOIN departments d ON d.id = u.department_id
          WHERE u.college_id = $1 AND u.role = 'student'
          ORDER BY u.created_at DESC
        `, [targetCollegeId]);

        const data = usersResult.rows;
        if (!data || data.length === 0) return [];

        // Fetch active batch enrollments for all students in one query
        const studentIds = data.map((s: any) => s.id);
        const enrollResult = await pool.query(`
          SELECT
            sbe.student_id, sbe.batch_id,
            CASE WHEN b.id IS NOT NULL
              THEN json_build_object('id', b.id, 'name', b.name, 'semester', b.semester, 'section', b.section)
              ELSE NULL END AS batches
          FROM student_batch_enrollment sbe
          LEFT JOIN batches b ON b.id = sbe.batch_id
          WHERE sbe.student_id = ANY($1) AND sbe.is_active = true
        `, [studentIds]);

        // Build lookup: student_id → batch info
        const batchByStudent: Record<string, any> = {};
        for (const e of enrollResult.rows) {
          if (e.student_id && e.batches) {
            batchByStudent[e.student_id] = {
              ...e.batches,
              batch_id: e.batch_id
            };
          }
        }

        // Merge batch into each student
        return data.map((s: any) => ({
          ...s,
          batch_id: batchByStudent[s.id]?.batch_id || null,
          batch: batchByStudent[s.id] || null
        }));
      }
    );

    return NextResponse.json({ success: true, students });
  }
);

export const POST = asyncHandler(
  async (request: NextRequest): Promise<NextResponse<any>> => {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { first_name, last_name, email, student_id, phone, password, current_semester, admission_year, course_id, department_id, is_active } = body;

    if (!first_name || !last_name || !email || !course_id || !department_id || !password) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

        const { data: existingStudents } = await supabase
      .from('users')
      .select('college_uid')
      .eq('college_id', user.college_id)
      .eq('role', 'student')
      .order('college_uid', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (existingStudents && existingStudents.length > 0) {
      const match = existingStudents[0].college_uid.match(/\d+$/);
      if (match) nextNumber = parseInt(match[0]) + 1;
    }

    const college_uid = `STUDENT${admission_year || new Date().getFullYear()}${String(nextNumber).padStart(3, '0')}`;
    const password_hash = await bcrypt.hash(password, 10);

    const { data: newStudent, error } = await supabase
      .from('users')
      .insert({
        first_name,
        last_name,
        email,
        password_hash,
        college_uid,
        student_id: student_id || null,
        phone: phone || null,
        current_semester: current_semester || 1,
        admission_year: admission_year || new Date().getFullYear(),
        course_id: course_id || null,
        department_id: department_id || null,
        role: 'student',
        college_id: user.college_id,
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single();

    if (error) throw error;

    const cacheKey = redisCache.buildKey(user.college_id ?? '', 'students', 'list');
    await invalidateCache(cacheKey);

    return NextResponse.json({ success: true, student: newStudent }, { status: 201 });
  }
);
