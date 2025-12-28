// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@/lib/supabase/server';
// import { getAuthenticatedUser } from '@/lib/auth-middleware';

// export async function GET(request: NextRequest) {
//   try {
//     // Try to get authenticated user first
//     let user = await getAuthenticatedUser(request);
    
//     // If no auth header, try to get user from query params for student dashboard access
//     if (!user) {
//       const { searchParams } = new URL(request.url);
//       const studentId = searchParams.get('studentId');
      
//       if (studentId) {
//         console.log('Attempting fallback authentication for student:', studentId);
//         const supabase = createClient();
        
//         const { data: studentUser, error } = await supabase
//           .from('users')
//           .select(`
//             id,
//             first_name,
//             last_name,
//             email,
//             role,
//             college_id,
//             is_active,
//             colleges (
//               id,
//               name
//             )
//           `)
//           .eq('id', studentId)
//           .eq('is_active', true)
//           .single();
        
//         if (!error && studentUser) {
//           const colleges = studentUser.colleges as any;
//           user = {
//             id: studentUser.id,
//             email: studentUser.email,
//             name: `${studentUser.first_name} ${studentUser.last_name}`,
//             role: studentUser.role,
//             college_id: studentUser.college_id,
//             college_name: Array.isArray(colleges) ? colleges[0]?.name : colleges?.name
//           };
//           console.log('Fallback authentication successful for student');
//         }
//       }
      
//       // If still no user, return error
//       if (!user) {
//         console.error('Authentication failed for NEP buckets API');
//         return NextResponse.json({ 
//           error: 'Authentication required', 
//           message: 'Please log in to access buckets data',
//           code: 'AUTH_REQUIRED'
//         }, { status: 401 });
//       }
//     }

//   const { searchParams } = new URL(request.url);
//   const batchId = searchParams.get('batchId');
//   const courseId = searchParams.get('courseId');
//   const semester = searchParams.get('semester');
//   const departmentId = searchParams.get('departmentId');

//   const supabase = createClient();

//   let batchData;
//   let batchError;

//   // Prefer batchId if provided (most reliable)
//   if (batchId) {
//     console.log(`🔍 Looking up batch by batchId: ${batchId}`);
//     const { data, error } = await supabase
//       .from('batches')
//       .select('id, name, semester, college_id, course_id, department_id')
//       .eq('id', batchId)
//       .eq('college_id', user.college_id)
//       .eq('is_active', true)
//       .single();
    
//     batchData = data;
//     batchError = error;
//   } else if (courseId && semester) {
//     // Fallback to course_id + semester lookup
//     console.log(`🔍 Looking up batch by courseId: ${courseId}, semester: ${semester}`);
    
//     // Security check: If user has department_id, verify it matches the requested departmentId
//     const userDeptId = (user as any).department_id;
//     if (userDeptId && departmentId && userDeptId !== departmentId) {
//       return NextResponse.json(
//         { error: 'You can only access buckets for your own department' },
//         { status: 403 }
//       );
//     }

//     // If user has department_id but none provided in request, use user's department
//     const targetDepartmentId = departmentId || userDeptId;

//     // Build query for finding the batch
//     let batchQuery = supabase
//       .from('batches')
//       .select('id, name, semester, college_id, course_id, department_id')
//       .eq('college_id', user.college_id)
//       .eq('semester', parseInt(semester))
//       .eq('is_active', true);

//     // Only filter by course_id if it's provided and not null
//     if (courseId) {
//       batchQuery = batchQuery.eq('course_id', courseId);
//     }

//     // Add department filter (use validated targetDepartmentId)
//     if (targetDepartmentId) {
//       batchQuery = batchQuery.eq('department_id', targetDepartmentId);
//     }

//     const { data, error } = await batchQuery.maybeSingle();
//     batchData = data;
//     batchError = error;
//   } else {
//     return NextResponse.json(
//       { error: 'Either batchId or (courseId + semester) are required' },
//       { status: 400 }
//     );
//   }

//   if (batchError || !batchData) {
//     console.log(`❌ No batch found. Error:`, batchError);
//     return NextResponse.json([]);
//   }

