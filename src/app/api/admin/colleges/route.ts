import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Get user from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let user;
    try {
      user = JSON.parse(Buffer.from(token, 'base64').toString());
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    if (!['super_admin', 'admin', 'college_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // For college_admin, return only their assigned college
    if (user.role === 'college_admin') {
      if (!user.college_id) {
        return NextResponse.json(
          { error: 'College admin has no assigned college' },
          { status: 400 }
        );
      }

      const { data: college, error } = await supabase
        .from('colleges')
        .select('id, name, code, address, email, phone')
        .eq('id', user.college_id)
        .single();

      if (error) {
        console.error('Error fetching college:', error);
        return NextResponse.json(
          { error: 'Failed to fetch college' },
          { status: 500 }
        );
      }

      return NextResponse.json({ colleges: college ? [college] : [] });
    }

    // For super_admin and admin, return all colleges
    const { data: colleges, error } = await supabase
      .from('colleges')
      .select('id, name, code, address, email, phone')
      .order('name');

    if (error) {
      console.error('Error fetching colleges:', error);
      return NextResponse.json(
        { error: 'Failed to fetch colleges' },
        { status: 500 }
      );
    }

    return NextResponse.json({ colleges: colleges || [] });

  } catch (error) {
    console.error('Error in colleges API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let user;
    try {
      user = JSON.parse(Buffer.from(token, 'base64').toString());
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Only super_admin can create colleges
    if (user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, code, address, contact_email, contact_phone } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: college, error } = await supabase
      .from('colleges')
      .insert({
        name,
        code,
        address,
        contact_email,
        contact_phone
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating college:', error);
      return NextResponse.json(
        { error: 'Failed to create college' },
        { status: 500 }
      );
    }

    return NextResponse.json({ college }, { status: 201 });

  } catch (error) {
    console.error('Error in colleges API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
