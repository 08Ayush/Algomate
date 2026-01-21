import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SupabaseElectiveBucketRepository } from '@/modules/elective';
import { authenticate } from '@/shared/middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const bucketRepo = new SupabaseElectiveBucketRepository(supabase);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticate(request);
    if (!user || user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark bucket as published
    await supabase
      .from('elective_buckets')
      .update({ is_published: true } as any)
      .eq('id', params.id);

    return NextResponse.json({
      success: true,
      message: 'Bucket published successfully'
    });
  } catch (error: any) {
    console.error('Error publishing bucket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
