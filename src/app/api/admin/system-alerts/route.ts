import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { notifySystemAlert } from '@/lib/notificationService';
import { requireAuth } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// POST - Send a system-wide alert
export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate (Admin only)
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user; // Auth failed

        const allowedRoles = ['admin', 'platform_admin', 'college_admin', 'hod', 'super_admin'];
        if (!allowedRoles.includes(user.role || '')) {
            return NextResponse.json({ error: 'Unauthorized. Admin access required.', success: false }, { status: 403 });
        }

        const body = await request.json();
        const { title, message, priority = 'normal', collegeId, expiresAt } = body;

        if (!title || !message) {
            return NextResponse.json({ error: 'Title and message are required', success: false }, { status: 400 });
        }

        const notificationResult = await notifySystemAlert({
            title,
            message,
            collegeId: collegeId || user.college_id, // Default to user's college
            priority,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined
        });

        return NextResponse.json({
            success: true,
            data: notificationResult,
            message: `System alert sent to ${notificationResult.count} users`
        });

    } catch (error: any) {
        console.error('Error sending system alert:', error);
        return NextResponse.json({ error: error.message || 'Internal server error', success: false }, { status: 500 });
    }
}
