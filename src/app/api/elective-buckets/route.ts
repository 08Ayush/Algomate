import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GetBucketsForBatchUseCase, SupabaseElectiveBucketRepository } from '@/modules/elective';
import { requireAuth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const bucketRepo = new SupabaseElectiveBucketRepository(supabase);
const getBucketsUseCase = new GetBucketsForBatchUseCase(bucketRepo);

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    // Get student's batch
    const { data: student } = await supabase
      .from('users')
      .select('batch_id')
      .eq('id', studentId || user.id)
      .single();

    if (!student?.batch_id) {
      return NextResponse.json([]);
    }

    const result = await getBucketsUseCase.execute(student.batch_id);

    // Enrich with subjects
    const enriched = await Promise.all(
      result.buckets.map(async (bucket: any) => {
        const { data: subjects } = await supabase
          .from('subjects')
          .select('*')
          .eq('course_group_id', bucket.id);

        return {
          ...bucket,
          subjects: subjects || []
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error('Error fetching elective buckets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
