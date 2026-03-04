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
      `UPDATE elective_buckets SET is_published = true, published_at = NOW(), published_by = $1 WHERE id = $2`,
      [user.id, id]
    );

    return NextResponse.json({ success: true, message: 'Bucket published successfully' });
  } catch (error: any) {
    console.error('Error publishing bucket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
