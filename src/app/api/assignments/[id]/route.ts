import { serviceDb as supabase } from '@/shared/database';
import type { NeonClient as SupabaseClient } from '@/lib/neon-supabase-compat';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
// Lazy initialization of Supabase client
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
    if (!_supabase) {
        _supabase = supabase;
    }
    return _supabase;
}

// Helper function to decode and verify user from token
function getAuthenticatedUser(request: NextRequest) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    try {
        const token = authHeader.substring(7);
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        return decoded;
    } catch (error) {
        console.error('Token decode error:', error);
        return null;
    }
}

// GET - Fetch single assignment with questions
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;

        const supabase = getSupabase();

        // Fetch assignment
        const { data: assignment, error } = await supabase
            .from('assignments')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !assignment) {
            return NextResponse.json(
                { success: false, error: 'Assignment not found' },
                { status: 404 }
            );
        }

        // Check access - either creator or same college
        if (assignment.college_id !== user.college_id) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // Fetch questions
        const { data: questions } = await supabase
            .from('assignment_questions')
            .select('*')
            .eq('assignment_id', id)
            .order('question_order', { ascending: true });

        // Fetch batch info
        let batch = null;
        if (assignment.batch_id) {
            const { data } = await supabase
                .from('batches')
                .select('name, semester, section')
                .eq('id', assignment.batch_id)
                .single();
            batch = data;
        }

        // Fetch subject info
        let subject = null;
        if (assignment.subject_id) {
            const { data } = await supabase
                .from('subjects')
                .select('name, code')
                .eq('id', assignment.subject_id)
                .single();
            subject = data;
        }

        return NextResponse.json({
            success: true,
            assignment: {
                ...assignment,
                batch,
                subject,
                questions: questions || []
            }
        });

    } catch (error: any) {
        console.error('Get assignment error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}

// PUT - Update assignment
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;

        const supabase = getSupabase();

        // Check if assignment exists and user has permission
        const { data: existingAssignment, error: fetchError } = await supabase
            .from('assignments')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingAssignment) {
            return NextResponse.json(
                { success: false, error: 'Assignment not found' },
                { status: 404 }
            );
        }

        // Check permission - must be creator or same college admin
        if (existingAssignment.created_by !== user.id && existingAssignment.college_id !== user.college_id) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const {
            title,
            description,
            type,
            batchId,
            subjectId,
            totalMarks,
            passingMarks,
            durationMinutes,
            scheduledStart,
            scheduledEnd,
            maxAttempts,
            proctoringEnabled,
            maxViolations,
            showResultsImmediately,
            allowReview,
            questions,
            isDraft
        } = body;

        // Update assignment
        const { error: updateError } = await supabase
            .from('assignments')
            .update({
                title,
                description,
                type,
                batch_id: batchId,
                subject_id: subjectId || null,
                total_marks: parseFloat(totalMarks),
                passing_marks: passingMarks ? parseFloat(passingMarks) : null,
                duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
                scheduled_start: scheduledStart || null,
                scheduled_end: scheduledEnd || null,
                max_attempts: maxAttempts ? parseInt(maxAttempts) : 1,
                proctoring_enabled: proctoringEnabled || false,
                max_violations: maxViolations ? parseInt(maxViolations) : 3,
                show_results_immediately: showResultsImmediately || false,
                allow_review: allowReview || false,
                status: isDraft ? 'DRAFT' : 'SCHEDULED',
                is_published: !isDraft,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) {
            console.error('Assignment update error:', updateError);
            return NextResponse.json(
                { success: false, error: 'Failed to update assignment: ' + updateError.message },
                { status: 500 }
            );
        }

        // Update questions - delete existing and insert new
        if (questions && questions.length > 0) {
            // Delete existing questions
            await supabase
                .from('assignment_questions')
                .delete()
                .eq('assignment_id', id);

            // Insert new questions
            const questionsToInsert = questions.map((q: any, index: number) => ({
                assignment_id: id,
                question_order: index + 1,
                question_text: q.question_text,
                question_type: q.question_type,
                marks: parseFloat(q.marks),
                negative_marking: q.negative_marking ? parseFloat(q.negative_marking) : 0,
                question_data: q.question_data || {},
            }));

            const { error: questionsError } = await supabase
                .from('assignment_questions')
                .insert(questionsToInsert);

            if (questionsError) {
                console.error('Questions update error:', questionsError);
                return NextResponse.json(
                    { success: false, error: 'Failed to update questions: ' + questionsError.message },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Assignment updated successfully'
        });

    } catch (error: any) {
        console.error('Update assignment error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}

// DELETE - Delete assignment
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;

        const supabase = getSupabase();

        // Check if assignment exists and user has permission
        const { data: existingAssignment, error: fetchError } = await supabase
            .from('assignments')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingAssignment) {
            return NextResponse.json(
                { success: false, error: 'Assignment not found' },
                { status: 404 }
            );
        }

        // Check permission - must be creator or college admin
        if (existingAssignment.created_by !== user.id &&
            (existingAssignment.college_id !== user.college_id || !['admin', 'college_admin'].includes(user.role))) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // Delete questions first (foreign key constraint)
        await supabase
            .from('assignment_questions')
            .delete()
            .eq('assignment_id', id);

        // Delete submissions
        await supabase
            .from('assignment_submissions')
            .delete()
            .eq('assignment_id', id);

        // Delete analytics
        await supabase
            .from('assignment_analytics')
            .delete()
            .eq('assignment_id', id);

        // Delete the assignment
        const { error: deleteError } = await supabase
            .from('assignments')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Assignment delete error:', deleteError);
            return NextResponse.json(
                { success: false, error: 'Failed to delete assignment: ' + deleteError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Assignment deleted successfully'
        });

    } catch (error: any) {
        console.error('Delete assignment error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}
