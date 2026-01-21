import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '@/shared/middleware/auth';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await authenticate(request);
        if (!user || user.role !== 'college_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await supabase
            .from('elective_buckets')
            .update({ is_published: false } as any)
            .eq('id', params.id);

        return NextResponse.json({
            success: true,
            message: 'Bucket unpublished successfully'
        });
    } catch (error: any) {
        console.error('Error unpublishing bucket:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
