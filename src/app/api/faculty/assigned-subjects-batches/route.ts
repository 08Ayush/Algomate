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

    // Fetch unique batches assigned to this faculty from scheduled_classes
    const { data: scheduledClasses, error: scheduledError } = await supabase
      .from('scheduled_classes')
      .select(`
        batch_id,
        subject_id,
        batches:batch_id (
          id,
          name,
          semester,
          section,
          academic_year
        ),
        subjects:subject_id (
          id,
          name,
          code,
          subject_type
        )
      `)
      .eq('faculty_id', user.user_id);

    if (scheduledError) {
      console.error('Error fetching scheduled classes:', scheduledError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch assigned data: ' + scheduledError.message },
        { status: 500 }
      );
    }

    // Extract unique batches and subjects
    const batchesMap = new Map();
    const subjectsMap = new Map();

    scheduledClasses?.forEach((sc: any) => {
      if (sc.batches && !batchesMap.has(sc.batch_id)) {
        batchesMap.set(sc.batch_id, sc.batches);
      }
      if (sc.subjects && !subjectsMap.has(sc.subject_id)) {
        subjectsMap.set(sc.subject_id, sc.subjects);
      }
    });

    const batches = Array.from(batchesMap.values());
    const subjects = Array.from(subjectsMap.values());

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
