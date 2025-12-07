import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    // Try to get authenticated user first
    let user = await getAuthenticatedUser(request);
    
    // If no auth header, try to get user from query params for student dashboard access
    if (!user) {
      const { searchParams } = new URL(request.url);
      const studentId = searchParams.get('studentId');
      
      if (studentId) {
        console.log('Attempting fallback authentication for student:', studentId);
        const supabase = createClient();
        
        const { data: studentUser, error } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            email,
            role,
            college_id,
            is_active,
            colleges (
              id,
              name
            )
          `)
          .eq('id', studentId)
          .eq('is_active', true)
          .single();
        
        if (!error && studentUser) {
          user = {
            id: studentUser.id,
            email: studentUser.email,
            name: `${studentUser.first_name} ${studentUser.last_name}`,
            role: studentUser.role,
            college_id: studentUser.college_id,
            college_name: Array.isArray(studentUser.colleges) ? studentUser.colleges[0]?.name : studentUser.colleges?.name
          };
          console.log('Fallback authentication successful for student');
        }
      }
      
      // If still no user, return error
      if (!user) {
        console.error('Authentication failed for NEP buckets API');
        return NextResponse.json({ 
          error: 'Authentication required', 
          message: 'Please log in to access buckets data',
          code: 'AUTH_REQUIRED'
        }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const semester = searchParams.get('semester');

    if (!courseId || !semester) {
      return NextResponse.json(
        { error: 'Course ID and semester are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // First, find the batch for this college, course_id, and semester
    const { data: batchData, error: batchError } = await supabase
      .from('batches')
      .select('id, name, semester, college_id, course_id')
      .eq('college_id', user.college_id)
      .eq('semester', parseInt(semester))
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();

    if (batchError || !batchData) {
      console.log(`No batch found for college ${user.college_id}, courseId ${courseId}, semester ${semester}`);
      return NextResponse.json([]);
    }

    // Fetch buckets for this batch with batch information joined
    const { data: bucketsData, error: bucketsError } = await supabase
      .from('elective_buckets')
      .select(`
        *,
        batches (
          id,
          name,
          semester,
          college_id,
          academic_year
        )
      `)
      .eq('batch_id', batchData.id);

    if (bucketsError) {
      console.error('Database error fetching buckets:', bucketsError);
      return NextResponse.json({ error: 'Failed to fetch buckets' }, { status: 500 });
    }

    // Fetch subjects for each bucket
    const bucketsWithSubjects = await Promise.all(
      (bucketsData || []).map(async (bucket: any) => {
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
            nep_category,
            course_group_id
          `)
          .eq('course_group_id', bucket.id)
          .eq('college_id', user.college_id); // Additional security check

        if (subjectsError) {
          console.error('Error fetching subjects for bucket:', subjectsError);
          return {
            ...bucket,
            subjects: [],
          };
        }

        // Add batch info to bucket and clean up the response
        const cleanBucket = {
          id: bucket.id,
          bucket_name: bucket.bucket_name,
          min_selection: bucket.min_selection,
          max_selection: bucket.max_selection,
          is_common_slot: bucket.is_common_slot,
          batch_id: bucket.batch_id,
          created_at: bucket.created_at,
          updated_at: bucket.updated_at,
          // Add batch info for reference
          batch_info: bucket.batches,
          subjects: subjects || [],
        };
        
        return cleanBucket;
      })
    );

    console.log(`Found ${bucketsWithSubjects.length} buckets for batch ${batchData.id}, courseId ${courseId}, semester ${semester}`);

    return NextResponse.json(bucketsWithSubjects);
  } catch (error) {
    console.error('Error in GET /api/nep/buckets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bucket_name, courseId, semester } = body;

    // Check if this is a single bucket creation or bulk save
    const isBulkSave = body.buckets !== undefined;

    if (isBulkSave) {
      // Handle bulk save (existing logic)
      return handleBulkSave(request, user, body);
    }

    // Handle single bucket creation
    if (!bucket_name || !courseId || !semester) {
      return NextResponse.json(
        { error: 'Bucket name, course ID, and semester are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Find or create batch for this course and semester
    let { data: batchData, error: batchError } = await supabase
      .from('batches')
      .select('id, name, department_id, course_id')
      .eq('college_id', user.college_id)
      .eq('semester', parseInt(semester))
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();

    if (batchError || !batchData) {
      // Create batch if it doesn't exist
      const { data: deptData } = await supabase
        .from('departments')
        .select('id, name')
        .eq('college_id', user.college_id)
        .limit(1)
        .single();

      if (!deptData) {
        return NextResponse.json({ error: 'No department found' }, { status: 500 });
      }

      const { data: courseData } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single();

      const { data: newBatch, error: createBatchError } = await supabase
        .from('batches')
        .insert({
          name: `${courseData?.title || 'Course'} - Semester ${semester}`,
          college_id: user.college_id,
          department_id: deptData.id,
          course_id: courseId,
          semester: parseInt(semester),
          academic_year: '2025-26',
          is_active: true
        })
        .select()
        .single();

      if (createBatchError) {
        console.error('Error creating batch:', createBatchError);
        return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
      }
      batchData = newBatch;
    }

    // Create the new bucket
    const { data: newBucket, error: bucketError } = await supabase
      .from('elective_buckets')
      .insert({
        batch_id: batchData.id,
        bucket_name: bucket_name,
        is_common_slot: true,
        min_selection: 1,
        max_selection: 1,
      })
      .select()
      .single();

    if (bucketError) {
      console.error('Error creating bucket:', bucketError);
      return NextResponse.json({ error: 'Failed to create bucket' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Bucket created successfully',
      bucket: {
        id: newBucket.id,
        bucket_name: newBucket.bucket_name,
        is_common_slot: newBucket.is_common_slot,
        min_selection: newBucket.min_selection,
        max_selection: newBucket.max_selection,
        batch_id: newBucket.batch_id,
        subjects: []
      }
    });
  } catch (error) {
    console.error('Error in POST /api/nep/buckets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleBulkSave(request: NextRequest, user: any, body: any) {
  try {
    const { buckets, availableSubjects, courseId, semester } = body;

    if (!courseId || !semester || !Array.isArray(buckets)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // First, find or create the batch for this college, course_id, and semester
    let { data: batchData, error: batchError } = await supabase
      .from('batches')
      .select('id, name, department_id, course_id')
      .eq('college_id', user.college_id)
      .eq('semester', parseInt(semester))
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();

    if (batchError || !batchData) {
      // Try to create a batch if it doesn't exist
      // For B.Ed courses, try to find Education department or any active department
      let { data: deptData } = await supabase
        .from('departments')
        .select('id, name')
        .eq('college_id', user.college_id)
        .or('name.ilike.%education%,name.ilike.%teacher%,name.ilike.%b.ed%')
        .single();

      // If no education department found, get the first available department
      if (!deptData) {
        const { data: firstDept } = await supabase
          .from('departments')
          .select('id, name')
          .eq('college_id', user.college_id)
          .limit(1)
          .single();
        deptData = firstDept;
      }

      if (deptData) {
        // Get course title for batch name
        const { data: courseData } = await supabase
          .from('courses')
          .select('title')
          .eq('id', courseId)
          .single();

        const { data: newBatch, error: createBatchError } = await supabase
          .from('batches')
          .insert({
            name: `${courseData?.title || 'Course'} - Semester ${semester}`,
            college_id: user.college_id,
            department_id: deptData.id,
            course_id: courseId,
            semester: parseInt(semester),
            academic_year: '2025-26',
            is_active: true
          })
          .select()
          .single();

        if (createBatchError) {
          console.error('Error creating batch:', createBatchError);
          return NextResponse.json({ error: 'Failed to create batch for curriculum' }, { status: 500 });
        }
        batchData = newBatch;
      } else {
        return NextResponse.json({ error: 'No suitable department found for creating batch' }, { status: 500 });
      }
    }

    // Delete existing buckets for this batch
    const { error: deleteError } = await supabase
      .from('elective_buckets')
      .delete()
      .eq('batch_id', batchData.id);

    if (deleteError) {
      console.error('Error deleting existing buckets:', deleteError);
      return NextResponse.json({ error: 'Failed to update buckets' }, { status: 500 });
    }

    // Insert new buckets
    for (const bucket of buckets) {
      const { data: bucketData, error: bucketError } = await supabase
        .from('elective_buckets')
        .insert({
          batch_id: batchData.id,
          bucket_name: bucket.bucket_name,
          is_common_slot: bucket.is_common_slot || true,
          min_selection: bucket.min_selection || 1,
          max_selection: bucket.max_selection || 1,
        })
        .select()
        .single();

      if (bucketError) {
        console.error('Error creating bucket:', bucketError);
        return NextResponse.json({ error: 'Failed to create bucket' }, { status: 500 });
      }

      // Update subjects to link to bucket
      if (bucket.subjects.length > 0 && bucketData) {
        const { error: updateError } = await supabase
          .from('subjects')
          .update({ course_group_id: bucketData.id })
          .in('id', bucket.subjects.map((s: any) => s.id))
          .eq('college_id', user.college_id); // Additional security check

        if (updateError) {
          console.error('Error linking subjects to bucket:', updateError);
          return NextResponse.json({ error: 'Failed to link subjects' }, { status: 500 });
        }
      }
    }

    // Reset course_group_id for available subjects
    if (availableSubjects && availableSubjects.length > 0) {
      const { error: resetError } = await supabase
        .from('subjects')
        .update({ course_group_id: null })
        .in('id', availableSubjects.map((s: any) => s.id))
        .eq('college_id', user.college_id); // Additional security check

      if (resetError) {
        console.error('Error resetting subjects:', resetError);
        return NextResponse.json({ error: 'Failed to reset subjects' }, { status: 500 });
      }
    }

    console.log(`Successfully saved curriculum for batch ${batchData.id}, courseId ${courseId}, semester ${semester}`);

    return NextResponse.json({ success: true, message: 'Curriculum saved successfully' });
  } catch (error) {
    console.error('Error in handleBulkSave:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}