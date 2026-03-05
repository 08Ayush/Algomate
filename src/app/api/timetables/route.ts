import { serviceDb as supabase } from '@/shared/database';
import { getPool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Database } from '@/shared/database';
import { SupabaseTimetableRepository, SupabaseScheduledClassRepository } from '@/modules/timetable/infrastructure/persistence/SupabaseTimetableRepository';
import { SupabaseUserRepository } from '@/modules/auth/infrastructure/persistence/SupabaseUserRepository';
import { CreateManualTimetableUseCase } from '@/modules/timetable/application/use-cases/CreateManualTimetableUseCase';
import { handleError } from '@/shared/utils/response';


// Helper function to get authenticated user
interface AuthenticatedUser {
  id: string;
  department_id: string | null;
  role: string | null;
  is_active: boolean | null;
  college_id: string | null;
}

async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const userString = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userString);

    // Verify user exists and is active
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, department_id, role, is_active, college_id')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !dbUser) {
      return null;
    }

    return dbUser as AuthenticatedUser;
  } catch {
    return null;
  }
}

import { getPaginationParams, getPaginationRange, createPaginatedResponse } from '@/shared/utils/pagination';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId') || undefined;
    const semester = searchParams.get('semester') ? parseInt(searchParams.get('semester')!) : undefined;
    const status = searchParams.get('status') || undefined;
    const academicYear = searchParams.get('academicYear') || undefined;
    const departmentId = searchParams.get('department_id') || searchParams.get('departmentId') || undefined;

    const { page, limit, isPaginated } = getPaginationParams(request);
    const pool = getPool();

    // Build dynamic WHERE conditions
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (user.role !== 'super_admin') {
      conditions.push(`gt.college_id = $${idx++}`);
      params.push(user.college_id);
    }
    if (batchId)      { conditions.push(`gt.batch_id = $${idx++}`);      params.push(batchId); }
    if (semester)     { conditions.push(`gt.semester = $${idx++}`);      params.push(semester); }
    if (status)       { conditions.push(`gt.status = $${idx++}`);        params.push(status); }
    if (academicYear) { conditions.push(`gt.academic_year = $${idx++}`); params.push(academicYear); }
    if (departmentId) { conditions.push(`gt.department_id = $${idx++}`); params.push(departmentId); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matching rows
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM generated_timetables gt ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Build pagination clause
    const dataParams = [...params];
    let paginationClause = '';
    if (isPaginated && page && limit) {
      const { from, to } = getPaginationRange(page, limit);
      paginationClause = ` LIMIT $${idx++} OFFSET $${idx++}`;
      dataParams.push(to - from + 1, from);
    } else if (!batchId) {
      paginationClause = ' LIMIT 500';
    }

    // Fetch with SQL JOIN so batch data is always populated
    const dataResult = await pool.query(
      `SELECT gt.*,
         CASE WHEN b.id IS NOT NULL
           THEN json_build_object('id', b.id, 'name', b.name, 'semester', b.semester,
                                  'section', b.section, 'department_id', b.department_id)
           ELSE NULL END AS batch,
         CASE WHEN u.id IS NOT NULL
           THEN json_build_object('first_name', u.first_name, 'last_name', u.last_name, 'email', u.email)
           ELSE NULL END AS created_by_user
       FROM generated_timetables gt
       LEFT JOIN batches b ON b.id = gt.batch_id
       LEFT JOIN users   u ON u.id = gt.created_by
       ${whereClause}
       ORDER BY gt.created_at DESC${paginationClause}`,
      dataParams
    );

    const mappedData = dataResult.rows.map((item: any) => ({
      id: item.id,
      title: item.title,
      department_id: item.department_id,
      batch_id: item.batch_id,
      college_id: item.college_id,
      academic_year: item.academic_year,
      fitness_score: item.fitness_score,
      constraint_violations: item.constraint_violations,
      generation_method: item.generation_method,
      created_by: item.created_by,
      published_at: item.published_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
      departmentId: item.department_id,
      batchId: item.batch_id,
      collegeId: item.college_id,
      semester: item.semester,
      academicYear: item.academic_year,
      fitnessScore: item.fitness_score,
      constraintViolations: item.constraint_violations,
      generationMethod: item.generation_method,
      status: item.status,
      createdBy: item.created_by,
      publishedAt: item.published_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      batch: item.batch || null,
      batch_name: item.batch?.name || null,
      created_by_user: item.created_by_user || null,
    }));

    let meta;
    if (isPaginated && page && limit) {
      const paginatedResult = createPaginatedResponse(mappedData, total, page, limit);
      meta = paginatedResult.meta;
    } else {
      meta = { total: mappedData.length, page: 1, limit: mappedData.length };
    }

    return NextResponse.json({ success: true, data: mappedData, meta });

  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    // Validate createdBy matches authenticated user or is allowed
    if (body.createdBy && body.createdBy !== user.id) {
      // Maybe allow admin to create for others? For now warn
      console.warn(`User ${user.id} creating timetable for ${body.createdBy}`);
    }

    const timetableRepo = new SupabaseTimetableRepository(supabase);
    const scheduledClassRepo = new SupabaseScheduledClassRepository(supabase);
    const userRepo = new SupabaseUserRepository(supabase);

    const createManualTimetableUseCase = new CreateManualTimetableUseCase(
      timetableRepo,
      scheduledClassRepo,
      userRepo,
      supabase
    );

    const result = await createManualTimetableUseCase.execute({
      assignments: body.assignments,
      createdBy: body.createdBy || user.id, // Default to auth user if missing
      academicYear: body.academicYear,
      semester: body.semester,
      departmentId: body.departmentId,
      collegeId: body.collegeId || user.college_id,
      batchId: body.batchId,
      title: body.title
    });

    return NextResponse.json(result);

  } catch (error) {
    return handleError(error);
  }
}