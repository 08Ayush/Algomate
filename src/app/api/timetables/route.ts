import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/shared/database';
import { SupabaseTimetableRepository, SupabaseScheduledClassRepository } from '@/modules/timetable/infrastructure/persistence/SupabaseTimetableRepository';
import { SupabaseUserRepository } from '@/modules/auth/infrastructure/persistence/SupabaseUserRepository';
import { CreateManualTimetableUseCase } from '@/modules/timetable/application/use-cases/CreateManualTimetableUseCase';
import { handleError } from '@/shared/utils/response';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId') || undefined;
    const semester = searchParams.get('semester') ? parseInt(searchParams.get('semester')!) : undefined;
    const status = searchParams.get('status') || undefined;
    const academicYear = searchParams.get('academicYear') || undefined;

    // For filtering by department if user is faculty/admin
    // If faculty, restrict to their department unless they have broader access? 
    // Existing logic didn't strictly enforce, but let's pass departmentId from params if any
    const departmentId = searchParams.get('departmentId') || (user.role === 'faculty' ? user.department_id : undefined);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Optimized efficient fetch with embedded resources (Joins)
    let query = supabase
      .from('generated_timetables')
      // Select all timetable fields, plus join:
      // - batch: full batch details
      // - created_by_user: the user details (aliased) who created it (explicitly joining on created_by column)
      // - generation_task: the task details (aliased) linked by generation_task_id
      .select(`
        *,
        batch:batches(id, name, semester, section, department_id),
        created_by_user:users!created_by(first_name, last_name, email),
        generation_task:timetable_generation_tasks!generation_task_id(task_name, status, progress)
      `, { count: 'exact' });

    // Apply filters
    if (user.role !== 'platform_admin') {
      query = query.eq('college_id', user.college_id ?? '');
    }

    if (batchId) query = query.eq('batch_id', batchId);
    if (semester) query = query.eq('semester', semester);
    if (status) query = query.eq('status', status);
    if (academicYear) query = query.eq('academic_year', academicYear);
    if (departmentId) query = query.eq('department_id', departmentId as string);

    // Default sort
    query = query.order('created_at', { ascending: false })
      .range(from, to);

    const { data: enrichedTimetables, count, error: queryError } = await query;

    if (queryError) {
      throw queryError;
    }

    // Transform if necessary to match exact shape expected by frontend, 
    // although the select aliases allow it to match closely.
    // The previous implementation utilized .toJSON() on the entity, which converts 'batch_id' to 'batchId' (camelCase).
    // The raw Supabase response will be snake_case (standard DB).
    // If the frontend expects camelCase, we should map it here.

    // Quick mapper to ensure frontend compatibility
    const mappedData = enrichedTimetables.map((item: any) => ({
      id: item.id,
      title: item.title,
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
      created_by_user: item.created_by_user,
      generation_task: item.generation_task
    }));

    const meta = {
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };

    return NextResponse.json({ success: true, data: mappedData, meta });


  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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