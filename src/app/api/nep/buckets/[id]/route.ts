import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  UpdateElectiveBucketUseCase,
  DeleteElectiveBucketUseCase,
  SupabaseElectiveBucketRepository,
  UpdateElectiveBucketDtoSchema
} from '@/modules/elective';
import { authenticate } from '@/shared/middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const bucketRepo = new SupabaseElectiveBucketRepository(supabase);
const updateBucketUseCase = new UpdateElectiveBucketUseCase(bucketRepo);
const deleteBucketUseCase = new DeleteElectiveBucketUseCase(bucketRepo);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bucket = await bucketRepo.findById(params.id);
    if (!bucket) {
      return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
    }

    // Fetch subjects
    const { data: subjects } = await supabase
      .from('subjects')
      .select('*')
      .eq('course_group_id', params.id);

    return NextResponse.json({
      ...bucket.toJSON(),
      subjects: subjects || []
    });
  } catch (error: any) {
    console.error('Error fetching bucket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const dto = UpdateElectiveBucketDtoSchema.parse(body);

    const result = await updateBucketUseCase.execute(params.id, dto);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error updating bucket:', error);
    const status = error.name === 'ZodError' ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await deleteBucketUseCase.execute(params.id);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error deleting bucket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
