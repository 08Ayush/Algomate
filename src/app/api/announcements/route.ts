import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { notifyAnnouncement } from '@/lib/notificationService';

/**
 * POST /api/announcements
 * Create a new announcement and optionally send notifications
 */
export async function POST(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;

        // Only admins and faculty can create announcements
        if (!['super_admin', 'college_admin', 'admin', 'faculty'].includes(user.role)) {
            return NextResponse.json(
                { success: false, error: 'Insufficient permissions' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const {
            title,
            content,
            targetType = 'college', // 'batch' | 'department' | 'college'
            targetId,
            priority = 'normal',
            notifyStudents = true,
            notifyFaculty = true,
            expiresAt,
            isPinned = false,
            attachments = []
        } = body;

        // Validate required fields
        if (!title || !content) {
            return NextResponse.json(
                { success: false, error: 'Title and content are required' },
                { status: 400 }
            );
        }

        // Determine target ID based on type
        let actualTargetId = targetId;
        if (!actualTargetId) {
            if (targetType === 'college') {
                actualTargetId = user.college_id;
            } else if (targetType === 'department') {
                actualTargetId = user.department_id;
            }
        }

        if (!actualTargetId) {
            return NextResponse.json(
                { success: false, error: 'Target ID is required' },
                { status: 400 }
            );
        }

        // Insert announcement
        const pool = getPool();
        const insertResult = await pool.query(
            `INSERT INTO announcements
               (id, college_id, created_by, title, content, target_type, target_id, priority,
                is_pinned, expires_at, attachments, is_published, created_at, updated_at)
             VALUES
               (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW())
             RETURNING id`,
            [
                user.college_id, user.id, title, content, targetType, actualTargetId,
                priority, isPinned,
                expiresAt || null,
                attachments.length > 0 ? JSON.stringify(attachments) : null
            ]
        );

        const announcement = insertResult.rows[0];
        if (!announcement) {
            return NextResponse.json(
                { success: false, error: 'Failed to create announcement' },
                { status: 500 }
            );
        }

        // Send notifications
        const senderName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Admin';

        const notificationResult = await notifyAnnouncement({
            announcementId: announcement.id,
            title,
            message: content.length > 200 ? content.substring(0, 200) + '...' : content,
            senderId: user.id,
            senderName,
            targetType,
            targetId: actualTargetId,
            priority: priority as 'low' | 'normal' | 'high' | 'urgent',
            notifyStudents,
            notifyFaculty
        });

        console.log(`✅ Announcement created. Notifications sent: ${notificationResult.count}`);

        return NextResponse.json({
            success: true,
            announcement_id: announcement.id,
            message: 'Announcement created successfully',
            notificationsSent: notificationResult.count
        });

    } catch (error: any) {
        console.error('Announcement creation error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}

/**
 * GET /api/announcements
 * Fetch announcements for the current user
 */
export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;
        const targetType = searchParams.get('target_type');

        const pool = getPool();
        const params: any[] = [user.college_id];
        let whereExtra = '';

        if (targetType) {
            params.push(targetType);
            whereExtra += ` AND a.target_type = $${params.length}`;
        }

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM announcements a
             WHERE a.college_id = $1 AND a.is_published = true
               AND (a.expires_at IS NULL OR a.expires_at > NOW())
               ${whereExtra}`,
            params
        );
        const total = parseInt(countResult.rows[0].count, 10);

        params.push(limit, offset);
        const result = await pool.query(
            `SELECT a.*,
               CASE WHEN u.id IS NOT NULL THEN
                 json_build_object('id', u.id, 'first_name', u.first_name, 'last_name', u.last_name)
               ELSE NULL END AS users
             FROM announcements a
             LEFT JOIN users u ON u.id = a.created_by
             WHERE a.college_id = $1 AND a.is_published = true
               AND (a.expires_at IS NULL OR a.expires_at > NOW())
               ${whereExtra}
             ORDER BY a.is_pinned DESC, a.created_at DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const formattedAnnouncements = result.rows.map((a: any) => ({
            ...a,
            creator: a.users ? {
                id: a.users.id,
                name: `${a.users.first_name || ''} ${a.users.last_name || ''}`.trim()
            } : null
        }));

        return NextResponse.json({
            success: true,
            announcements: formattedAnnouncements,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });

    } catch (error: any) {
        console.error('Get announcements error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}
