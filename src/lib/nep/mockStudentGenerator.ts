import { serviceDb as supabase } from '@/shared/database';
import { createClient } from '@/shared/database/browser';

interface GenerateStudentsParams {
  batchId: string;
  count: number;
  bucketIds: string[];
}

interface MockStudent {
  email: string;
  password: string;
  name: string;
  role: string;
  college_id: string;
  department_id: string;
}

/**
 * Generate mock students with random Major/Minor selections
 * for testing the NEP scheduler
 */
export async function generateMockStudents({
  batchId,
  count,
  bucketIds,
}: GenerateStudentsParams): Promise<{ success: boolean; message: string; students?: MockStudent[] }> {
  
  try {
    // 1. Fetch batch details
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*, college:colleges(*), department:departments(*)')
      .eq('id', batchId)
      .single() as any;

    if (batchError || !batch) {
      return { success: false, message: 'Batch not found' };
    }

    // 2. Fetch elective buckets and their subjects
    const { data: bucketsData, error: bucketsError } = await supabase
      .from('elective_buckets')
      .select('*, subjects(*)')
      .in('id', bucketIds);

    if (bucketsError || !bucketsData || bucketsData.length === 0) {
      return { success: false, message: 'No elective buckets found' };
    }

    const buckets = await Promise.all(
      bucketsData.map(async (bucket: any) => {
        const { data: subjects } = await supabase
          .from('subjects')
          .select('*')
          .eq('course_group_id', bucket.id);
        
        return {
          ...bucket,
          subjects: subjects || [],
        };
      })
    );

    // 3. Generate mock students
    const mockStudents: MockStudent[] = [];
    const createdUserIds: string[] = [];

    for (let i = 1; i <= count; i++) {
      const studentName = `Test Student ${i}`;
      const studentEmail = `student${i}.${batch.name.toLowerCase().replace(/\s+/g, '')}@test.edu`;
      const studentPassword = 'TestPassword123!';

      mockStudents.push({
        email: studentEmail,
        password: studentPassword,
        name: studentName,
        role: 'student',
        college_id: batch.college_id,
        department_id: batch.department_id,
      });

      // Insert user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          email: studentEmail,
          name: studentName,
          role: 'student',
          college_id: batch.college_id,
          department_id: batch.department_id,
          is_active: true,
        } as any)
        .select()
        .single() as any;

      if (userError) {
        console.error(`Failed to create user ${studentEmail}:`, userError);
        continue;
      }

      createdUserIds.push(userData.id);

      // 4. Randomly select subjects from each bucket
      for (const bucket of buckets) {
        if (bucket.subjects.length === 0) continue;

        // Randomly select between min and max subjects
        const numToSelect = Math.floor(
          Math.random() * (bucket.max_selection - bucket.min_selection + 1)
        ) + bucket.min_selection;

        // Shuffle subjects and take numToSelect
        const shuffled = [...bucket.subjects].sort(() => 0.5 - Math.random());
        const selectedSubjects = shuffled.slice(0, Math.min(numToSelect, bucket.subjects.length));

        // Insert student course selections
        const selections = selectedSubjects.map((subject) => ({
          student_id: userData.id,
          subject_id: subject.id,
          semester: batch.semester,
          academic_year: new Date().getFullYear().toString(),
        }));

        const { error: selectionError } = await supabase
          .from('student_course_selections')
          .insert(selections as any);

        if (selectionError) {
          console.error(`Failed to create selections for ${studentEmail}:`, selectionError);
        }
      }

      // 5. Link student to batch
      const { error: batchStudentError } = await supabase
        .from('batch_students')
        .insert({
          batch_id: batchId,
          student_id: userData.id,
        } as any);

      if (batchStudentError) {
        console.error(`Failed to link student to batch:`, batchStudentError);
      }
    }

    return {
      success: true,
      message: `Successfully generated ${count} mock students with random course selections`,
      students: mockStudents,
    };
  } catch (error) {
    console.error('Error generating mock students:', error);
    return {
      success: false,
      message: `Failed to generate students: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Delete all mock students (for cleanup)
 */
export async function deleteMockStudents(batchId: string): Promise<{ success: boolean; message: string }> {
  
  try {
    // 1. Find all students in batch with test email pattern
    const { data: batchStudents, error: fetchError } = await supabase
      .from('batch_students')
      .select('student_id, users!inner(email)')
      .eq('batch_id', batchId);

    if (fetchError) throw fetchError;

    const testStudentIds = batchStudents
      ?.filter((bs: any) => bs.users.email.includes('@test.edu'))
      .map((bs: any) => bs.student_id) || [];

    if (testStudentIds.length === 0) {
      return { success: true, message: 'No mock students found to delete' };
    }

    // 2. Delete student course selections
    await supabase
      .from('student_course_selections')
      .delete()
      .in('student_id', testStudentIds);

    // 3. Delete batch_students links
    await supabase
      .from('batch_students')
      .delete()
      .in('student_id', testStudentIds);

    // 4. Delete users
    await supabase
      .from('users')
      .delete()
      .in('id', testStudentIds);

    return {
      success: true,
      message: `Deleted ${testStudentIds.length} mock students`,
    };
  } catch (error) {
    console.error('Error deleting mock students:', error);
    return {
      success: false,
      message: `Failed to delete students: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get statistics about student selections
 */
export async function getStudentSelectionStats(batchId: string) {
  
  try {
    // Get all students in batch
    const { data: batchStudents } = await supabase
      .from('batch_students')
      .select('student_id')
      .eq('batch_id', batchId);

    if (!batchStudents || batchStudents.length === 0) {
      return { totalStudents: 0, selections: [] };
    }

    const studentIds = batchStudents.map((bs: any) => bs.student_id);

    // Get all selections
    const { data: selections } = await supabase
      .from('student_course_selections')
      .select('subject_id, subjects(code, name)')
      .in('student_id', studentIds);

    // Count selections per subject
    const subjectCounts: Record<string, { code: string; name: string; count: number }> = {};

    selections?.forEach((selection: any) => {
      const subjectId = selection.subject_id;
      if (!subjectCounts[subjectId]) {
        subjectCounts[subjectId] = {
          code: selection.subjects.code,
          name: selection.subjects.name,
          count: 0,
        };
      }
      subjectCounts[subjectId].count++;
    });

    return {
      totalStudents: studentIds.length,
      selections: Object.values(subjectCounts).sort((a, b) => b.count - a.count),
    };
  } catch (error) {
    console.error('Error getting selection stats:', error);
    return { totalStudents: 0, selections: [] };
  }
}
