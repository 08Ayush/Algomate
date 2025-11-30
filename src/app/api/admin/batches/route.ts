import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to authenticate user from token
async function authenticateUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decodedData = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    console.log('Decoded token data (updated):', { hasId: !!decodedData.id, hasCollegeId: !!decodedData.college_id });
    
    if (!decodedData.id) {
      return null;
    }

    // Check if user exists and get updated info
    const { data: user, error } = await supabase
      .from('users')
      .select('id, role, college_id, department_id, first_name, last_name, email, is_active')
      .eq('id', decodedData.id)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      console.log('Trying fallback authentication with users table');
      return null;
    }

    console.log('Authentication successful via decoded token (users fallback)');
    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Fetch batches based on user's college
    let query = supabase
      .from('batches')
      .select(`
        *,
        departments (
          id,
          name,
          code
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Filter by college for college admin
    if (user.role === 'college_admin' && user.college_id) {
      query = query.eq('college_id', user.college_id);
    }

    const { data: batches, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
    }

    return NextResponse.json({ 
      batches: batches || [],
      message: `Found ${batches?.length || 0} batches`
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}