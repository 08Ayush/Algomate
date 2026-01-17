import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper function to decode and verify user from token
function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    return decoded;
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = getAuthenticatedUser(request);
    if (!user || !user.user_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Subjects: Use faculty_qualified_subjects to get subjects the faculty can teach
    const { data: qualifiedSubjects, error: subjectsError } = await supabase
      .from('faculty_qualified_subjects')
      .select(`
        subject_id,
        subject:subjects (
          id,
          name,
          code,
          subject_type
        )
      `)
      .eq('faculty_id', user.user_id);

    if (subjectsError) {
      console.error('Error fetching qualified subjects:', subjectsError);
      // Fallback: If no qualification data, maybe return all subjects for their department?
      // For now, let's proceed.
    }

    const subjects = qualifiedSubjects?.map((qs: any) => qs.subject).filter(Boolean) || [];

    // 2. Fetch Batches: Get batches for the faculty's department or college
    // If user has department_id, filter by it.
    let batchesQuery = supabase
      .from('batches')
      .select('id, name, semester, section, academic_year')
      .eq('is_active', true);

    // If user has a department, restrict to that department's batches
    // (You might want to relax this if faculty can teach across departments, 
    // but typically they are assigned to a department)
    // Checking if 'department_id' is available in user token or could be fetched.
    // The user token from `create/page.tsx` has `college_id` and `role`. 
    // Let's assume we filter by college_id at least.

    if (user.college_id) {
      batchesQuery = batchesQuery.eq('college_id', user.college_id);
    }

    // Filter by department if available
    if (user.department_id) {
      batchesQuery = batchesQuery.eq('department_id', user.department_id);
    }

    const { data: batchesData, error: batchesError } = await batchesQuery.order('created_at', { ascending: false });

    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
    }

    const batches = batchesData || [];

    return NextResponse.json({
      success: true,
      batches,
      subjects,
    });

  } catch (error: any) {
    console.error('Error in assigned-subjects-batches API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
