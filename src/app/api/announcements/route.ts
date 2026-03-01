import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { notifyAnnouncement } from '@/lib/notificationService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper function to decode and verify user from token

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

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        const { data: announcement, error: announcementError } = await supabase
            .from('announcements')
            .insert({
                college_id: user.college_id,
                created_by: user.id,
                title,
                content,
                target_type: targetType,
                target_id: actualTargetId,
                priority,
                is_pinned: isPinned,
                expires_at: expiresAt || null,
                attachments: attachments.length > 0 ? attachments : null,
                is_published: true,
                created_at: new Date().toISOString()
            })
            .select('id')
            .single();

        if (announcementError) {
            console.error('Announcement creation error:', announcementError);
            return NextResponse.json(
                { success: false, error: 'Failed to create announcement: ' + announcementError.message },
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

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { searchParams } = new URL(request.url);

        const limit = parseInt(searchParams.get('limit') || '20');
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;
        const targetType = searchParams.get('target_type');

        // Build query
        let query = supabase
            .from('announcements')
            .select(`
        *,
        users:created_by (id, first_name, last_name)
      `, { count: 'exact' })
            .eq('college_id', user.college_id)
            .eq('is_published', true);

        // Filter by target type if specified
        if (targetType) {
            query = query.eq('target_type', targetType);
        }

        // Filter out expired announcements
        query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

        // Order by pinned first, then by created_at
        query = query
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data: announcements, count, error } = await query;

        if (error) {
            console.error('Get announcements error:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch announcements: ' + error.message },
                { status: 500 }
            );
        }

        // Format announcements
        const formattedAnnouncements = (announcements || []).map((a: any) => ({
            ...a,
            creator: a.users ? {
                id: a.users.id,
                name: `${a.users.first_name || ''} ${a.users.last_name || ''}`.trim()
            } : null
        }));

        return NextResponse.json({
            success: true,
            announcements: formattedAnnouncements,
            meta: {
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (error: any) {
        console.error('Get announcements error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}
