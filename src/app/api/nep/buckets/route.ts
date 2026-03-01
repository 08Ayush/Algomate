import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SupabaseElectiveBucketRepository } from '../../../../modules/elective/infrastructure/persistence/SupabaseElectiveBucketRepository';
import { GetBucketsForBatchUseCase } from '../../../../modules/elective/application/use-cases/GetBucketsForBatchUseCase';
import { CreateElectiveBucketUseCase } from '../../../../modules/elective/application/use-cases/CreateElectiveBucketUseCase';
import { CreateElectiveBucketDtoSchema } from '../../../../modules/elective/application/dto/ElectiveBucketDto';
import { requireAuth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const bucketRepo = new SupabaseElectiveBucketRepository(supabase);
const getBucketsUseCase = new GetBucketsForBatchUseCase(bucketRepo);
const createBucketUseCase = new CreateElectiveBucketUseCase(bucketRepo);

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

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

      // Optimized: Fetch buckets with subjects in a single query
      const { data: buckets, error } = await supabase
        .from('elective_buckets')
        .select(`
          *,
          subjects (*)
        `)
        .eq('college_id', user.college_id);

      if (error) {
        throw error;
      }

      // Transform to match expected items format if necessary, 
      // but usually subjects array from join is compatible with the "enriched" logic
      const enriched = buckets.map((bucket: any) => ({
        ...bucket,
        subjects: bucket.subjects || []
      }));

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

    // NEP 2020 Approach: If no batch found, try direct lookup with college_id + course code + semester
    if (!resolvedBatchId && courseId && semester) {
      console.log('[NEP Buckets] Trying NEP 2020 lookup...');
      console.log('[NEP Buckets] Course ID:', courseId);

      // Get course code from course ID
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('code')
        .eq('id', courseId)
        .single();

      console.log('[NEP Buckets] Course lookup result:', course, courseError);

      if (course?.code) {
        console.log('[NEP Buckets] Looking for buckets with:', {
          college_id: user.college_id,
          course: course.code,
          semester: parseInt(semester)
        });

        // Query buckets directly using NEP 2020 fields
        const { data: nepBuckets, error: bucketsError } = await supabase
          .from('elective_buckets')
          .select(`
            *,
            batches:batch_id (
              id,
              name,
              semester,
              section,
              academic_year,
              course_id,
              department_id,
              is_active,
              courses:course_id (id, title, code),
              departments:department_id (id, name, code)
            )
          `)
          .eq('college_id', user.college_id)
          .eq('course', course.code)
          .eq('semester', parseInt(semester));

        console.log('[NEP Buckets] Query result:', nepBuckets?.length || 0, 'buckets', bucketsError);

        if (nepBuckets && nepBuckets.length > 0) {
          // Enrich with subjects
          // Optimized: Fetch all subjects for these buckets in one query
          const bucketIds = nepBuckets.map(b => b.id);
          const { data: allSubjects } = await supabase
            .from('subjects')
            .select('*')
            .in('course_group_id', bucketIds)
            .eq('college_id', user.college_id);

          // Map subjects to buckets in memory
          const enriched = nepBuckets.map((bucket: any) => {
            const bucketSubjects = allSubjects?.filter(s => s.course_group_id === bucket.id) || [];
            return {
              id: bucket.id,
              bucket_name: bucket.bucket_name,
              is_common_slot: bucket.is_common_slot,
              min_selection: bucket.min_selection,
              max_selection: bucket.max_selection,
              batch_id: bucket.batch_id,
              created_at: bucket.created_at,
              batch_info: bucket.batches,
              subjects: bucketSubjects
            };
          });

          return NextResponse.json(enriched);
        }
      }
    }

    if (!resolvedBatchId) {
      return NextResponse.json([]);
    }

    const result = await getBucketsUseCase.execute(resolvedBatchId);

    // Enrich with subjects
    // Optimized: Fetch all subjects for the found buckets
    const bucketIds = result.buckets.map(b => b.id);
    const { data: allSubjects } = await supabase
      .from('subjects')
      .select('*')
      .in('course_group_id', bucketIds)
      .eq('college_id', user.college_id);

    // Enrich in memory
    const enriched = result.buckets.map((bucket: any) => {
      const bucketSubjects = allSubjects?.filter(s => s.course_group_id === bucket.id) || [];
      return {
        ...bucket,
        subjects: bucketSubjects
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error('Error in GET /api/nep/buckets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

    const body = await request.json();

    // Validate DTO
    const dto = CreateElectiveBucketDtoSchema.parse(body);

    const result = await createBucketUseCase.execute(dto);

    // Notify Department Faculty
    try {
      if (user.id) {
        // Fallback to user department if not in result
        const departmentId = (result as any).department_id || user.department_id;
        if (departmentId) {
          const { notifyNEPBucketCreated } = await import('@/lib/notificationService');
          await notifyNEPBucketCreated({
            bucketId: (result as any).id,
            bucketName: (result as any).bucket_name,
            departmentId: departmentId,
            creatorId: user.id,
            creatorName: `${user.first_name || 'Admin'} ${user.last_name || ''}`.trim()
          });
        }
      }
    } catch (notifError) {
      console.error('Failed to send bucket creation notification:', notifError);
    }

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