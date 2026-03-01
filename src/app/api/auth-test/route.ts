import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('Auth test endpoint called');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));

    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        college_id: user.college_id
      }
    });
  } catch (error) {
    console.error('Auth test endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}