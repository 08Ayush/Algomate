import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  GetCoursesUseCase,
  CreateCourseUseCase,
  SupabaseCourseRepository,
  CreateCourseDtoSchema
} from '@/modules/course';
import { authenticate } from '@/shared/middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const courseRepo = new SupabaseCourseRepository(supabase);
const getCoursesUseCase = new GetCoursesUseCase(courseRepo);
const createCourseUseCase = new CreateCourseUseCase(courseRepo);

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');

    const result = await getCoursesUseCase.execute(
      user.college_id,
      departmentId || undefined
    );

    return NextResponse.json(result.courses);
  } catch (error: any) {
    console.error('Error fetching courses:', error);
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
    const dto = CreateCourseDtoSchema.parse(body);

    const result = await createCourseUseCase.execute(dto);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error creating course:', error);
    const status = error.name === 'ZodError' ? 400 : 500;
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    );
  }
}
