import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/database/server';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const GET = asyncHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user; // Auth failed

  const { searchParams } = new URL(request.url);
  const collegeId = searchParams.get('college_id') || user.college_id;
  const departmentId = searchParams.get('department_id');
  const semesterParam = searchParams.get('semester');
  const semester = semesterParam ? parseInt(semesterParam) : null;

  if (!collegeId) {
    return NextResponse.json({ success: false, error: 'College ID is required' }, { status: 400 });
  }

  const { withCacheAside } = await import('@/shared/cache/cache-helper');
  const { redisCache } = await import('@/shared/cache/redis-cache');

  const cacheKeyParts = [collegeId, 'subjects', 'list-v2']; // v2: includes batches subquery
  if (departmentId) cacheKeyParts.push(`dept:${departmentId}`);
  if (semester) cacheKeyParts.push(`sem:${semester}`);
  const cacheKey = redisCache.buildKey(cacheKeyParts[0], cacheKeyParts[1], cacheKeyParts[2], cacheKeyParts.slice(3).join(':') || undefined);

  const subjects = await withCacheAside(
    { key: cacheKey, ttl: 1800 },
    async () => {
      const pool = getPool();
      const params: any[] = [collegeId];
      let sql = `
        SELECT s.*,
          CASE WHEN d.id IS NOT NULL
            THEN json_build_object('id', d.id, 'name', d.name, 'code', d.code)
            ELSE NULL END AS departments,
          COALESCE(bmap.batches, '[]'::json) AS batches
        FROM subjects s
        LEFT JOIN departments d ON d.id = s.department_id
        LEFT JOIN (
          SELECT bs.subject_id,
            json_agg(json_build_object('id', ba.id, 'name', ba.name) ORDER BY ba.name) AS batches
          FROM batch_subjects bs
          JOIN batches ba ON ba.id = bs.batch_id
          GROUP BY bs.subject_id
        ) bmap ON bmap.subject_id = s.id
        WHERE s.college_id = $1
      `;

      if (departmentId) {
        sql += ` AND s.department_id = $${params.length + 1}`;
        params.push(departmentId);
      }

      if (semester) {
        sql += ` AND s.semester = $${params.length + 1}`;
        params.push(semester);
      }

      sql += ' ORDER BY s.name';
      const { rows } = await pool.query(sql, params);
      return rows;
    }
  );

  return NextResponse.json({ success: true, subjects });
});

export const POST = asyncHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { name, code, credits_per_week, credit_value, department_id, semester, subject_type, nep_category, course_id, is_active } = body;

  if (!name || !code || !department_id) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

    // 1. Create the subject with all provided fields
  const { data: subject, error: subjectError } = await supabase
    .from('subjects')
    .insert({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      credits_per_week: credits_per_week || 3,
      credit_value: credit_value ?? credits_per_week ?? 3,
      department_id,
      college_id: user.college_id,
      semester: semester || 1,
      subject_type: subject_type || 'THEORY',
      nep_category: nep_category || 'CORE',
      course_id: course_id || null,
      is_active: is_active !== undefined ? is_active : true,
      requires_lab: (subject_type === 'LAB' || subject_type === 'PRACTICAL')
    })
    .select()
    .single();

  if (subjectError) {
    console.error('Subject creation error:', subjectError);

    // Provide user-friendly error messages
    if (subjectError.code === '23505') {
      return NextResponse.json({
        success: false,
        error: `Subject code "${code}" already exists in this college. Please use a different code.`
      }, { status: 409 });
    }

    return NextResponse.json({ success: false, error: subjectError.message }, { status: 500 });
  }

  // 2. Automatically allot to relevant active batches
  const targetSemester = Number(semester) || 1;
  let batchQuery = supabase
    .from('batches')
    .select('id')
    .eq('college_id', user.college_id)
    .eq('department_id', department_id)
    .eq('semester', targetSemester)
    .eq('is_active', true);

  // If the subject belongs to a specific course, only allot to batches of that course
  if (course_id) {
    batchQuery = batchQuery.eq('course_id', course_id);
  }

  const { data: batches, error: batchesError } = await batchQuery;

  if (batchesError) {
    console.error('Error fetching batches for auto-allotment:', batchesError);
  } else if (batches && batches.length > 0) {
    // Brand-new subject → no existing batch_subjects rows possible, use insert.
    // Explicitly generate UUIDs because the DB default does not fire via the JS client.
    const batchSubjects = batches.map((batch: { id: string }) => ({
      id: crypto.randomUUID(),
      batch_id: batch.id,
      subject_id: subject.id,
      required_hours_per_week: credits_per_week || 3,
      is_mandatory: true
    }));

    const { error: allotmentError } = await supabase
      .from('batch_subjects')
      .insert(batchSubjects);

    if (allotmentError) {
      console.error('Error in automatic subject allotment:', allotmentError);
    }
  }

  // Invalidate cache
  const { invalidateCachePattern } = await import('@/shared/cache/cache-helper');
  const { redisCache } = await import('@/shared/cache/redis-cache');
  await invalidateCachePattern(redisCache.buildKey(user.college_id!, 'subjects', 'list') + '*');

  return NextResponse.json({ success: true, subject }, { status: 201 });
});
