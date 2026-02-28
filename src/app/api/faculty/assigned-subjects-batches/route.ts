import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/shared/database';
import { SupabaseSubjectRepository } from '@/modules/nep-curriculum/infrastructure/persistence/SupabaseSubjectRepository';
import { SupabaseBatchRepository } from '@/modules/college/infrastructure/persistence/SupabaseBatchRepository';
import { GetQualifiedSubjectsUseCase } from '@/modules/nep-curriculum/application/use-cases/GetQualifiedSubjectsUseCase';
import { GetBatchesUseCase } from '@/modules/college/application/use-cases/GetBatchesUseCase';
import { handleError } from '@/shared/utils/response';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    // Initialize repositories
    const subjectRepo = new SupabaseSubjectRepository(supabase);
    const batchRepo = new SupabaseBatchRepository(supabase);

    // Initialize Use Cases
    const getQualifiedSubjectsUseCase = new GetQualifiedSubjectsUseCase(subjectRepo);
    const getBatchesUseCase = new GetBatchesUseCase(batchRepo);

    // Fetch data concurrently
    const [subjects, batches] = await Promise.all([
      getQualifiedSubjectsUseCase.execute(user.id),
      getBatchesUseCase.execute(user.college_id, user.department_id)
    ]);

    return NextResponse.json({
      success: true,
      batches: batches.map(b => b.toJSON()), // Use toJSON if entities are returned
      subjects: subjects.map(s => s.toJSON())
    });

  } catch (error) {
    return handleError(error);
  }
}
