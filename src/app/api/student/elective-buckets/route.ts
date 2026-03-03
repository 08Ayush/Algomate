import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

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

        const pool = getPool();

        // Resolve batch if not provided
        let studentBatchId = batchId;
        if (!studentBatchId) {
            const enrollResult = await pool.query(
                `SELECT batch_id FROM student_batch_enrollment WHERE student_id = $1 AND is_active = true LIMIT 1`,
                [studentId]
            );
            if (enrollResult.rows.length > 0) studentBatchId = enrollResult.rows[0].batch_id;
        }

        if (!studentBatchId) {
            return NextResponse.json({ success: true, buckets: [], count: 0 });
        }

        // Fetch buckets with batch info; subjects fetched separately per bucket
        const bucketsResult = await pool.query(`
            SELECT
                eb.id, eb.bucket_name, eb.batch_id, eb.min_selection, eb.max_selection,
                eb.is_common_slot, eb.is_published, eb.is_live_for_students, eb.submission_deadline, eb.created_at,
                CASE WHEN b.id IS NOT NULL
                    THEN json_build_object('id', b.id, 'name', b.name, 'semester', b.semester, 'section', b.section, 'academic_year', b.academic_year)
                    ELSE NULL END AS batches
            FROM elective_buckets eb
            LEFT JOIN batches b ON b.id = eb.batch_id
            WHERE eb.batch_id = $1 AND eb.is_live_for_students = true AND eb.is_published = true
        `, [studentBatchId]);

        if (bucketsResult.rows.length === 0) {
            return NextResponse.json({ success: true, buckets: [], count: 0 });
        }

        const bucketIds = bucketsResult.rows.map((b: any) => b.id);

        // Fetch subjects for all buckets via bucket_subjects junction table
        const subjectsResult = await pool.query(`
            SELECT bs.bucket_id, s.id, s.code, s.name, s.credit_value, s.nep_category, s.subject_type, s.description
            FROM bucket_subjects bs
            INNER JOIN subjects s ON s.id = bs.subject_id
            WHERE bs.bucket_id = ANY($1::uuid[]) AND bs.is_active = true
        `, [bucketIds]);

        // Group subjects by bucket_id
        const subjectsByBucket = new Map<string, any[]>();
        subjectsResult.rows.forEach((s: any) => {
            if (!subjectsByBucket.has(s.bucket_id)) subjectsByBucket.set(s.bucket_id, []);
            const { bucket_id, ...subjectData } = s;
            subjectsByBucket.get(s.bucket_id)!.push(subjectData);
        });

        // Fetch choices for this student
        const choicesResult = await pool.query(`
            SELECT id, subject_id, priority, is_allotted, allotment_status, updated_at, bucket_id
            FROM student_subject_choices
            WHERE student_id = $1 AND bucket_id = ANY($2::uuid[])
        `, [studentId, bucketIds]);

        const choicesByBucket = new Map<string, any[]>();
        choicesResult.rows.forEach((c: any) => {
            if (!choicesByBucket.has(c.bucket_id)) choicesByBucket.set(c.bucket_id, []);
            choicesByBucket.get(c.bucket_id)!.push(c);
        });

        const enrichedBuckets = bucketsResult.rows.map((bucket: any) => {
            let processedChoices = choicesByBucket.get(bucket.id) || [];
            const allottedChoices = processedChoices.filter((c: any) => c.is_allotted || c.allotment_status === 'allotted');

            if (allottedChoices.length > bucket.max_selection) {
                allottedChoices.sort((a: any, b: any) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
                const validIds = allottedChoices.slice(0, bucket.max_selection).map((c: any) => c.id);
                processedChoices = processedChoices.map((c: any) =>
                    c.is_allotted && !validIds.includes(c.id) ? { ...c, is_allotted: false, allotment_status: 'pending' } : c
                );
            }

            return {
                ...bucket,
                subjects: subjectsByBucket.get(bucket.id) || [],
                student_choices: processedChoices,
                has_submitted: processedChoices.length > 0
            };
        });

        return NextResponse.json({ success: true, buckets: enrichedBuckets, count: enrichedBuckets.length });

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
