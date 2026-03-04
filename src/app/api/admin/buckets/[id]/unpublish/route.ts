import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;

        const allowedRoles = ['college_admin', 'admin'];
        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        const { id } = await params;
        await getPool().query(
            `UPDATE elective_buckets SET is_published = false, is_live_for_students = false WHERE id = $1`,
            [id]
        );

        return NextResponse.json({ success: true, message: 'Bucket unpublished successfully' });
    } catch (error: any) {
        console.error('Error unpublishing bucket:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
