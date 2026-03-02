import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAuth } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    try {
        const authCheck = requireAuth(request);
        if (authCheck instanceof NextResponse) return authCheck;

        // 1. Authenticate Request
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        let tokenUser;
        try {
            tokenUser = JSON.parse(Buffer.from(token, 'base64').toString());
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
        }

        if (!tokenUser || !tokenUser.id || !tokenUser.college_id) {
            return NextResponse.json({ success: false, error: 'Invalid user data' }, { status: 401 });
        }

        // Only faculty/admins should be sending notifications like this
        if (tokenUser.role === 'student') {
            return NextResponse.json({ success: false, error: 'Student cannot broadcast notifications' }, { status: 403 });
        }

        // 2. Parse Body
        const body = await request.json();
        const { title, message, type, target, batch_id } = body;

        if (!title || !message || !type) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // 3. Determine Recipients
        let recipientIds: string[] = [];

        if (target === 'all') {
            // All students in the college
            const { data: students, error } = await supabase
                .from('users')
                .select('id')
                .eq('college_id', tokenUser.college_id)
                .eq('role', 'student')
                .eq('is_active', true);

            if (error) throw error;
            recipientIds = students.map(s => s.id);

        } else if (target === 'faculty') {
            // All faculty in the college
            const { data: faculty, error } = await supabase
                .from('users')
                .select('id')
                .eq('college_id', tokenUser.college_id)
                .eq('role', 'faculty')
                .eq('is_active', true);

            if (error) throw error;
            recipientIds = faculty.map(f => f.id);

        } else if (target === 'batch') {
            if (!batch_id) {
                return NextResponse.json({ success: false, error: 'Batch ID required for batch target' }, { status: 400 });
            }

            // Students enrolled in the batch
            // Use student_batch_enrollment table
            const { data: enrollments, error } = await supabase
                .from('student_batch_enrollment')
                .select('student_id')
                .eq('batch_id', batch_id)
                .eq('is_active', true);

            if (error) throw error;
            recipientIds = enrollments.map(e => e.student_id);
        }

        // Filter out the sender from recipients if they are included (e.g. faculty broadcasting to faculty)
        recipientIds = recipientIds.filter(id => id !== tokenUser.id);

        if (recipientIds.length === 0) {
            return NextResponse.json({ success: true, message: 'No recipients found', recipients_count: 0 });
        }

        // 4. Insert Notifications
        // Prepare bulk insert data
        const notificationsToInsert = recipientIds.map(recipientId => ({
            id: randomUUID(),
            recipient_id: recipientId,
            sender_id: tokenUser.id,
            type: type,
            title: title,
            message: message,
            batch_id: batch_id || null, // Optional connection
            is_read: false,
            created_at: new Date().toISOString()
        }));

        // Insert in chunks if necessary (Supabase handles reasonably large batches, but being safe is good)
        // For simplicity, we insert all. If > 1000, might need chunking. Assuming < 1000 for now or Supabase handles it.

        const { error: insertError } = await supabase
            .from('notifications')
            .insert(notificationsToInsert);

        if (insertError) {
            console.error('Error inserting notifications:', insertError);
            return NextResponse.json({ success: false, error: 'Failed to save notifications' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            recipients_count: recipientIds.length,
            message: `Notification sent to ${recipientIds.length} recipients`
        });

    } catch (error: any) {
        console.error('Send Notification API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error: ' + error.message }, { status: 500 });
    }
}
