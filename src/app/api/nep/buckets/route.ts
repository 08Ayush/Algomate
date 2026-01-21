import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  GetBucketsForBatchUseCase,
  CreateElectiveBucketUseCase,
  SupabaseElectiveBucketRepository,
  CreateElectiveBucketDtoSchema
} from '@/modules/elective';
import { authenticate } from '@/shared/middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const bucketRepo = new SupabaseElectiveBucketRepository(supabase);
const getBucketsUseCase = new GetBucketsForBatchUseCase(bucketRepo);
const createBucketUseCase = new CreateElectiveBucketUseCase(bucketRepo);

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const courseId = searchParams.get('courseId');
    const semester = searchParams.get('semester');
    const departmentId = searchParams.get('departmentId');
    const fetchAll = searchParams.get('fetchAll');

    // Fetch all buckets for college admin
    if (fetchAll === 'true') {
      if (user.role !== 'college_admin' && user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const buckets = await bucketRepo.findByCollegeId(user.college_id);

      // Enrich with subjects
      const enriched = await Promise.all(
        buckets.map(async (bucket) => {
          const { data: subjects } = await supabase
            .from('subjects')
            .select('*')
            .eq('course_group_id', bucket.id)
            .eq('college_id', user.college_id);

          return {
            ...bucket.toJSON(),
            subjects: subjects || []
          };
        })
      );

      return NextResponse.json(enriched);
    }

    // Find batch by various methods
    let resolvedBatchId = batchId;

    if (!resolvedBatchId && courseId && semester) {
      const { data: batch } = await supabase
        .from('batches')
        .select('id')
        .eq('college_id', user.college_id)
        .eq('course_id', courseId)
        .eq('semester', parseInt(semester))
        .eq('is_active', true)
        .maybeSingle();

      resolvedBatchId = batch?.id;
    }

    if (!resolvedBatchId) {
      return NextResponse.json([]);
    }

    const result = await getBucketsUseCase.execute(resolvedBatchId);

    // Enrich with subjects
    const enriched = await Promise.all(
      result.buckets.map(async (bucket: any) => {
        const { data: subjects } = await supabase
          .from('subjects')
          .select('*')
          .eq('course_group_id', bucket.id)
          .eq('college_id', user.college_id);

        return {
          ...bucket,
          subjects: subjects || []
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error('Error in GET /api/nep/buckets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate DTO
    const dto = CreateElectiveBucketDtoSchema.parse(body);

    const result = await createBucketUseCase.execute(dto);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error in POST /api/nep/buckets:', error);
    const status = error.name === 'ZodError' ? 400 : 500;
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    );
  }
}