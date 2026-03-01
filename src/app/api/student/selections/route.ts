import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/shared/database';
import { SupabaseStudentCourseSelectionRepository } from '@/modules/nep-curriculum/infrastructure/persistence/SupabaseStudentCourseSelectionRepository';
import { SupabaseSubjectRepository } from '@/modules/nep-curriculum/infrastructure/persistence/SupabaseSubjectRepository';
import { GetStudentSelectionsUseCase } from '@/modules/nep-curriculum/application/use-cases/GetStudentSelectionsUseCase';
import { SaveStudentSelectionUseCase } from '@/modules/nep-curriculum/application/use-cases/SaveStudentSelectionUseCase';
import { DeleteStudentSelectionUseCase } from '@/modules/nep-curriculum/application/use-cases/DeleteStudentSelectionUseCase';
import { handleError } from '@/shared/utils/response';
import { requireAuth } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// GET - Fetch student's course selections
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const semester = searchParams.get('semester');
    const academicYear = searchParams.get('academicYear');

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const selectionRepo = new SupabaseStudentCourseSelectionRepository(supabase);
    const subjectRepo = new SupabaseSubjectRepository(supabase);
    const getSelectionsUseCase = new GetStudentSelectionsUseCase(selectionRepo, subjectRepo);

    const selections = await getSelectionsUseCase.execute(
      studentId,
      semester ? parseInt(semester) : undefined,
      academicYear || undefined
    );

    return NextResponse.json({
      selections: selections,
      count: selections.length
    });

  } catch (error) {
    return handleError(error);
  }
}

// POST - Add new course selection
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { student_id, subject_id, semester, academic_year } = body;

    // Basic validation
    if (!student_id || !subject_id || !semester || !academic_year) {
      return NextResponse.json({
        error: 'Missing required fields: student_id, subject_id, semester, academic_year'
      }, { status: 400 });
    }

    const selectionRepo = new SupabaseStudentCourseSelectionRepository(supabase);
    const subjectRepo = new SupabaseSubjectRepository(supabase);
    const saveSelectionUseCase = new SaveStudentSelectionUseCase(selectionRepo, subjectRepo);

    const selection = await saveSelectionUseCase.execute({
      studentId: student_id,
      subjectId: subject_id,
      semester: parseInt(semester),
      academicYear: academic_year
    });

    // Check if selection caused a lock (or if it's returned as locked)
    if (selection.isLocked) {
      // Notify Student
      try {
        // We need bucket name. Fetch from DB.
        const { data: subjectData } = await supabase
          .from('subjects')
          .select('course_group_id, course_groups:elective_buckets!course_group_id(bucket_name)')
          .eq('id', subject_id)
          .single();

        const bucketName = (subjectData as any)?.course_groups?.bucket_name || 'Elective Bucket';

        const { notifyNEPSelectionLocked } = await import('@/lib/notificationService');
        await notifyNEPSelectionLocked({
          studentId: student_id,
          bucketName: bucketName
        });
      } catch (loErr) {
        console.error('Lock notification error:', loErr);
      }
    }

    // Use Case doesn't verify DB constraints like triggers do, but internal logic mimics it.
    // Return matching structure
    return NextResponse.json({
      selection: selection.toJSON(),
      message: 'Subject selected successfully',
      is_locked: selection.isLocked,
      selection_type: selection.selectionType
    }, { status: 201 });

  } catch (error: any) {
    // Handle specific errors for friendly messages
    if (error.message.includes('Cannot change MAJOR')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message.includes('Subject already selected')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return handleError(error);
  }
}

// DELETE - Remove course selection
export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { student_id, subject_id } = body;

    if (!student_id || !subject_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const selectionRepo = new SupabaseStudentCourseSelectionRepository(supabase);
    const deleteSelectionUseCase = new DeleteStudentSelectionUseCase(selectionRepo);

    await deleteSelectionUseCase.execute(student_id, subject_id);

    return NextResponse.json({
      message: 'Subject selection removed successfully'
    });

  } catch (error: any) {
    if (error.message.includes('Cannot delete')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return handleError(error);
  }
}