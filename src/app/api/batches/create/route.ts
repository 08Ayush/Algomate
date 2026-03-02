import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { CreateBatchUseCase, SupabaseBatchRepository, CreateBatchDtoSchema } from '@/modules/batch';
import { requireAuth } from '@/lib/auth';

const batchRepo = new SupabaseBatchRepository(supabase);
const createBatchUseCase = new CreateBatchUseCase(batchRepo);

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (user.role !== 'college_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const dto = CreateBatchDtoSchema.parse(body);

    const result = await createBatchUseCase.execute(dto);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error creating batch:', error);
    const status = error.name === 'ZodError' ? 400 : 500;
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    );
  }
}
