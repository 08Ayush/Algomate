import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/shared/database';
import { SupabaseTimetableRepository, SupabaseScheduledClassRepository } from '@/modules/timetable/infrastructure/persistence/SupabaseTimetableRepository';
import { SupabaseUserRepository } from '@/modules/auth/infrastructure/persistence/SupabaseUserRepository';
import { CreateManualTimetableUseCase } from '@/modules/timetable/application/use-cases/CreateManualTimetableUseCase';
import { GetTimetablesUseCase } from '@/modules/timetable/application/use-cases/GetTimetablesUseCase';
import { handleError } from '@/shared/utils/response';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
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

    return dbUser;
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

    const timetableRepo = new SupabaseTimetableRepository(supabase);
    const getTimetablesUseCase = new GetTimetablesUseCase(timetableRepo);

    const timetables = await getTimetablesUseCase.execute({
      batchId,
      semester,
      status,
      academicYear,
      departmentId: departmentId as string
    });

    const enrichedTimetables = await Promise.all(timetables.map(async (tt) => {
      // Fetch batch info
      const { data: batch } = await supabase.from('batches').select('id, name, semester, section, department_id').eq('id', tt.batchId).single();
      // Fetch creator info
      const { data: creator } = await supabase.from('users').select('first_name, last_name, email').eq('id', tt.createdBy).single();

      // Re-fetch the row to get generation_task_id directly if missing from entity
      const { data: rawTT } = await supabase.from('generated_timetables').select('generation_task_id').eq('id', tt.id).single();
      let taskInfo = null;
      if (rawTT?.generation_task_id) {
        const { data: task } = await supabase.from('timetable_generation_tasks').select('task_name, status, progress').eq('id', rawTT.generation_task_id).single();
        taskInfo = task;
      }

      return {
        ...tt.toJSON(),
        batch: batch || null,
        created_by_user: creator || null,
        generation_task: taskInfo || null
      };
    }));

    return NextResponse.json({ success: true, data: enrichedTimetables });

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