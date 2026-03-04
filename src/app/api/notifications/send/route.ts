import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;

        if (!user.id || !user.college_id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (user.role === 'student') {
            return NextResponse.json({ success: false, error: 'Student cannot broadcast notifications' }, { status: 403 });
        }

        const body = await request.json();
        const { title, message, type, target, batch_id } = body;

        if (!title || !message || !type) {
            return NextResponse.json({ success: false, error: 'Missing required fields: title, message, type' }, { status: 400 });
        }

        const pool = getPool();
        let recipientRows: { id: string }[] = [];

        if (target === 'all') {
            const r = await pool.query(
                `SELECT id FROM users WHERE college_id = $1 AND role = 'student' AND is_active = true`,
                [user.college_id]
            );
            recipientRows = r.rows;
        } else if (target === 'faculty') {
            const r = await pool.query(
                `SELECT id FROM users WHERE college_id = $1 AND role = 'faculty' AND is_active = true`,
                [user.college_id]
            );
            recipientRows = r.rows;
        } else if (target === 'batch') {
            if (!batch_id) {
                return NextResponse.json({ success: false, error: 'batch_id required for batch target' }, { status: 400 });
            }
            const r = await pool.query(
                `SELECT student_id AS id FROM student_batch_enrollment WHERE batch_id = $1 AND is_active = true`,
                [batch_id]
            );
            recipientRows = r.rows;
        } else if (target === 'college_all') {
            const r = await pool.query(
                `SELECT id FROM users WHERE college_id = $1 AND is_active = true`,
                [user.college_id]
            );
            recipientRows = r.rows;
        }

        const recipientIds = recipientRows.map(r => r.id).filter(id => id !== user.id);

        if (recipientIds.length === 0) {
            return NextResponse.json({ success: true, message: 'No recipients found', recipients_count: 0 });
        }

        // Bulk insert via unnest
        const ids = recipientIds.map(() => randomUUID());
        await pool.query(
            `INSERT INTO notifications
               (id, recipient_id, sender_id, type, title, message, batch_id, is_read, created_at)
             SELECT UNNEST($1::uuid[]), UNNEST($2::uuid[]), $3, $4, $5, $6, $7, false, NOW()`,
            [ids, recipientIds, user.id, type, title, message, batch_id || null]
        );

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
