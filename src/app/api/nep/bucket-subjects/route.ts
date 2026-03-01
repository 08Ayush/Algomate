import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const bucketId = searchParams.get('bucketId');

    if (!bucketId) {
      return NextResponse.json({ error: 'Bucket ID is required' }, { status: 400 });
    }

    // Fetch subjects that belong to this elective bucket
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select(`
        id,
        code,
        name,
        credit_value,
        nep_category,
        subject_type,
        course_group_id,
        semester,
        description,
        is_active
      `)
      .eq('course_group_id', bucketId)
      .eq('is_active', true)
      .order('code');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
    }

    return NextResponse.json({
      subjects: subjects || [],
      count: subjects?.length || 0
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}