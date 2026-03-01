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

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const userString = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userString);

    // Verify user exists and is active
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, department_id, role, is_active, college_id')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !dbUser) {
      return null;
    }

    return dbUser;
  } catch {
    return null;
  }
}

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
