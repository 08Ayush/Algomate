import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      console.error('Authentication failed for NEP subjects API');
      return NextResponse.json({ 
        error: 'Authentication required', 
        message: 'Please log in to access subjects data',
        code: 'AUTH_REQUIRED'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const semester = searchParams.get('semester');
    const bucketId = searchParams.get('bucketId');

    // If bucketId is provided, fetch subjects from that bucket
    if (bucketId) {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('course_group_id', bucketId)
        .eq('is_active', true)
        .order('code');

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Failed to fetch bucket subjects' }, { status: 500 });
      }

      console.log(`Found ${data?.length || 0} subjects for bucket ${bucketId}`);
      return NextResponse.json({ subjects: data || [] });
    }

    if (!courseId || !semester) {
      return NextResponse.json(
        { error: 'Course ID and semester are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Fetch subjects for the authenticated user's college, filtered by course_id
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('college_id', user.college_id)
      .eq('course_id', courseId)
      .eq('semester', parseInt(semester))
      .eq('is_active', true)
      .is('course_group_id', null) // Only subjects not in buckets
      .order('code');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
    }

    console.log(`Found ${data?.length || 0} subjects for college ${user.college_id}, course ${courseId}, semester ${semester}`);

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/nep/subjects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}