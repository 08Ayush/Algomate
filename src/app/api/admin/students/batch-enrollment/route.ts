import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET - Get batch enrollment for a student
export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user; // Auth failed

        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');

        if (!studentId) {
            return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
        }

        const { data: enrollment, error } = await supabase
            .from('student_batch_enrollment' as any)
            .select(`
        id,
        student_id,
        batch_id,
        is_active,
        enrollment_date,
        created_at
      `)
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching enrollment:', error);
            return NextResponse.json({ enrollments: [] });
        }

        return NextResponse.json({ enrollments: enrollment || [] });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Assign a batch to a student (create enrollment)
export async function POST(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user; // Auth failed

        const allowedRoles = ['college_admin', 'admin', 'super_admin'];
        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { student_id, batch_id } = body;

        if (!student_id || !batch_id) {
            return NextResponse.json({ error: 'Student ID and Batch ID are required' }, { status: 400 });
        }

        // Check if enrollment already exists
        const { data: existing } = await supabase
            .from('student_batch_enrollment' as any)
            .select('id')
            .eq('student_id', student_id)
            .eq('batch_id', batch_id)
            .single();

        if (existing) {
            // Update existing enrollment to active
            const { error: updateError } = await supabase
                .from('student_batch_enrollment' as any)
                .update({ is_active: true, updated_at: new Date().toISOString() } as any)
                .eq('id', existing.id);

            if (updateError) {
                return NextResponse.json({ error: 'Failed to update enrollment' }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: 'Enrollment updated' });
        }

        // Deactivate any existing active enrollments for this student
        await supabase
            .from('student_batch_enrollment' as any)
            .update({ is_active: false, updated_at: new Date().toISOString() } as any)
            .eq('student_id', student_id)
            .eq('is_active', true);

        // Create new enrollment
        const { data: newEnrollment, error: insertError } = await supabase
            .from('student_batch_enrollment' as any)
            .insert({
                student_id,
                batch_id,
                is_active: true,
                enrollment_date: new Date().toISOString().split('T')[0]
            } as any)
            .select()
            .single();

        if (insertError) {
            console.error('Error creating enrollment:', insertError);
            return NextResponse.json({ error: 'Failed to create enrollment' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Student enrolled in batch successfully',
            enrollment: newEnrollment
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Remove batch enrollment
export async function DELETE(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user; // Auth failed

        const allowedRoles = ['college_admin', 'admin', 'super_admin'];
        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { student_id, batch_id, enrollment_id } = body;

        if (enrollment_id) {
            // Delete by enrollment ID
            const { error } = await supabase
                .from('student_batch_enrollment' as any)
                .delete()
                .eq('id', enrollment_id);

            if (error) {
                return NextResponse.json({ error: 'Failed to remove enrollment' }, { status: 500 });
            }
        } else if (student_id && batch_id) {
            // Delete by student_id and batch_id
            const { error } = await supabase
                .from('student_batch_enrollment' as any)
                .delete()
                .eq('student_id', student_id)
                .eq('batch_id', batch_id);

            if (error) {
                return NextResponse.json({ error: 'Failed to remove enrollment' }, { status: 500 });
            }
        } else {
            return NextResponse.json({ error: 'Enrollment ID or Student+Batch IDs required' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Enrollment removed' });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH - Bulk assign students to a batch
export async function PATCH(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user; // Auth failed

        const allowedRoles = ['college_admin', 'admin', 'super_admin'];
        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { student_ids, batch_id } = body;

        if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
            return NextResponse.json({ error: 'Student IDs array is required' }, { status: 400 });
        }

        if (!batch_id) {
            return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
        }

        let successCount = 0;
        let errorCount = 0;

        for (const student_id of student_ids) {
            // Deactivate existing enrollments
            await supabase
                .from('student_batch_enrollment' as any)
                .update({ is_active: false, updated_at: new Date().toISOString() } as any)
                .eq('student_id', student_id)
                .eq('is_active', true);

            // Check if enrollment already exists for this batch
            const { data: existing } = await supabase
                .from('student_batch_enrollment' as any)
                .select('id')
                .eq('student_id', student_id)
                .eq('batch_id', batch_id)
                .single();

            if (existing) {
                // Reactivate existing enrollment
                const { error } = await supabase
                    .from('student_batch_enrollment' as any)
                    .update({ is_active: true, updated_at: new Date().toISOString() } as any)
                    .eq('id', existing.id);

                if (!error) successCount++;
                else errorCount++;
            } else {
                // Create new enrollment
                const { error } = await supabase
                    .from('student_batch_enrollment' as any)
                    .insert({
                        student_id,
                        batch_id,
                        is_active: true,
                        enrollment_date: new Date().toISOString().split('T')[0]
                    } as any);

                if (!error) successCount++;
                else errorCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Enrolled ${successCount} students in batch${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
            stats: { success: successCount, failed: errorCount }
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
