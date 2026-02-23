import { NextRequest, NextResponse } from 'next/server';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { createClient } from '@/shared/database/server';
import bcrypt from 'bcryptjs';
import { withCacheAside, invalidateCache } from '@/shared/cache/cache-helper';
import { redisCache } from '@/shared/cache/redis-cache';

export const GET = asyncHandler(
  async (request: NextRequest): Promise<NextResponse<any>> => {
    // Get auth header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Decode the base64 token securely
    const token = authHeader.substring(7);
    let decodedUser;
    try {
      decodedUser = JSON.parse(Buffer.from(token, 'base64').toString());
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Invalid token format' }, { status: 401 });
    }

    if (!decodedUser || !decodedUser.college_id) {
      return NextResponse.json({ success: false, error: 'College ID not found in token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryCollegeId = searchParams.get('college_id');
    let targetCollegeId = decodedUser.college_id;

    if (decodedUser.role === 'super_admin' && queryCollegeId) {
      targetCollegeId = queryCollegeId;
    }

    const supabase = createClient();
    const cacheKey = redisCache.buildKey(targetCollegeId, 'students', 'list');

    const students = await withCacheAside(
      { key: cacheKey, ttl: 1800 },
      async () => {
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
        return data || [];
      }
    );

    return NextResponse.json({ success: true, students });
  }
);

export const POST = asyncHandler(
  async (request: NextRequest): Promise<NextResponse<any>> => {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decodedUser;
    try {
      decodedUser = JSON.parse(Buffer.from(token, 'base64').toString());
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Invalid token format' }, { status: 401 });
    }

    if (!decodedUser || !decodedUser.college_id) {
      return NextResponse.json({ success: false, error: 'College ID not found' }, { status: 400 });
    }

    const body = await request.json();
    const { first_name, last_name, email, student_id, phone, password, current_semester, admission_year, course_id, department_id, is_active } = body;

    if (!first_name || !last_name || !email || !course_id || !department_id || !password) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: existingStudents } = await supabase
      .from('users')
      .select('college_uid')
      .eq('college_id', decodedUser.college_id)
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
        college_id: decodedUser.college_id,
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single();

    if (error) throw error;

    const cacheKey = redisCache.buildKey(decodedUser.college_id, 'students', 'list');
    await invalidateCache(cacheKey);

    return NextResponse.json({ success: true, student: newStudent }, { status: 201 });
  }
);
