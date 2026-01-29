import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  GetClassroomsUseCase,
  CreateClassroomUseCase,
  SupabaseClassroomRepository,
  CreateClassroomDtoSchema
} from '@/modules/classroom';
import { authenticate } from '@/shared/middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const classroomRepo = new SupabaseClassroomRepository(supabase);
const getClassroomsUseCase = new GetClassroomsUseCase(classroomRepo);
const createClassroomUseCase = new CreateClassroomUseCase(classroomRepo);

import { getPaginationParams, createPaginatedResponse } from '@/shared/utils/pagination';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const queryCollegeId = searchParams.get('college_id');

    // Pagination
    const { page, limit } = getPaginationParams(request);

    // For super_admin, use college_id from query params
    let targetCollegeId = user.college_id;
    if (user.role === 'super_admin' && queryCollegeId) {
      targetCollegeId = queryCollegeId;
    }

    if (!targetCollegeId) {
      return NextResponse.json({ error: 'College ID is required' }, { status: 400 });
    }

    const result = await getClassroomsUseCase.execute(
      targetCollegeId,
      departmentId || undefined,
      page,
      limit
    );

    const paginated = createPaginatedResponse(result.classrooms, result.total, page, limit);

    return NextResponse.json({
      classrooms: paginated.data,
      meta: paginated.meta
    });
  } catch (error: any) {
    console.error('Error fetching classrooms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user || (user.role !== 'college_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const dto = CreateClassroomDtoSchema.parse(body);

    const result = await createClassroomUseCase.execute(dto);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error creating classroom:', error);
    const status = error.name === 'ZodError' ? 400 : 500;
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    );
  }
}