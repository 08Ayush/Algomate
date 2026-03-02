import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const semester = searchParams.get('semester');
    const nepCategory = searchParams.get('nepCategory');

    // Build query
    let query = supabase
      .from('subjects')
      .select('*')
      .eq('college_id', user.college_id);

    if (courseId) query = query.eq('course_id', courseId);
    if (semester) query = query.eq('semester', parseInt(semester));
    if (nepCategory) query = query.eq('nep_category', nepCategory);

    const { data, error } = await query.order('name');

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching NEP subjects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}