//   console.log(`✅ Found batch: ${batchData.name} (ID: ${batchData.id})`);    // Fetch buckets for this batch with batch information joined
//     const { data: bucketsData, error: bucketsError } = await supabase
//       .from('elective_buckets')
//       .select(`
//         *,
//         batches (
//           id,
//           name,
//           semester,
//           college_id,
//           academic_year
//         )
//       `)
//       .eq('batch_id', batchData.id);

//     if (bucketsError) {
//       console.error('Database error fetching buckets:', bucketsError);
//       return NextResponse.json({ error: 'Failed to fetch buckets' }, { status: 500 });
//     }

//     // Fetch subjects for each bucket
//     const bucketsWithSubjects = await Promise.all(
//       (bucketsData || []).map(async (bucket: any) => {
//         const { data: subjects, error: subjectsError } = await supabase
//           .from('subjects')
//           .select(`
//             id,
//             code,
//             name,
//             credit_value,
//             lecture_hours,
//             tutorial_hours,
//             practical_hours,
//             nep_category,
//             course_group_id
//           `)
//           .eq('course_group_id', bucket.id)
//           .eq('college_id', user.college_id); // Additional security check

//         if (subjectsError) {
//           console.error('Error fetching subjects for bucket:', subjectsError);
//           return {
//             ...bucket,
//             subjects: [],
//           };
//         }

//         // Add batch info to bucket and clean up the response
//         const cleanBucket = {
//           id: bucket.id,
//           bucket_name: bucket.bucket_name,
//           min_selection: bucket.min_selection,
//           max_selection: bucket.max_selection,
//           is_common_slot: bucket.is_common_slot,
//           batch_id: bucket.batch_id,
//           created_at: bucket.created_at,
//           updated_at: bucket.updated_at,
//           // Add batch info for reference
//           batch_info: bucket.batches,
//           subjects: subjects || [],
//         };
        
//         return cleanBucket;
//       })
//     );

//     console.log(`Found ${bucketsWithSubjects.length} buckets for batch ${batchData.id}, courseId ${courseId}, semester ${semester}`);

//     return NextResponse.json(bucketsWithSubjects);
//   } catch (error) {
//     console.error('Error in GET /api/nep/buckets:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const user = await getAuthenticatedUser(request);
//     if (!user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const body = await request.json();
//     const { bucket_name, courseId, semester, departmentId } = body;

//     // Check if this is a single bucket creation or bulk save
//     const isBulkSave = body.buckets !== undefined;

//     if (isBulkSave) {
//       // Handle bulk save (existing logic)
//       return handleBulkSave(request, user, body);
//     }

//     // Handle single bucket creation
//     if (!bucket_name || !courseId || !semester) {
//       return NextResponse.json(
//         { error: 'Bucket name, course ID, and semester are required' },
//         { status: 400 }
//       );
//     }

//     const supabase = createClient();

//     // Security check: If user has department_id, verify it matches the provided departmentId
//     const userDeptId = (user as any).department_id;
//     if (userDeptId && departmentId && userDeptId !== departmentId) {
//       return NextResponse.json(
//         { error: 'You can only create buckets for your own department' },
//         { status: 403 }
//       );
//     }

//     // If user has department_id but none provided in request, use user's department
//     const targetDepartmentId = departmentId || userDeptId;

//     // Build query for finding the batch
//     let batchQuery = supabase
//       .from('batches')
//       .select('id, name, department_id, course_id')
//       .eq('college_id', user.college_id)
//       .eq('semester', parseInt(semester))
//       .eq('course_id', courseId)
//       .eq('is_active', true);

//     // Add optional department filter
//     if (departmentId) {
//       batchQuery = batchQuery.eq('department_id', departmentId);
//     }

//     let { data: batchData, error: batchError } = await batchQuery.single();

//     if (batchError || !batchData) {
//       // Create batch if it doesn't exist - use targetDepartmentId (validated above)
//       let deptId = targetDepartmentId;
//       const userDeptId = (user as any).department_id;
      
//       if (!deptId) {
//         // Only fallback if user doesn't have department_id restriction
//         if (!userDeptId) {
//           const { data: deptData } = await supabase
//             .from('departments')
//             .select('id, name')
//             .eq('college_id', user.college_id)
//             .limit(1)
//             .single();
          
//           deptId = deptData?.id;
          
