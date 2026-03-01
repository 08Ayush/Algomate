import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PromoteBatchUseCase, SupabaseBatchRepository } from '@/modules/batch';
import { requireAuth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const batchRepo = new SupabaseBatchRepository(supabase);
const promoteBatchUseCase = new PromoteBatchUseCase(batchRepo);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (user.role !== 'college_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await promoteBatchUseCase.execute(params.id);
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
