import { serviceDb as supabase } from '@/shared/database';
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

    // For filtering by department if explicitly requested
    const departmentId = searchParams.get('department_id') || searchParams.get('departmentId') || undefined;

    // Pagination (Dual-Mode)
    const { page, limit, isPaginated } = getPaginationParams(request);

    // Optimized efficient fetch with embedded resources (Joins)
    let query = supabase
      .from('generated_timetables')
      .select(`
        *,
        batch:batches(id, name, semester, section, department_id),
        created_by_user:users!created_by(first_name, last_name, email),
        generation_task:timetable_generation_tasks!generation_task_id(task_name, status, progress)
      `, { count: 'exact' });

    // Apply filters
    if (user.role !== 'super_admin') {
      query = query.eq('college_id', user.college_id ?? '');
    }

    if (batchId) query = query.eq('batch_id', batchId);
    if (semester) query = query.eq('semester', semester);
    if (status) query = query.eq('status', status);
    if (academicYear) query = query.eq('academic_year', academicYear);
    if (departmentId) query = query.eq('department_id', departmentId as string);

    // Default sort
    query = query.order('created_at', { ascending: false });

    // Apply Pagination if requested
    if (isPaginated && page && limit) {
      const { from, to } = getPaginationRange(page, limit);
      query = query.range(from, to);
    } else {
      // Safety: Limit "Fetch All" to reasonable number (e.g., 500) to prevent crash
      // unless strictly filtered (e.g. by batchId)
      if (!batchId) {
        query = query.limit(500);
      }
    }

    const { data: enrichedTimetables, count, error: queryError } = await query;

    if (queryError) {
      throw queryError;
    }

    // Quick mapper to ensure frontend compatibility
    const mappedData = (enrichedTimetables || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      // Snake case
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
      // CamelCase
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
      // Relations
      batch: item.batch,
      batch_name: item.batch?.name,
      created_by_user: item.created_by_user,
      generation_task: item.generation_task
    }));

    let meta;
    if (isPaginated && page && limit) {
      const paginatedResult = createPaginatedResponse(mappedData, count || 0, page, limit);
      meta = paginatedResult.meta;
    } else {
      meta = {
        total: mappedData.length, // approximation since we might have safety limit
        page: 1,
        limit: mappedData.length
      };
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