import { serviceDb } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  GetConstraintRulesUseCase,
  SupabaseConstraintRepository
} from '@/modules/timetable';

// Initialize dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const constraintRepo = new SupabaseConstraintRepository(serviceDb as any);
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
