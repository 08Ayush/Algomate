import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authCheck = requireAuth(request);
    if (authCheck instanceof NextResponse) return authCheck;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const courseId = searchParams.get('courseId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user details to verify they are creator/publisher - include department_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role, faculty_type, college_id, course_id, department_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify user is creator or publisher
    if (user.role !== 'faculty' || !['creator', 'publisher'].includes(user.faculty_type)) {
      return NextResponse.json(
        { error: 'Unauthorized: Only creators and publishers can access batches' },
        { status: 403 }
      );
    }

    console.log('🔐 Faculty user authenticated:', {
      userId: user.id,
      role: user.role,
      faculty_type: user.faculty_type,
      college_id: user.college_id,
      course_id: user.course_id,
      department_id: user.department_id
    });

    // Build query for batches with elective buckets
    let batchesQuery = supabase
      .from('batches')
      .select(`
        id,
        name,
        section,
        semester,
        academic_year,
        actual_strength,
        expected_strength,
        is_active,
        course_id,
        college_id,
        department_id,
        created_at,
        course:courses!course_id (
          id,
          title,
          code,
          nature_of_course
        ),
        departments:departments!department_id (
          id,
          name,
          code
        )
      `)
      .eq('college_id', user.college_id)
      .eq('is_active', true);

    // Filter by department for non-admin users (creator AND publisher)
    if (user.department_id) {
      batchesQuery = batchesQuery.eq('department_id', user.department_id);
      console.log('🔍 Filtering batches by department_id:', user.department_id);
    }

    batchesQuery = batchesQuery
      .order('semester', { ascending: true })
      .order('section', { ascending: true });

    // Filter by course if provided
    if (courseId) {
      batchesQuery = batchesQuery.eq('course_id', courseId);
    } else if (user.course_id) {
      // Default to user's course
      batchesQuery = batchesQuery.eq('course_id', user.course_id);
    }

    const { data: batches, error: batchesError } = await batchesQuery;

    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
      return NextResponse.json(
        { error: 'Failed to fetch batches' },
        { status: 500 }
      );
    }

    // For each batch, fetch its elective buckets and subjects
    const batchesWithBuckets = await Promise.all(
      batches.map(async (batch) => {
        // Fetch elective buckets for this batch
        const { data: buckets, error: bucketsError } = await supabase
          .from('elective_buckets')
          .select(`
            id,
            bucket_name,
            max_selection,
            min_selection,
            is_common_slot,
            created_at
          `)
          .eq('batch_id', batch.id)
          .order('bucket_name');

        if (bucketsError) {
          console.error(`Error fetching buckets for batch ${batch.id}:`, bucketsError);
          return { ...batch, buckets: [], totalSubjects: 0 };
        }

        // For each bucket, fetch subjects
        const bucketsWithSubjects = await Promise.all(
          (buckets || []).map(async (bucket) => {
            console.log(`🔍 Fetching subjects for bucket: ${bucket.bucket_name} (ID: ${bucket.id})`);
            console.log(`   Query params: course_group_id=${bucket.id}, college_id=${user.college_id}, is_active=true`);

            // First, check if ANY subjects exist with this course_group_id (without college filter)
            const { data: allSubjectsForBucket, error: checkError } = await supabase
              .from('subjects')
              .select('id, code, name, college_id, course_group_id, is_active')
              .eq('course_group_id', bucket.id);

            console.log(`   📊 Total subjects with course_group_id=${bucket.id}: ${allSubjectsForBucket?.length || 0}`);
            if (allSubjectsForBucket && allSubjectsForBucket.length > 0) {
              console.log(`   📝 Sample subject:`, allSubjectsForBucket[0]);
            }

            // Try WITHOUT college_id filter first to see if subjects exist
            const { data: subjectsWithoutFilter, error: testError } = await supabase
              .from('subjects')
              .select('id, code, name, college_id, is_active')
              .eq('course_group_id', bucket.id);

            console.log(`   🧪 Test query (no filters): ${subjectsWithoutFilter?.length || 0} subjects found`);
            if (subjectsWithoutFilter && subjectsWithoutFilter.length > 0) {
              console.log(`      Sample: ${subjectsWithoutFilter[0].code} - college_id: ${subjectsWithoutFilter[0].college_id}, is_active: ${subjectsWithoutFilter[0].is_active}`);
              console.log(`      Faculty college_id: ${user.college_id}`);
              console.log(`      Match: ${subjectsWithoutFilter[0].college_id === user.college_id}`);
            }

            const { data: subjects, error: subjectsError } = await supabase
              .from('subjects')
              .select(`
                id,
                code,
                name,
                credit_value,
                lecture_hours,
                tutorial_hours,
                practical_hours,
                subject_type,
                nep_category,
                course_group_id,
                college_id,
                description,
                is_active
              `)
              .eq('course_group_id', bucket.id)
              .eq('college_id', user.college_id)
              .eq('is_active', true)
              .order('code');

            if (subjectsError) {
              console.error(`❌ Error fetching subjects for bucket ${bucket.id}:`, subjectsError);
              return { ...bucket, subjects: [], subjectCount: 0 };
            }

            console.log(`  ✅ Found ${subjects?.length || 0} subjects for bucket ${bucket.bucket_name} (with college_id filter)`);
            if (subjects && subjects.length > 0) {
              console.log(`     Sample subject:`, subjects[0]);
            }

            return {
              ...bucket,
              subjects: subjects || [],
              subjectCount: subjects?.length || 0
            };
          })
        );

        const totalSubjects = bucketsWithSubjects.reduce(
          (sum, bucket) => sum + bucket.subjectCount,
          0
        );

        const bucketsCount = bucketsWithSubjects.length;

        return {
          ...batch,
          buckets: bucketsWithSubjects,
          bucketsCount,
          totalSubjects
        };
      })
    );

    // Calculate statistics
    const statistics = {
      totalBatches: batchesWithBuckets.length,
      totalBuckets: batchesWithBuckets.reduce((sum, b: any) => sum + (b.bucketsCount || 0), 0),
      totalSubjects: batchesWithBuckets.reduce((sum, b: any) => sum + (b.totalSubjects || 0), 0),
      totalStudents: batchesWithBuckets.reduce((sum, b: any) => sum + (b.actual_strength || 0), 0),
      bySemester: batchesWithBuckets.reduce((acc: any, batch: any) => {
        const sem = batch.semester;
        if (!acc[sem]) {
          acc[sem] = { batches: 0, buckets: 0, subjects: 0 };
        }
        acc[sem].batches += 1;
        acc[sem].buckets += (batch.bucketsCount || 0);
        acc[sem].subjects += (batch.totalSubjects || 0);
        return acc;
      }, {} as Record<number, { batches: number; buckets: number; subjects: number }>)
    };

    return NextResponse.json({
      success: true,
      batches: batchesWithBuckets,
      statistics
    });

  } catch (error) {
    console.error('Error in NEP batches API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
