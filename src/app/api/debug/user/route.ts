import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/shared/database/client';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .eq('email', email)
      .single();

    if (userError) {
      return NextResponse.json({
        found: false,
        error: userError.message
      });
    }

    // Get role-specific data
    let roleData = null;
    if (userData.role === 'student') {
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('id', userData.id)
        .single();
      roleData = { students: studentData ? [studentData] : [] };
    } else if (userData.role === 'faculty') {
      const { data: facultyData } = await supabase
        .from('faculty')
        .select('*')
        .eq('id', userData.id)
        .single();
      roleData = { faculty: facultyData ? [facultyData] : [] };
    }

    return NextResponse.json({
      found: true,
      user: { ...userData, ...roleData }
    });

  } catch (error: any) {
    console.error('Debug API error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Debug failed' },
      { status: 500 }
    );
  }
}