import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Subject Allotment Conversion API
 * POST - Convert student choices to permanent allotments using priority-based algorithm
 */

interface StudentChoice {
  id: string;
  student_id: string;
  bucket_id: string;
  subject_id: string;
  priority: number;
  student_name: string;
  college_uid: string;
  cgpa: number;
  email: string;
}

interface SubjectCapacity {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  max_capacity: number;
  current_allotted: number;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bucket_id, allotted_by, algorithm = 'priority_based' } = body;

    if (!bucket_id || !allotted_by) {
      return NextResponse.json({ 
        error: 'Missing required fields: bucket_id, allotted_by' 
      }, { status: 400 });
    }

    // Step 1: Fetch all student choices for this bucket
    const { data: choices, error: choicesError } = await supabaseAdmin
      .from('student_subject_choices')
      .select(`
        id,
        student_id,
        bucket_id,
        subject_id,
        priority,
        users:users!student_subject_choices_student_id_fkey (
          first_name,
          last_name,
          college_uid,
          email,
          credit
        )
      `)
      .eq('bucket_id', bucket_id)
      .neq('allotment_status', 'allotted')
      .order('priority', { ascending: true });

    if (choicesError) {
      console.error('Error fetching choices:', choicesError);
      return NextResponse.json({ error: 'Failed to fetch student choices' }, { status: 500 });
    }

    if (!choices || choices.length === 0) {
      return NextResponse.json({ 
        error: 'No pending student choices found for this bucket' 
      }, { status: 404 });
    }

    // Step 2: Fetch bucket details and subjects in this bucket
    const { data: bucket, error: bucketError } = await supabaseAdmin
      .from('elective_buckets')
      .select(`
        id,
        bucket_name,
        bucket_subjects (
          subjects (
            id,
            code,
            name
          )
        )
      `)
      .eq('id', bucket_id)
      .single();

    if (bucketError || !bucket) {
      console.error('❌ Error fetching bucket:', bucketError);
      return NextResponse.json({ error: 'Failed to fetch bucket details' }, { status: 500 });
    }

    console.log('🔍 Bucket data received:', {
      bucket_id: bucket.id,
      bucket_name: bucket.bucket_name,
      bucket_subjects: bucket.bucket_subjects,
      bucket_subjects_length: bucket.bucket_subjects?.length || 0
    });

    // Extract subjects from bucket_subjects junction table
    const subjects = bucket.bucket_subjects?.map((bs: any) => bs.subjects).filter(Boolean) || [];
    
    console.log('📚 Extracted subjects:', {
      subjects_count: subjects.length,
      subjects: subjects
    });
    
    if (subjects.length === 0) {
      console.error('❌ No subjects found in this bucket. Bucket data:', bucket);
      return NextResponse.json({ error: 'No subjects found in this bucket' }, { status: 404 });
    }

    // Step 3: Get current allotment counts for capacity checking (optional - for future use)
    const { data: existingAllotments, error: allotmentsError } = await supabaseAdmin
      .from('subject_allotments_permanent')
      .select('subject_id')
      .eq('bucket_id', bucket_id);

    if (allotmentsError) {
      console.error('Error fetching existing allotments:', allotmentsError);
      return NextResponse.json({ error: 'Failed to fetch existing allotments' }, { status: 500 });
    }

    // Build capacity tracking (using default capacity since max_capacity doesn't exist in subjects table)
    const subjectCapacities: Map<string, SubjectCapacity> = new Map();
    subjects.forEach((subject: any) => {
      const currentCount = (existingAllotments || []).filter(a => a.subject_id === subject.id).length;
      subjectCapacities.set(subject.id, {
        subject_id: subject.id,
        subject_code: subject.code,
        subject_name: subject.name,
        max_capacity: 50, // Default capacity - can be configured per bucket later
        current_allotted: currentCount
      });
    });

    // Step 4: Run Priority-Based Allotment Algorithm
    const allotments: any[] = [];
    const notAllotted: string[] = [];
    const studentProcessed: Set<string> = new Set();

    // Format choices data
    const formattedChoices: StudentChoice[] = choices.map((choice: any) => ({
      id: choice.id,
      student_id: choice.student_id,
      bucket_id: choice.bucket_id,
      subject_id: choice.subject_id,
      priority: choice.priority,
      student_name: `${choice.users.first_name} ${choice.users.last_name}`,
      college_uid: choice.users.college_uid,
      cgpa: parseFloat(choice.users.credit || '0'),
      email: choice.users.email
    }));

    // Group choices by student
    const studentChoicesMap: Map<string, StudentChoice[]> = new Map();
    formattedChoices.forEach(choice => {
      if (!studentChoicesMap.has(choice.student_id)) {
        studentChoicesMap.set(choice.student_id, []);
      }
      studentChoicesMap.get(choice.student_id)!.push(choice);
    });

    // Sort each student's choices by priority
    studentChoicesMap.forEach(choices => {
      choices.sort((a, b) => a.priority - b.priority);
    });

    // Algorithm: Iterate priority levels (1, 2, 3...)
    const maxPriority = Math.max(...formattedChoices.map(c => c.priority));
    
    for (let priorityLevel = 1; priorityLevel <= maxPriority; priorityLevel++) {
      // Get all choices at this priority level
      const currentPriorityChoices: StudentChoice[] = [];
      
      studentChoicesMap.forEach((studentChoices, studentId) => {
        if (studentProcessed.has(studentId)) return; // Skip if already allotted
        
        const choice = studentChoices.find(c => c.priority === priorityLevel);
        if (choice) {
          currentPriorityChoices.push(choice);
        }
      });

      // Sort by CGPA (descending) for tie-breaking at same priority
      currentPriorityChoices.sort((a, b) => b.cgpa - a.cgpa);

      // Allocate subjects
      for (const choice of currentPriorityChoices) {
        const capacity = subjectCapacities.get(choice.subject_id);
        
        if (capacity && capacity.current_allotted < capacity.max_capacity) {
          // Allot this subject
          allotments.push({
            student_id: choice.student_id,
            bucket_id: choice.bucket_id,
            subject_id: choice.subject_id,
            allotted_by,
            algorithm_used: algorithm,
            priority_rank: choice.priority,
            student_cgpa: choice.cgpa,
            notes: `Allotted at priority ${choice.priority}`
          });

          // Update capacity
          capacity.current_allotted++;
          studentProcessed.add(choice.student_id);
        }
      }
    }

    // Mark students who didn't get any allotment
    studentChoicesMap.forEach((choices, studentId) => {
      if (!studentProcessed.has(studentId)) {
        notAllotted.push(studentId);
      }
    });

    // Step 5: Save allotments to database
    if (allotments.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('subject_allotments_permanent')
        .insert(allotments);

      if (insertError) {
        console.error('Error inserting allotments:', insertError);
        return NextResponse.json({ error: 'Failed to save allotments' }, { status: 500 });
      }

      // Update student_subject_choices status
      const allottedChoiceIds = formattedChoices
        .filter(c => studentProcessed.has(c.student_id))
        .map(c => c.id);

      if (allottedChoiceIds.length > 0) {
        await supabaseAdmin
          .from('student_subject_choices')
          .update({ allotment_status: 'allotted', is_allotted: true, allotted_at: new Date().toISOString() })
          .in('id', allottedChoiceIds);
      }

      const notAllottedChoiceIds = formattedChoices
        .filter(c => notAllotted.includes(c.student_id))
        .map(c => c.id);

      if (notAllottedChoiceIds.length > 0) {
        await supabaseAdmin
          .from('student_subject_choices')
          .update({ allotment_status: 'not_allotted' })
          .in('id', notAllottedChoiceIds);
      }
    }

    // Step 6: Fetch and return detailed results
    const { data: allotmentResults, error: resultsError } = await supabaseAdmin
      .from('subject_allotments_detailed')
      .select('*')
      .eq('bucket_id', bucket_id)
      .order('allotted_at', { ascending: false });

    if (resultsError) {
      console.error('Error fetching results:', resultsError);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully allotted ${allotments.length} students`,
      stats: {
        total_choices: formattedChoices.length,
        allotted: allotments.length,
        not_allotted: notAllotted.length,
        algorithm_used: algorithm
      },
      allotments: allotmentResults || [],
      not_allotted_students: notAllotted
    });

  } catch (error: any) {
    console.error('Error in allotment conversion:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Fetch permanent allotments for a bucket
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucketId = searchParams.get('bucketId');

    if (!bucketId) {
      return NextResponse.json({ error: 'bucketId is required' }, { status: 400 });
    }

    const { data: allotments, error } = await supabaseAdmin
      .from('subject_allotments_detailed')
      .select('*')
      .eq('bucket_id', bucketId)
      .order('allotted_at', { ascending: false });

    if (error) {
      console.error('Error fetching allotments:', error);
      return NextResponse.json({ error: 'Failed to fetch allotments' }, { status: 500 });
    }

    return NextResponse.json({
      allotments: allotments || [],
      count: allotments?.length || 0
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
