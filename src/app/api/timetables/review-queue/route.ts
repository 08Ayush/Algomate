import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get authenticated user from token
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
      .select('id, department_id, college_id, role, faculty_type, is_active')
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
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Only publishers can access the review queue
    if (user.faculty_type !== 'publisher') {
      return NextResponse.json(
        { success: false, error: 'Only publishers can access the review queue.' },
        { status: 403 }
      );
    }

    if (!user.department_id) {
      console.error('❌ User has no department_id:', { userId: user.id, role: user.role, faculty_type: user.faculty_type });
      return NextResponse.json(
        { success: false, error: 'No department assigned to user.' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching pending timetables for review from department:', user.department_id);
    console.log('👤 Publisher user details:', { id: user.id, department_id: user.department_id, faculty_type: user.faculty_type });

    // First, get all batches for this department
    const { data: departmentBatches, error: batchError } = await supabase
      .from('batches')
      .select('id, name, semester, section, academic_year')
      .eq('department_id', user.department_id);

    if (batchError) {
      console.error('❌ Error fetching department batches:', batchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch department batches' },
        { status: 500 }
      );
    }

    const batchIds = departmentBatches?.map(b => b.id) || [];

    if (batchIds.length === 0) {
      console.log('⚠️ No batches found for this department');
      console.log('📊 Department ID:', user.department_id);
      return NextResponse.json({
        success: true,
        timetables: []
      });
    }

    console.log('📦 Found', batchIds.length, 'batches for department:', user.department_id);
    console.log('📋 Batch IDs:', batchIds);

    // Create a map for quick batch lookup
    const batchMap = new Map(departmentBatches?.map(b => [b.id, b]));

    // Fetch timetables with pending_approval status for these batches
    const { data: timetables, error: timetablesError } = await supabase
      .from('generated_timetables')
      .select('*')
      .eq('status', 'pending_approval')
      .in('batch_id', batchIds)
      .order('created_at', { ascending: false });

    if (timetablesError) {
      console.error('❌ Error fetching pending timetables:', timetablesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch pending timetables' },
        { status: 500 }
      );
    }

    console.log('✅ Fetched', timetables?.length || 0, 'pending timetables for this department');
    if (timetables && timetables.length > 0) {
      console.log('📊 Timetable IDs:', timetables.map(t => ({ id: t.id, batch_id: t.batch_id, status: t.status })));
    } else {
      console.log('⚠️ No pending_approval timetables found. Checking if any timetables exist at all...');
      // Debug: Check if there are ANY timetables for these batches
      const { data: allTimetables } = await supabase
        .from('generated_timetables')
        .select('id, status, batch_id')
        .in('batch_id', batchIds);
      console.log('📊 All timetables for these batches:', allTimetables);
    }

    // Enrich timetables with additional details
    const enrichedTimetables = await Promise.all(
      (timetables || []).map(async (tt) => {
        // Get batch info from our map
        const batch = batchMap.get(tt.batch_id);

        // Get creator info
        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name, email')
          .eq('id', tt.created_by)
          .maybeSingle();

        // Get class count
        const { count } = await supabase
          .from('scheduled_classes')
          .select('id', { count: 'exact', head: true })
          .eq('timetable_id', tt.id);

        // Get workflow submission time
        const { data: workflowData } = await supabase
          .from('workflow_approvals')
          .select('performed_at')
          .eq('timetable_id', tt.id)
          .eq('workflow_step', 'submitted_for_review')
          .order('performed_at', { ascending: false })
          .limit(1);

        return {
          ...tt,
          batch: batch ? {
            id: batch.id,
            name: batch.name,
            semester: batch.semester,
            section: batch.section,
            academic_year: batch.academic_year
          } : null,
          creator: userData ? {
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email
          } : null,
          class_count: count || 0,
          submitted_at: workflowData?.[0]?.performed_at || tt.created_at
        };
      })
    );

    return NextResponse.json({
      success: true,
      timetables: enrichedTimetables
    });

  } catch (error) {
    console.error('Unexpected error fetching review queue:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
