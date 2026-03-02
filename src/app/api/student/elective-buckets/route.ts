import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/student/elective-buckets
 * Fetches elective buckets that are live for students and match the student's batch
 */
export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;

        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');
        const batchId = searchParams.get('batchId');

        if (!studentId) {
            return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
        }

        // If batchId not provided, get it from student enrollment
        let studentBatchId = batchId;
        if (!studentBatchId) {
            const { data: enrollment } = await supabase
                .from('student_batch_enrollment')
                .select('batch_id')
                .eq('student_id', studentId)
                .eq('is_active', true)
                .single();

            if (enrollment) {
                studentBatchId = enrollment.batch_id;
            }
        }

        if (!studentBatchId) {
            return NextResponse.json({
                error: 'Student is not enrolled in any batch',
                buckets: []
            }, { status: 200 });
        }

        // Optimized: Fetch buckets with subjects and bulk fetch choices
        const { data: buckets, error: bucketError } = await supabase
            .from('elective_buckets')
            .select(`
                id,
                bucket_name,
                batch_id,
                min_selection,
                max_selection,
                is_common_slot,
                is_published,
                is_live_for_students,
                submission_deadline,
                created_at,
                batches:batches (
                  id,
                  name,
                  semester,
                  section,
                  academic_year
                ),
                subjects (
                    id,
                    code,
                    name,
                    credit_value,
                    nep_category,
                    subject_type,
                    description
                )
            `)
            .eq('batch_id', studentBatchId)
            .eq('is_live_for_students', true)
            .eq('is_published', true);

        if (bucketError) {
            console.error('[Student Buckets] Error:', bucketError);
            return NextResponse.json({ error: 'Failed to fetch buckets' }, { status: 500 });
        }

        if (!buckets || buckets.length === 0) {
            return NextResponse.json({
                success: true,
                buckets: [],
                count: 0
            });
        }

        // Bulk fetch all choices for this student and these buckets
        const bucketIds = buckets.map(b => b.id);
        const { data: allChoices } = await supabase
            .from('student_subject_choices')
            .select(`
                id,
                subject_id,
                priority,
                is_allotted,
                allotment_status,
                updated_at,
                bucket_id
            `)
            .eq('student_id', studentId)
            .in('bucket_id', bucketIds);

        const enrichedBuckets = buckets.map((bucket: any) => {
            // Filter choices for this bucket
            let processedChoices = allChoices?.filter(c => c.bucket_id === bucket.id) || [];

            // Data consistency fix: Check if multiple subjects are allotted exceeding max_selection
            const allottedChoices = processedChoices.filter((c: any) => c.is_allotted || c.allotment_status === 'allotted');

            if (allottedChoices.length > bucket.max_selection) {
                // Sort by updated_at desc to keep latest allotments
                allottedChoices.sort((a: any, b: any) =>
                    new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
                );

                // Keep valid ones
                const validAllotmentIds = allottedChoices.slice(0, bucket.max_selection).map((c: any) => c.id);

                processedChoices = processedChoices.map((c: any) => {
                    if (c.is_allotted && !validAllotmentIds.includes(c.id)) {
                        return { ...c, is_allotted: false, allotment_status: 'pending' };
                    }
                    return c;
                });
            }

            return {
                ...bucket,
                subjects: bucket.subjects || [], // joined subjects
                student_choices: processedChoices,
                has_submitted: (processedChoices.length || 0) > 0
            };
        });

        return NextResponse.json({
            success: true,
            buckets: enrichedBuckets,
            count: enrichedBuckets.length
        });

    } catch (error) {
        console.error('[Student Buckets] Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/student/elective-buckets
 * Submit student's subject choices (priorities) for a bucket
 */
export async function POST(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;

        const body = await request.json();
        const { student_id, bucket_id, choices } = body;

        // choices is an array of { subject_id, priority }

        if (!student_id || !bucket_id || !choices || !Array.isArray(choices)) {
            return NextResponse.json({
                error: 'student_id, bucket_id, and choices array are required'
            }, { status: 400 });
        }

        // Verify bucket is live for students
        const { data: bucket, error: bucketError } = await supabase
            .from('elective_buckets')
            .select('id, bucket_name, is_live_for_students, submission_deadline, min_selection, max_selection')
            .eq('id', bucket_id)
            .single();

        if (bucketError || !bucket) {
            return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
        }

        if (!bucket.is_live_for_students) {
            return NextResponse.json({
                error: 'This bucket is not open for student submissions'
            }, { status: 403 });
        }

        // Check deadline
        if (bucket.submission_deadline) {
            const deadline = new Date(bucket.submission_deadline);
            if (new Date() > deadline) {
                return NextResponse.json({
                    error: 'Submission deadline has passed'
                }, { status: 403 });
            }
        }

        // Validate minimum selections - student must pick at least min_selection subjects
        if (choices.length < bucket.min_selection) {
            return NextResponse.json({
                error: `You must select at least ${bucket.min_selection} subject(s)`
            }, { status: 400 });
        }

        // Note: We don't limit max_selection here since students should be able to
        // submit preferences for all subjects. The max_selection only limits how many
        // subjects the admin will actually allot to the student.

        // Delete existing choices for this student+bucket
        await supabase
            .from('student_subject_choices')
            .delete()
            .eq('student_id', student_id)
            .eq('bucket_id', bucket_id);

        // Insert new choices
        const choiceRecords = choices.map((choice: { subject_id: string; priority: number }) => ({
            student_id,
            bucket_id,
            subject_id: choice.subject_id,
            priority: choice.priority,
            is_allotted: false,
            allotment_status: 'pending'
        }));

        const { data: insertedChoices, error: insertError } = await supabase
            .from('student_subject_choices')
            .insert(choiceRecords)
            .select();

        if (insertError) {
            console.error('[Student Choices] Insert error:', insertError);
            return NextResponse.json({
                error: 'Failed to save your choices. ' + insertError.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Your preferences have been saved successfully!',
            choices: insertedChoices
        }, { status: 201 });

    } catch (error) {
        console.error('[Student Choices] Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
