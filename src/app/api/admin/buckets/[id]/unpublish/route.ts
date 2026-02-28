import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

        const allowedRoles = ['college_admin', 'admin'];
        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        const { id } = await params;

        // Mark bucket as unpublished
        const { error } = await supabase
            .from('elective_buckets')
            .update({
                is_published: false,
                is_live_for_students: false
            })
            .eq('id', id);

        if (error) {
            console.error('Error unpublishing bucket:', error);
            throw error;
        }

        return NextResponse.json({
            success: true,
            message: 'Bucket unpublished successfully'
        });
    } catch (error: any) {
        console.error('Error unpublishing bucket:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
