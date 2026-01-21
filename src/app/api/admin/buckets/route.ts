import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SupabaseElectiveBucketRepository } from '@/modules/elective';
import { authenticate } from '@/shared/middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const bucketRepo = new SupabaseElectiveBucketRepository(supabase);

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user || user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all buckets for the college
    const buckets = await bucketRepo.findByCollegeId(user.college_id);

    // Enrich with batch and subject details
    const enriched = await Promise.all(
      buckets.map(async (bucket) => {
        const { data: batch } = await supabase
          .from('batches')
          .select('id, name, semester, academic_year')
          .eq('id', bucket.batchId)
          .single();

        const { data: subjects } = await supabase
          .from('subjects')
          .select('*')
          .eq('course_group_id', bucket.id);

        return {
          ...bucket.toJSON(),
          batch,
          subjects: subjects || []
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error('Error fetching admin buckets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
