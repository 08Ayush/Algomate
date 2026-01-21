import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SupabaseElectiveBucketRepository } from '@/modules/elective';
import { authenticate } from '@/shared/middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const bucketRepo = new SupabaseElectiveBucketRepository(supabase);

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject_ids } = body;

    if (!Array.isArray(subject_ids)) {
      return NextResponse.json(
        { error: 'subject_ids must be an array' },
        { status: 400 }
      );
    }

    // Link subjects to bucket
    await bucketRepo.linkSubjects(params.id, subject_ids);

    return NextResponse.json({
      success: true,
      message: 'Subjects linked to bucket successfully'
    });

  } catch (error: any) {
    console.error('Error linking subjects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