//           if (!deptId) {
//             return NextResponse.json({ error: 'No department found or specified' }, { status: 500 });
//           }
//         }
//       }

//       if (!deptId) {
//         return NextResponse.json({ error: 'No department found or specified' }, { status: 500 });
//       }

//       const { data: courseData } = await supabase
//         .from('courses')
//         .select('title')
//         .eq('id', courseId)
//         .single();

//       const { data: newBatch, error: createBatchError } = await supabase
//         .from('batches')
//         .insert({
//           name: `${courseData?.title || 'Course'} - Semester ${semester}`,
//           college_id: user.college_id,
//           department_id: deptId,
//           course_id: courseId,
//           semester: parseInt(semester),
//           academic_year: '2025-26',
//           is_active: true
//         })
//         .select()
//         .single();

//       if (createBatchError) {
//         console.error('Error creating batch:', createBatchError);
//         return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
//       }
//       batchData = newBatch;
//     }

//     if (!batchData) {
//       return NextResponse.json({ error: 'Failed to get or create batch' }, { status: 500 });
//     }

//     // Create the new bucket
//     const { data: newBucket, error: bucketError } = await supabase
//       .from('elective_buckets')
//       .insert({
//         batch_id: batchData.id,
//         bucket_name: bucket_name,
//         is_common_slot: true,
//         min_selection: 1,
//         max_selection: 1,
//       })
//       .select()
//       .single();

//     if (bucketError) {
//       console.error('Error creating bucket:', bucketError);
//       return NextResponse.json({ error: 'Failed to create bucket' }, { status: 500 });
//     }

//     return NextResponse.json({
//       success: true,
//       message: 'Bucket created successfully',
//       bucket: {
//         id: newBucket.id,
//         bucket_name: newBucket.bucket_name,
//         is_common_slot: newBucket.is_common_slot,
//         min_selection: newBucket.min_selection,
//         max_selection: newBucket.max_selection,
//         batch_id: newBucket.batch_id,
//         subjects: []
//       }
//     });
//   } catch (error) {
//     console.error('Error in POST /api/nep/buckets:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// async function handleBulkSave(request: NextRequest, user: any, body: any) {
//   try {
//     const { buckets, availableSubjects, courseId, semester } = body;

//     if (!courseId || !semester || !Array.isArray(buckets)) {
//       return NextResponse.json(
//         { error: 'Invalid request body' },
//         { status: 400 }
//       );
//     }

//     const supabase = createClient();

//     // First, find or create the batch for this college, course_id, and semester
//     let { data: batchData, error: batchError } = await supabase
//       .from('batches')
//       .select('id, name, department_id, course_id')
//       .eq('college_id', user.college_id)
//       .eq('semester', parseInt(semester))
//       .eq('course_id', courseId)
//       .eq('is_active', true)
//       .single();

//     if (batchError || !batchData) {
//       // Try to create a batch if it doesn't exist
//       // For B.Ed courses, try to find Education department or any active department
//       let { data: deptData } = await supabase
//         .from('departments')
//         .select('id, name')
//         .eq('college_id', user.college_id)
//         .or('name.ilike.%education%,name.ilike.%teacher%,name.ilike.%b.ed%')
//         .single();

//       // If no education department found, get the first available department
//       if (!deptData) {
//         const { data: firstDept } = await supabase
//           .from('departments')
//           .select('id, name')
//           .eq('college_id', user.college_id)
//           .limit(1)
//           .single();
//         deptData = firstDept;
//       }

//       if (deptData) {
//         // Get course title for batch name
//         const { data: courseData } = await supabase
//           .from('courses')
//           .select('title')
//           .eq('id', courseId)
//           .single();

//         const { data: newBatch, error: createBatchError } = await supabase
//           .from('batches')
//           .insert({
//             name: `${courseData?.title || 'Course'} - Semester ${semester}`,
//             college_id: user.college_id,
//             department_id: deptData.id,
//             course_id: courseId,
//             semester: parseInt(semester),
//             academic_year: '2025-26',
//             is_active: true
//           })
//           .select()
//           .single();

//         if (createBatchError) {
//           console.error('Error creating batch:', createBatchError);
//           return NextResponse.json({ error: 'Failed to create batch for curriculum' }, { status: 500 });
//         }
//         batchData = newBatch;
//       } else {
//         return NextResponse.json({ error: 'No suitable department found for creating batch' }, { status: 500 });
//       }
//     }

