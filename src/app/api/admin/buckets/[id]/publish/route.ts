import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

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

    // Mark bucket as published
    const { error } = await supabase
      .from('elective_buckets')
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
        published_by: user.id
      })
      .eq('id', id);

    if (error) {
      console.error('Error publishing bucket:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Bucket published successfully'
    });
  } catch (error: any) {
    console.error('Error publishing bucket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
