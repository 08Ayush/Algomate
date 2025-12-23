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

    // Fetch timetables based on user type
    let timetablesQuery = supabase
      .from('generated_timetables')
      .select('id, status, fitness_score, constraint_violations, batch_id, batches!inner(department_id)');

    if (user.faculty_type === 'creator') {
      timetablesQuery = timetablesQuery.eq('created_by', user.id);
    } else if (user.faculty_type === 'publisher' && user.department_id) {
      timetablesQuery = timetablesQuery.eq('batches.department_id', user.department_id);
    }

    const { data: timetables, error: timetablesError } = await timetablesQuery;

    if (timetablesError) {
      console.error('❌ Error fetching timetables:', timetablesError);
      throw timetablesError;
    }

    console.log('📋 Found', timetables?.length || 0, 'timetables');

    // Calculate active timetables
    const activeTimetables = timetables?.filter(t => t.status === 'published')?.length || 0;

    // Calculate average fitness score
    const validFitnessScores = timetables?.filter(t => t.fitness_score && t.fitness_score > 0).map(t => t.fitness_score) || [];
    const avgFitnessScore = validFitnessScores.length > 0
      ? validFitnessScores.reduce((a, b) => a + b, 0) / validFitnessScores.length
      : 0;

    // Fetch faculty count in department
    const { count: facultyCount, error: facultyError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', user.department_id)
      .eq('role', 'faculty')
      .eq('is_active', true);

    if (facultyError) {
      console.error('❌ Error fetching faculty count:', facultyError);
    }

    // Fetch generation tasks for average time
    const { data: tasks, error: tasksError } = await supabase
      .from('timetable_generation_tasks')
      .select('execution_time_seconds')
      .eq('created_by', user.id)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(10);

    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError);
    }

    const avgTime = tasks && tasks.length > 0
      ? tasks.reduce((sum, t) => sum + (t.execution_time_seconds || 0), 0) / tasks.length
      : 0;
    const avgGenerationTime = avgTime > 0 ? `${avgTime.toFixed(1)}s` : '0s';

    // Fetch total scheduled classes
    const timetableIds = timetables?.map(t => t.id) || [];
    let totalClasses = 0;
    
    if (timetableIds.length > 0) {
      const { count: classCount, error: classError } = await supabase
        .from('scheduled_classes')
        .select('*', { count: 'exact', head: true })
        .in('timetable_id', timetableIds);

      if (classError) {
        console.error('❌ Error fetching scheduled classes:', classError);
      } else {
        totalClasses = classCount || 0;
      }
    }

    // Calculate conflict resolution rate
    const timetablesWithViolations = timetables?.filter(t => 
      t.constraint_violations && Array.isArray(t.constraint_violations) && t.constraint_violations.length > 0
    ).length || 0;
    const totalTimetables = timetables?.length || 0;
    const conflictResolutionRate = totalTimetables > 0
      ? ((totalTimetables - timetablesWithViolations) / totalTimetables) * 100
      : 0;

    // Fetch classroom utilization
    const { data: classrooms, error: classroomsError } = await supabase
      .from('classrooms')
      .select('id')
      .eq('department_id', user.department_id)
      .eq('is_available', true);

    if (classroomsError) {
      console.error('❌ Error fetching classrooms:', classroomsError);
    }

    const classroomIds = classrooms?.map(c => c.id) || [];
    let usedClassrooms = 0;

    if (classroomIds.length > 0 && timetableIds.length > 0) {
      const { data: usedRooms, error: usedRoomsError } = await supabase
        .from('scheduled_classes')
        .select('classroom_id')
        .in('timetable_id', timetableIds)
        .in('classroom_id', classroomIds);

      if (usedRoomsError) {
        console.error('❌ Error fetching used classrooms:', usedRoomsError);
      } else {
        const uniqueRooms = new Set(usedRooms?.map(r => r.classroom_id) || []);
        usedClassrooms = uniqueRooms.size;
      }
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