//     if (!batchData) {
//       return NextResponse.json({ error: 'Failed to get or create batch for curriculum' }, { status: 500 });
//     }

//     // Delete existing buckets for this batch
//     const { error: deleteError } = await supabase
//       .from('elective_buckets')
//       .delete()
//       .eq('batch_id', batchData.id);

//     if (deleteError) {
//       console.error('Error deleting existing buckets:', deleteError);
//       return NextResponse.json({ error: 'Failed to update buckets' }, { status: 500 });
//     }

//     // Insert new buckets
//     for (const bucket of buckets) {
//       const { data: bucketData, error: bucketError } = await supabase
//         .from('elective_buckets')
//         .insert({
//           batch_id: batchData.id,
//           bucket_name: bucket.bucket_name,
//           is_common_slot: bucket.is_common_slot || true,
//           min_selection: bucket.min_selection || 1,
//           max_selection: bucket.max_selection || 1,
//         })
//         .select()
//         .single();

//       if (bucketError) {
//         console.error('Error creating bucket:', bucketError);
//         return NextResponse.json({ error: 'Failed to create bucket' }, { status: 500 });
//       }

//       // Update subjects to link to bucket
//       if (bucket.subjects.length > 0 && bucketData) {
//         const { error: updateError } = await supabase
//           .from('subjects')
//           .update({ course_group_id: bucketData.id })
//           .in('id', bucket.subjects.map((s: any) => s.id))
//           .eq('college_id', user.college_id); // Additional security check

//         if (updateError) {
//           console.error('Error linking subjects to bucket:', updateError);
//           return NextResponse.json({ error: 'Failed to link subjects' }, { status: 500 });
//         }
//       }
//     }

//     // Reset course_group_id for available subjects
//     if (availableSubjects && availableSubjects.length > 0) {
//       const { error: resetError } = await supabase
//         .from('subjects')
//         .update({ course_group_id: null })
//         .in('id', availableSubjects.map((s: any) => s.id))
//         .eq('college_id', user.college_id); // Additional security check

//       if (resetError) {
//         console.error('Error resetting subjects:', resetError);
//         return NextResponse.json({ error: 'Failed to reset subjects' }, { status: 500 });
//       }
//     }

//     console.log(`Successfully saved curriculum for batch ${batchData.id}, courseId ${courseId}, semester ${semester}`);

