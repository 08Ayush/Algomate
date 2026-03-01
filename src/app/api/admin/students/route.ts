import { NextRequest, NextResponse } from 'next/server';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { createClient } from '@/shared/database/server';
import bcrypt from 'bcryptjs';
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

    const supabase = createClient();
    const cacheKey = redisCache.buildKey(targetCollegeId ?? '', 'students', 'list');
    const forceRefresh = searchParams.get('refresh') === '1';
    if (forceRefresh) {
      await invalidateCache(cacheKey);
    }

    const students = await withCacheAside(
      { key: cacheKey, ttl: 1800 },
      async () => {
        // Step 1: Fetch students with dept + course joins
        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            email,
            college_uid,
            phone,
            student_id,
            course_id,
            department_id,
            current_semester,
            admission_year,
            is_active,
            created_at,
            courses (id, title, code),
            departments (id, name, code)
          `)
          .eq('college_id', targetCollegeId)
          .eq('role', 'student')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) return [];

        // Step 2: Fetch active batch enrollments for all students in one query
        const studentIds = data.map((s: any) => s.id);
        const { data: enrollments } = await supabase
          .from('student_batch_enrollment' as any)
          .select('student_id, batch_id, is_active, batches(id, name, semester, section)')
          .in('student_id', studentIds)
          .eq('is_active', true);

        // Build lookup: student_id → batch info
        const batchByStudent: Record<string, any> = {};
        if (enrollments) {
          for (const e of enrollments) {
            if (e.student_id && e.batches) {
              batchByStudent[e.student_id] = {
                ...(e.batches as any),
                batch_id: e.batch_id
              };
            }
          }
        }

        // Step 3: Merge batch into each student
        return data.map((s: any) => ({
          ...s,
          batch_id: batchByStudent[s.id]?.batch_id || null,
          batch: batchByStudent[s.id] || null
        }));
        return data || [];
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

    const supabase = createClient();
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
