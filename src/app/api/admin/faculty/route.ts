import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/database/server';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '@/shared/middleware/error-handler';

async function getAuthenticatedUser(request: NextRequest, requireAdmin = false) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
  try {
    const userString = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userString);
    const supabase = createClient();

    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, college_id, department_id, role, faculty_type, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !dbUser) return null;
    if (requireAdmin && !['admin', 'college_admin', 'super_admin'].includes(dbUser.role)) return null;

    if (!requireAdmin) {
      const allowedRoles = ['admin', 'college_admin', 'super_admin'];
      const allowedFacultyTypes = ['creator', 'publisher'];
      if (!allowedRoles.includes(dbUser.role) &&
        !(dbUser.role === 'faculty' && allowedFacultyTypes.includes(dbUser.faculty_type))) return null;
    }

    return dbUser;
  } catch {
    return null;
  }
}

export const GET = asyncHandler(
  async (request: NextRequest): Promise<NextResponse<any>> => {
    const user = await getAuthenticatedUser(request, false);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryCollegeId = searchParams.get('college_id');
    let targetCollegeId = user.college_id;

    if (user.role === 'super_admin' && queryCollegeId) {
      targetCollegeId = queryCollegeId;
    }

    const { withCacheAside } = await import('@/shared/cache/cache-helper');
    const { redisCache } = await import('@/shared/cache/redis-cache');

    const cacheKeySuffix = (!['super_admin', 'admin', 'college_admin'].includes(user.role) && user.department_id)
      ? `dept:${user.department_id}`
      : 'all';

    const cacheKey = redisCache.buildKey(targetCollegeId, 'faculty', 'list', cacheKeySuffix);

    const faculty = await withCacheAside(
      { key: cacheKey, ttl: 1800 },
      async () => {
        const supabase = createClient();
        let query = supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            email,
            college_uid,
            phone,
            role,
            faculty_type,
            department_id,
            college_id,
            is_active,
            departments!users_department_id_fkey(id, name, code)
          `)
          .eq('college_id', targetCollegeId)
          .in('role', ['admin', 'faculty']);

        if (!['super_admin', 'admin', 'college_admin'].includes(user.role) && user.department_id) {
          query = query.eq('department_id', user.department_id);
        }

        const { data, error } = await query.order('first_name');
        if (error) throw new Error('Failed to fetch faculty');
        return data || [];
      }
    );

    const mappedFaculty = faculty?.map(f => {
      if (f.role === 'faculty' && (f.faculty_type === 'creator' || f.faculty_type === 'publisher')) {
        return { ...f, role: f.faculty_type };
      }
      return f;
    });

    return NextResponse.json({ success: true, faculty: mappedFaculty || [] });
  }
);

export const POST = asyncHandler(
  async (request: NextRequest): Promise<NextResponse<any>> => {
    const user = await getAuthenticatedUser(request, true);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { first_name, last_name, email, phone, role, faculty_type, department_id, is_active } = await request.json();

    let actualRole = role;
    let actualFacultyType = faculty_type || 'general';

    if (role === 'creator' || role === 'publisher') {
      actualRole = 'faculty';
      actualFacultyType = role;
    }

    if (!first_name || !last_name || !email || !department_id) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 400 });
    }

    const { data: department } = await supabase
      .from('departments')
      .select('id')
      .eq('id', department_id)
      .eq('college_id', user.college_id)
      .single();

    if (!department) {
      return NextResponse.json({ success: false, error: 'Department not found' }, { status: 400 });
    }

    const rolePrefix = actualRole === 'admin' ? 'ADM' : 'FAC';
    const randomSuffix = Math.floor(Math.random() * 900000) + 100000;
    const college_uid = `${rolePrefix}${randomSuffix}`;
    const defaultPassword = 'faculty123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    const { data: newFaculty, error } = await supabase
      .from('users')
      .insert({
        first_name,
        last_name,
        email,
        phone: phone || null,
        college_uid,
        password_hash: passwordHash,
        role: actualRole,
        faculty_type: actualFacultyType,
        department_id,
        college_id: user.college_id,
        is_active: is_active !== undefined ? is_active : true,
        email_verified: false
      })
      .select(`
        id,
        first_name,
        last_name,
        email,
        college_uid,
        phone,
        role,
        faculty_type,
        department_id,
        college_id,
        is_active,
        departments!users_department_id_fkey(id, name, code)
      `)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to create faculty' }, { status: 500 });
    }

    const displayFaculty = {
      ...newFaculty,
      role: (newFaculty.role === 'faculty' &&
        (newFaculty.faculty_type === 'creator' || newFaculty.faculty_type === 'publisher'))
        ? newFaculty.faculty_type
        : newFaculty.role
    };

    const { invalidateCache } = await import('@/shared/cache/cache-helper');
    const { redisCache } = await import('@/shared/cache/redis-cache');

    await invalidateCache(redisCache.buildKey(user.college_id, 'faculty', 'list', 'all'));
    if (department_id) {
      await invalidateCache(redisCache.buildKey(user.college_id, 'faculty', 'list', `dept:${department_id}`));
    }

    return NextResponse.json({
      success: true,
      message: 'Faculty created successfully',
      faculty: displayFaculty,
      defaultPassword
    }, { status: 201 });
  }
);