//     return NextResponse.json({ success: true, message: 'Curriculum saved successfully' });
//   } catch (error) {
//     console.error('Error in handleBulkSave:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }


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
          const colleges = studentUser.colleges as any;
          user = {
            id: studentUser.id,
            email: studentUser.email,
            name: `${studentUser.first_name} ${studentUser.last_name}`,
            role: studentUser.role,
            college_id: studentUser.college_id,
            college_name: Array.isArray(colleges) ? colleges[0]?.name : colleges?.name
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
  const batchId = searchParams.get('batchId');
  const courseId = searchParams.get('courseId');
  const semester = searchParams.get('semester');
  const departmentId = searchParams.get('departmentId');
  const fetchAll = searchParams.get('fetchAll'); // New: Fetch all buckets for college admin

  const supabase = createClient();

  // NEW: Handle fetchAll=true for college admins - fetch ALL buckets for their college
  // This joins elective_buckets with batches and filters by college_id
  if (fetchAll === 'true') {
    console.log('🔍 Fetching ALL buckets for college:', user.college_id);
    
    // Only allow college_admin or admin roles to fetch all buckets
    if (user.role !== 'college_admin' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only college admins can fetch all buckets' },
        { status: 403 }
      );
    }

    // Fetch all buckets for batches belonging to this college
    // This implements the JOIN with batches and filter by college_id as per BUCKETS_FIX_GUIDE.md
    const { data: bucketsData, error: bucketsError } = await supabase
      .from('elective_buckets')
      .select(`
        *,
        batches!inner (
          id,
          name,
          semester,
          college_id,
          academic_year,
          course_id,
          department_id,
          is_active,
          courses (
            id,
            title,
            code
          ),
          departments (
            id,
            name
          )
        )
      `)
      .eq('batches.college_id', user.college_id)
      .eq('batches.is_active', true)
      .order('created_at', { ascending: false });

    if (bucketsError) {
      console.error('Database error fetching all buckets:', bucketsError);
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
          .eq('college_id', user.college_id);

        if (subjectsError) {
          console.error('Error fetching subjects for bucket:', subjectsError);
        }

        return {
          id: bucket.id,
          bucket_name: bucket.bucket_name,
          bucket_type: bucket.bucket_type || 'GENERAL',
          min_selection: bucket.min_selection,
          max_selection: bucket.max_selection,
          is_common_slot: bucket.is_common_slot,
          batch_id: bucket.batch_id,
          created_at: bucket.created_at,
          updated_at: bucket.updated_at,
          batch_info: bucket.batches,
          subjects: subjects || [],
        };
      })
    );

    console.log(`✅ Found ${bucketsWithSubjects.length} total buckets for college ${user.college_id}`);
    return NextResponse.json(bucketsWithSubjects);
  }

  let batchData;
  let batchError;

  // Prefer batchId if provided (most reliable)
  if (batchId) {
    console.log(`🔍 Looking up batch by batchId: ${batchId}`);
    const { data, error } = await supabase
      .from('batches')
      .select('id, name, semester, college_id, course_id, department_id')
      .eq('id', batchId)
      .eq('college_id', user.college_id)
      .eq('is_active', true)
      .single();
    
    batchData = data;
    batchError = error;
  } else if (courseId && semester) {
    // Fallback to course_id + semester lookup
    console.log(`🔍 Looking up batch by courseId: ${courseId}, semester: ${semester}`);
    
    // Security check: If user has department_id, verify it matches the requested departmentId
    const userDeptId = (user as any).department_id;
    if (userDeptId && departmentId && userDeptId !== departmentId) {
      return NextResponse.json(
        { error: 'You can only access buckets for your own department' },
        { status: 403 }
      );
    }

    // If user has department_id but none provided in request, use user's department
    const targetDepartmentId = departmentId || userDeptId;

    // Build query for finding the batch
    let batchQuery = supabase
      .from('batches')
      .select('id, name, semester, college_id, course_id, department_id')
      .eq('college_id', user.college_id)
      .eq('semester', parseInt(semester))
      .eq('is_active', true);

    // Only filter by course_id if it's provided and not null
    if (courseId) {
      batchQuery = batchQuery.eq('course_id', courseId);
    }

    // Add department filter (use validated targetDepartmentId)
    if (targetDepartmentId) {
      batchQuery = batchQuery.eq('department_id', targetDepartmentId);
    }

    const { data, error } = await batchQuery.maybeSingle();
    batchData = data;
    batchError = error;
  } else {
    return NextResponse.json(
      { error: 'Either batchId or (courseId + semester) are required. Use fetchAll=true to get all buckets for your college.' },
      { status: 400 }
    );
  }

  if (batchError || !batchData) {
    console.log(`❌ No batch found. Error:`, batchError);
    // Return empty array with a message to help debugging
    return NextResponse.json([]);
  }

  console.log(`✅ Found batch: ${batchData.name} (ID: ${batchData.id})`);
  
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
        academic_year,
        course_id,
        department_id,
        courses (
          id,
          title,
          code
        ),
        departments (
          id,
          name
        )
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
          bucket_type: bucket.bucket_type || 'GENERAL',
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
    console.log('🔵 POST /api/nep/buckets - Starting request');
    const user = await getAuthenticatedUser(request);
    if (!user) {
      console.error('❌ Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ User authenticated:', user.email);

    const body = await request.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));
    const { bucket_name, bucket_type, courseId, semester, departmentId } = body;

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

    // Security check: If user has department_id, verify it matches the provided departmentId
    const userDeptId = (user as any).department_id;
    if (userDeptId && departmentId && userDeptId !== departmentId) {
      return NextResponse.json(
        { error: 'You can only create buckets for your own department' },
        { status: 403 }
      );
    }

    // If user has department_id but none provided in request, use user's department
    const targetDepartmentId = departmentId || userDeptId;

    // Build query for finding the batch
    let batchQuery = supabase
      .from('batches')
      .select('id, name, department_id, course_id')
      .eq('college_id', user.college_id)
      .eq('semester', parseInt(semester))
      .eq('course_id', courseId)
      .eq('is_active', true);

    // Add optional department filter
    if (departmentId) {
      batchQuery = batchQuery.eq('department_id', departmentId);
    }

    let { data: batchData, error: batchError } = await batchQuery.single();

    if (batchError || !batchData) {
      // Create batch if it doesn't exist - use targetDepartmentId (validated above)
      let deptId = targetDepartmentId;
      
      if (!deptId) {
        // Only fallback if user doesn't have department_id restriction
        if (!userDeptId) {
          const { data: deptData } = await supabase
            .from('departments')
            .select('id, name')
            .eq('college_id', user.college_id)
            .limit(1)
            .single();
          
          deptId = deptData?.id;
          
          if (!deptId) {
            return NextResponse.json({ error: 'No department found or specified' }, { status: 500 });
          }
        }
      }

      if (!deptId) {
        return NextResponse.json({ error: 'No department found or specified' }, { status: 500 });
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
          department_id: deptId,
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

    if (!batchData) {
      return NextResponse.json({ error: 'Failed to get or create batch' }, { status: 500 });
    }

    // Fetch course code/title for the 'course' column
    const { data: courseInfo } = await supabase
      .from('courses')
      .select('code, title')
      .eq('id', courseId)
      .single();

    // Create the new bucket
    // Build insert object with all required fields including college_id, course, semester
    const insertData: any = {
      batch_id: batchData.id,
      bucket_name: bucket_name,
      is_common_slot: true,
      min_selection: 1,
      max_selection: 1,
      // Always populate these fields to avoid NULL values
      college_id: user.college_id,
      course: courseInfo?.code || courseInfo?.title || 'Unknown',
      semester: parseInt(semester),
    };
    
    // Only include bucket_type if provided (requires migration to be run)
    if (bucket_type) {
      insertData.bucket_type = bucket_type;
      console.log('📌 Including bucket_type:', bucket_type);
    } else {
      console.log('⚠️  bucket_type not provided, skipping');
    }
    
    console.log('💾 Inserting bucket with data:', insertData);
    const { data: newBucket, error: bucketError } = await supabase
      .from('elective_buckets')
      .insert(insertData)
      .select()
      .single();

    if (bucketError) {
      console.error('❌ Error creating bucket:', bucketError);
      console.error('📋 Insert data was:', insertData);
      console.error('🔍 Error code:', bucketError.code);
      console.error('💬 Error message:', bucketError.message);
      return NextResponse.json({ 
        error: 'Failed to create bucket', 
        details: bucketError.message,
        hint: bucketError.code === '42703' ? 'Run database migration: database/add_bucket_type.sql' : undefined
      }, { status: 500 });
    }

    console.log('✅ Bucket created successfully:', newBucket.id);
    return NextResponse.json({
      success: true,
      message: 'Bucket created successfully',
      bucket: {
        id: newBucket.id,
        bucket_name: newBucket.bucket_name,
        bucket_type: newBucket.bucket_type || 'GENERAL',
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

    if (!batchData) {
      return NextResponse.json({ error: 'Failed to get or create batch for curriculum' }, { status: 500 });
    }

    // Fetch course code/title for the 'course' column
    const { data: courseInfo } = await supabase
      .from('courses')
      .select('code, title')
      .eq('id', courseId)
      .single();
    
    const courseCode = courseInfo?.code || courseInfo?.title || 'Unknown';

    // Delete existing buckets for this batch
    const { error: deleteError } = await supabase
      .from('elective_buckets')
      .delete()
      .eq('batch_id', batchData.id);

    if (deleteError) {
      console.error('Error deleting existing buckets:', deleteError);
      return NextResponse.json({ error: 'Failed to update buckets' }, { status: 500 });
    }

    // Insert new buckets with all required fields
    for (const bucket of buckets) {
      const { data: bucketData, error: bucketError } = await supabase
        .from('elective_buckets')
        .insert({
          batch_id: batchData.id,
          bucket_name: bucket.bucket_name,
          is_common_slot: bucket.is_common_slot || true,
          min_selection: bucket.min_selection || 1,
          max_selection: bucket.max_selection || 1,
          // Always populate these fields to avoid NULL values
          college_id: user.college_id,
          course: courseCode,
          semester: parseInt(semester),
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