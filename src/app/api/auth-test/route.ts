import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/shared/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('Auth test endpoint called');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication failed',
        debug: {
          hasAuthHeader: !!request.headers.get('authorization'),
          authHeader: request.headers.get('authorization')?.substring(0, 20) + '...'
        }
      }, { status: 401 });
    }

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