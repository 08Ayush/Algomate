import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Import the allotment algorithm
const runDynamicAllotment = (students: any[], subjects: any[], config: any = {}) => {
  const results = {
    allotted: [] as Array<{ studentId: string; subjectId: string; prefRank: number; cgpa: number }>,
    rejected: [] as Array<{ studentId: string; reason: string }>,
    subjectStats: {} as Record<string, number>
  };

  // 1. Initialize Subject Capacities
  const subjectPool = new Map(subjects.map((s: any) => [s.id, {
    ...s,
    currentSeats: s.max_capacity || s.maxCapacity || 50
  }]));

  // 2. Build the Global Priority Queue
  let applicationQueue: Array<{
    studentId: string;
    studentCgpa: number;
    timestamp: number;
    subjectId: string;
    preferenceRank: number;
  }> = [];

  students.forEach((student: any) => {
    student.preferences.forEach((subId: string, index: number) => {
      const subject = subjectPool.get(subId);

      if (!subject) return;

      // Rule: Cannot take elective from own department (if configured)
      if (config.allowSameDept === false && student.departmentId === subject.department_id) {
        return;
      }

      applicationQueue.push({
        studentId: student.id,
        studentCgpa: student.cgpa,
        timestamp: new Date(student.submittedAt).getTime(),
        subjectId: subId,
        preferenceRank: index + 1
      });
    });
  });

  // 3. Sort: Priority first, then CGPA (desc), then Timestamp (asc)
  applicationQueue.sort((a, b) => {
    if (a.preferenceRank !== b.preferenceRank)
      return a.preferenceRank - b.preferenceRank;

    if (b.studentCgpa !== a.studentCgpa)
      return b.studentCgpa - a.studentCgpa;

    return a.timestamp - b.timestamp;
  });

  // 4. Allotment Loop
  const processedStudents = new Set<string>();

  for (const app of applicationQueue) {
    const subject = subjectPool.get(app.subjectId);

    if (!processedStudents.has(app.studentId) && subject && subject.currentSeats > 0) {
      results.allotted.push({
        studentId: app.studentId,
        subjectId: app.subjectId,
        prefRank: app.preferenceRank,
        cgpa: app.studentCgpa
      });

      subject.currentSeats -= 1;
      processedStudents.add(app.studentId);

      // Track subject stats
      if (!results.subjectStats[app.subjectId]) {
        results.subjectStats[app.subjectId] = 0;
      }
      results.subjectStats[app.subjectId]++;
    }
  });

  // 5. Identify Rejected Students
  students.forEach((s: any) => {
    if (!processedStudents.has(s.id)) {
      results.rejected.push({ studentId: s.id, reason: "Capacities Full / Rules Violated" });
    }
  });

  return results;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { bucket_id } = body;

    if (!bucket_id) {
      return NextResponse.json({ error: 'Bucket ID is required' }, { status: 400 });
    }

    // Fetch bucket info
    const { data: bucket, error: bucketError } = await supabase
      .from('elective_buckets')
      .select('*, batches:batches!elective_buckets_batch_id_fkey(semester, academic_year)')
      .eq('id', bucket_id)
      .single();

    if (bucketError || !bucket) {
      return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
    }

    // Fetch all student choices for this bucket
    const { data: choices, error: choicesError } = await supabase
      .from('student_subject_choices')
      .select(`
        *,
        users:users!student_subject_choices_student_id_fkey (
          id,
          credit,
          department_id
        ),
        subjects:subjects!student_subject_choices_subject_id_fkey (
          id,
          max_capacity,
          department_id
        )
      `)
      .eq('bucket_id', bucket_id)
      .eq('is_allotted', false)
      .order('created_at', { ascending: true });

    if (choicesError) {
      console.error('Error fetching choices:', choicesError);
      return NextResponse.json({ error: 'Failed to fetch student choices' }, { status: 500 });
    }

    if (!choices || choices.length === 0) {
      return NextResponse.json({ error: 'No student choices found for this bucket' }, { status: 400 });
    }

    // Group choices by student
    const studentMap = new Map<string, any>();

    choices.forEach((choice: any) => {
      const studentId = choice.student_id;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          id: studentId,
          cgpa: parseFloat(choice.users?.credit || '0'),
          departmentId: choice.users?.department_id || null,
          submittedAt: choice.created_at,
          preferences: [] as string[]
        });
      }
      const student = studentMap.get(studentId);
      // Add subject ID in priority order
      student.preferences.push(choice.subject_id);
    });

    // Sort preferences by priority for each student
    studentMap.forEach((student, studentId) => {
      const studentChoices = choices
        .filter((c: any) => c.student_id === studentId)
        .sort((a: any, b: any) => a.priority - b.priority);
      student.preferences = studentChoices.map((c: any) => c.subject_id);
    });

    // Get all unique subjects with their capacities
    const subjectIds = [...new Set(choices.map((c: any) => c.subject_id))];
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, max_capacity, department_id')
      .in('id', subjectIds);

    if (subjectsError) {
      console.error('Error fetching subjects:', subjectsError);
      return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
    }

    // Prepare subjects for algorithm
    const subjects = (subjectsData || []).map((s: any) => ({
      id: s.id,
      maxCapacity: s.max_capacity || 50,
      department_id: s.department_id
    }));

    // Run the allotment algorithm
    const students = Array.from(studentMap.values());
    const results = runDynamicAllotment(students, subjects, { allowSameDept: false });

    // Update database: Mark choices as allotted
    if (results.allotted.length > 0) {
      const allottedUpdates = results.allotted.map(a => ({
        student_id: a.studentId,
        subject_id: a.subjectId,
        bucket_id: bucket_id
      }));

      // Update student_subject_choices table
      for (const allotment of results.allotted) {
        const { error: updateError } = await supabase
          .from('student_subject_choices')
          .update({
            is_allotted: true,
            allotted_at: new Date().toISOString()
          })
          .eq('student_id', allotment.studentId)
          .eq('subject_id', allotment.subjectId)
          .eq('bucket_id', bucket_id);

        if (updateError) {
          console.error('Error updating choice:', updateError);
        }
      }

      // Also update student_course_selections table for final enrollment
      const batch = bucket.batches as any;
      if (batch) {
        for (const allotment of results.allotted) {
          // Check if already exists
          const { data: existing } = await supabase
            .from('student_course_selections')
            .select('id')
            .eq('student_id', allotment.studentId)
            .eq('subject_id', allotment.subjectId)
            .eq('semester', batch.semester)
            .eq('academic_year', batch.academic_year)
            .single();

          if (!existing) {
            // Get subject details for selection_type
            const { data: subjectData } = await supabase
              .from('subjects')
              .select('nep_category')
              .eq('id', allotment.subjectId)
              .single();

            let selectionType = 'ELECTIVE';
            if (subjectData?.nep_category && ['MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR'].includes(subjectData.nep_category)) {
              selectionType = 'MAJOR';
            } else if (subjectData?.nep_category && ['MINOR', 'CORE MINOR'].includes(subjectData.nep_category)) {
              selectionType = 'MINOR';
            } else if (subjectData?.nep_category && ['CORE', 'CORE PARTIAL'].includes(subjectData.nep_category)) {
              selectionType = 'CORE';
            }

            await supabase
              .from('student_course_selections')
              .insert({
                student_id: allotment.studentId,
                subject_id: allotment.subjectId,
                semester: batch.semester,
                academic_year: batch.academic_year,
                selection_type: selectionType
              });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      allotted: results.allotted.length,
      rejected: results.rejected.length,
      details: {
        allotted: results.allotted,
        rejected: results.rejected,
        subjectStats: results.subjectStats
      }
    });

  } catch (error: any) {
    console.error('Error running allotment:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

