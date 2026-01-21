import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '@/shared/middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user || user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    let query = supabase
      .from('student_subject_choices')
      .select(`
        *,
        users!student_id(first_name, last_name, email),
        subjects!subject_id(name, code),
        elective_buckets!bucket_id(bucket_name)
      `);

    if (batchId) {
      query = query.eq('users.batch_id', batchId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching student choices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
