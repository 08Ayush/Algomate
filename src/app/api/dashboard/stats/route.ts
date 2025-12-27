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

    console.log('📊 Fetching dashboard stats for user:', user.id, 'Type:', user.faculty_type);

    // Build timetables query based on user type
    let timetablesQuery = supabase
      .from('generated_timetables')
      .select('id, status, fitness_score, constraint_violations, batch_id, batches!inner(department_id)');

    if (user.faculty_type === 'creator') {
      timetablesQuery = timetablesQuery.eq('created_by', user.id);
    } else if (user.faculty_type === 'publisher' && user.department_id) {
      timetablesQuery = timetablesQuery.eq('batches.department_id', user.department_id);
    }

    // Parallelize all database queries for much faster response
    const [
      { data: timetables, error: timetablesError },
      { count: facultyCount },
      { data: tasks },
      { data: classrooms }
    ] = await Promise.all([
      timetablesQuery,
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', user.department_id)
        .eq('role', 'faculty')
        .eq('is_active', true),
      supabase
        .from('timetable_generation_tasks')
        .select('execution_time_seconds')
        .eq('created_by', user.id)
        .eq('status', 'COMPLETED')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('classrooms')
        .select('id')
        .eq('department_id', user.department_id)
        .eq('is_available', true)
    ]);

    if (timetablesError) {
      console.error('❌ Error fetching timetables:', timetablesError);
      throw timetablesError;
    }

    console.log('📋 Found', timetables?.length || 0, 'timetables');

    // Calculate stats from timetables data
    const activeTimetables = timetables?.filter(t => t.status === 'published')?.length || 0;
    const validFitnessScores = timetables?.filter(t => t.fitness_score && t.fitness_score > 0).map(t => t.fitness_score) || [];
    const avgFitnessScore = validFitnessScores.length > 0
      ? validFitnessScores.reduce((a, b) => a + b, 0) / validFitnessScores.length
      : 0;
    
    const avgTime = tasks && tasks.length > 0
      ? tasks.reduce((sum, t) => sum + (t.execution_time_seconds || 0), 0) / tasks.length
      : 0;
    const avgGenerationTime = avgTime > 0 ? `${avgTime.toFixed(1)}s` : '0s';

    const timetablesWithViolations = timetables?.filter(t => 
      t.constraint_violations && Array.isArray(t.constraint_violations) && t.constraint_violations.length > 0
    ).length || 0;
    const totalTimetables = timetables?.length || 0;
    const conflictResolutionRate = totalTimetables > 0
      ? ((totalTimetables - timetablesWithViolations) / totalTimetables) * 100
      : 0;

    // Fetch scheduled classes and classroom usage in parallel if needed
    const timetableIds = timetables?.map(t => t.id) || [];
    const classroomIds = classrooms?.map(c => c.id) || [];
    let totalClasses = 0;
    let usedClassrooms = 0;

    if (timetableIds.length > 0) {
      const [
        { count: classCount },
        { data: usedRooms }
      ] = await Promise.all([
        supabase
          .from('scheduled_classes')
          .select('*', { count: 'exact', head: true })
          .in('timetable_id', timetableIds),
        classroomIds.length > 0
          ? supabase
              .from('scheduled_classes')
              .select('classroom_id')
              .in('timetable_id', timetableIds)
              .in('classroom_id', classroomIds)
          : Promise.resolve({ data: [] })
      ]);

      totalClasses = classCount || 0;
      const uniqueRooms = new Set(usedRooms?.map(r => r.classroom_id) || []);
      usedClassrooms = uniqueRooms.size;
    }

    const roomUtilization = classroomIds.length > 0 && usedClassrooms
      ? (usedClassrooms / classroomIds.length) * 100
      : 0;

    const stats = {
      activeTimetables,
      avgFitnessScore: Math.round(avgFitnessScore),
      facultyCount: facultyCount || 0,
      avgGenerationTime,
      totalClassesScheduled: totalClasses,
      conflictResolutionRate: Math.round(conflictResolutionRate * 10) / 10,
      roomUtilization: Math.round(roomUtilization),
      facultySatisfaction: avgFitnessScore > 0 ? Math.round((avgFitnessScore / 100) * 50) / 10 : 0
    };

    console.log('✅ Dashboard stats:', stats);

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Unexpected error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
