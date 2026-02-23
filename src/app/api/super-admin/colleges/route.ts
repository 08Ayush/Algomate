import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/shared/database/client';

// GET - List all colleges with counts
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching colleges from database...');

    // First get all colleges
    const { data: colleges, error } = await supabaseAdmin
      .from('colleges')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Colleges fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch colleges', details: error.message },
        { status: 500 }
      );
    }

    console.log(`Found ${colleges?.length || 0} colleges`);

    // If no colleges, return empty array immediately
    if (!colleges || colleges.length === 0) {
      return NextResponse.json({ colleges: [] });
    }

    // Get counts for each college
    const collegesWithCounts = await Promise.all(
      colleges.map(async (college) => {
        // Count departments
        const { count: deptCount } = await supabaseAdmin
          .from('departments')
          .select('*', { count: 'exact', head: true })
          .eq('college_id', college.id);

        // Count users
        const { count: userCount } = await supabaseAdmin
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('college_id', college.id);

        return {
          ...college,
          _count: {
            departments: deptCount || 0,
            users: userCount || 0
          }
        };
      })
    );

    return NextResponse.json({ colleges: collegesWithCounts });

  } catch (error: any) {
    console.error('Colleges API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new college
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      code,
      address,
      city,
      state,
      country = 'India',
      pincode,
      phone,
      email,
      website,
      academic_year = '2025-26',
      semester_system = 'semester',
      is_active = true
    } = body;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: 'College name and code are required' },
        { status: 400 }
      );
    }

    // Check if college code or name already exists
    const { data: existingCollege } = await supabaseAdmin
      .from('colleges')
      .select('id, name, code')
      .or(`code.eq.${code},name.eq.${name}`)
      .single();

    if (existingCollege) {
      if (existingCollege.code === code) {
        return NextResponse.json(
          { error: 'College code already exists' },
          { status: 400 }
        );
      }
      if (existingCollege.name === name) {
        return NextResponse.json(
          { error: 'College name already exists' },
          { status: 400 }
        );
      }
    }

    // Create college
    const { data: newCollege, error } = await supabaseAdmin
      .from('colleges')
      .insert({
        id: crypto.randomUUID(),
        name,
        code,
        address,
        city,
        state,
        country,
        pincode,
        phone,
        email,
        website,
        academic_year,
        semester_system,
        is_active
      })
      .select()
      .single();

    if (error) {
      console.error('College creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create college' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'College created successfully',
      college: newCollege
    });

  } catch (error: any) {
    console.error('College creation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
