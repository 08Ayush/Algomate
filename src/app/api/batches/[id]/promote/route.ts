import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { PromoteBatchUseCase, SupabaseBatchRepository } from '@/modules/batch';
import { requireAuth } from '@/lib/auth';

const batchRepo = new SupabaseBatchRepository(supabase);
const promoteBatchUseCase = new PromoteBatchUseCase(batchRepo);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (user.role !== 'college_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await promoteBatchUseCase.execute(id);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error promoting batch:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    );
  }
}
