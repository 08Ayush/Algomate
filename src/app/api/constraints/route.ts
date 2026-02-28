import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';
import {
  GetConstraintRulesUseCase,
  SupabaseConstraintRepository
} from '@/modules/timetable';
import { Database } from '@/shared/database';

// Initialize dependencies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
const constraintRepo = new SupabaseConstraintRepository(supabase);
const getConstraintRulesUseCase = new GetConstraintRulesUseCase(constraintRepo);

/**
 * GET /api/constraints
 * Fetches constraint rules from database, optionally filtered by department
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const searchParams = request.nextUrl.searchParams;
    const departmentId = searchParams.get('department_id') || undefined;

    const rules = await getConstraintRulesUseCase.execute(departmentId);

    console.log(`✅ Fetched ${rules.length} constraint rules${departmentId ? ` for department ${departmentId}` : ''}`);

    return NextResponse.json({
      success: true,
      data: rules.map(r => r.toJSON()),
      count: rules.length
    });
  } catch (error: any) {
    console.error('❌ Error in constraints API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        data: []
      },
      { status: 500 }
    );
  }
}
