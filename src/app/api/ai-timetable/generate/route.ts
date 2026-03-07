import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { TimetableGenerationService } from '@/modules/timetable';
import { getPool } from '@/lib/db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const generationService = new TimetableGenerationService();

// Generate AI Timetable
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { semester, department_id, batch_id, academic_year } = body;

    // Use college_id from authenticated user for college-scoped queries
    const college_id = user.college_id;

    console.log('🤖 AI Timetable Generation Request (Modular)', { semester, department_id, batch_id, college_id });

    // 1. Fetch subjects
    const { data: subjects } = await supabase
      .from('subjects')
      .select('*')
      .eq('department_id', department_id)
      .eq('semester', semester)
      .eq('is_active', true);

    // 2. Fetch qualified faculty — raw SQL because the NeonClient compat shim
    //    strips nested relation syntax (e.g. "faculty:users!(...)") to just '*'
    const subjectIds = subjects?.map((s: any) => s.id) || [];
    let facultyQualifications: any[] = [];
    if (subjectIds.length > 0) {
      const pool = getPool();
      const fqResult = await pool.query(
        `SELECT
           fqs.id,
           fqs.faculty_id,
           fqs.subject_id,
           fqs.proficiency_level,
           json_build_object(
             'id', u.id,
             'first_name', u.first_name,
             'last_name', u.last_name,
             'email', u.email,
             'max_hours_per_day', u.max_hours_per_day,
             'max_hours_per_week', u.max_hours_per_week
           ) AS faculty
         FROM faculty_qualified_subjects fqs
         JOIN users u ON u.id = fqs.faculty_id
         WHERE fqs.subject_id = ANY($1::uuid[])`,
        [subjectIds]
      );
      facultyQualifications = fqResult.rows;
    }

    // 3. Fetch classrooms scoped to the college (schema uses college_id, not department_id)
    const { data: allClassrooms } = await supabase
      .from('classrooms')
      .select('*')
      .eq('college_id', college_id)
      .eq('is_available', true);

    const labs = allClassrooms?.filter((room: any) => room.has_lab_equipment === true) || [];
    const classrooms = allClassrooms?.filter((room: any) => room.has_lab_equipment !== true) || [];

    // 4. Fetch batch info
    let batchInfo = null;
    if (batch_id) {
      const { data: batch } = await supabase.from('batches').select('*').eq('id', batch_id).single();
      batchInfo = batch;
    }

    // 5. Generate
    const generatedTimetable = generationService.generate({
      subjects: subjects || [],
      facultyQualifications: facultyQualifications || [],
      classrooms: classrooms || [],
      labs: labs || [],
      semester,
      batchInfo
    });

    console.log(`✅ Generated timetable with ${generatedTimetable.schedule.length} assignments`);

    return NextResponse.json({
      success: true,
      data: {
        semester,
        academic_year: academic_year || '2025-26',
        subjects: subjects || [],
        faculty: extractUniqueFaculty(facultyQualifications || []),
        classrooms: classrooms || [],
        labs: labs || [],
        schedule: generatedTimetable.schedule,
        statistics: generatedTimetable.statistics,
        conflicts: generatedTimetable.conflicts
      }
    });

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

function extractUniqueFaculty(qualifications: any[]) {
  const facultyMap = new Map();
  qualifications.forEach((qual: any) => {
    const faculty = Array.isArray(qual.faculty) ? qual.faculty[0] : qual.faculty;
    if (faculty && !facultyMap.has(faculty.id)) {
      facultyMap.set(faculty.id, {
        id: faculty.id,
        name: `${faculty.first_name} ${faculty.last_name}`,
        email: faculty.email
      });
    }
  });
  return Array.from(facultyMap.values());
}
