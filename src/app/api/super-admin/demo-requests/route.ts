import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch all demo requests (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    // Get status filter from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('demo_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching demo requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch demo requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error in GET /api/super-admin/demo-requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new demo request (used by the public demo form)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      institution_name,
      institution_type,
      website,
      student_count,
      faculty_count,
      contact_name,
      designation,
      email,
      phone,
      city,
      state,
      country = 'India',
      current_system,
      challenges,
      preferred_date,
      preferred_time,
      additional_notes
    } = body;

    // Validate required fields
    if (!institution_name || !institution_type || !student_count || 
        !contact_name || !email || !phone || !city || !state) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert demo request
    const { data: newRequest, error } = await supabase
      .from('demo_requests')
      .insert({
        institution_name,
        institution_type,
        website,
        student_count,
        faculty_count,
        contact_name,
        designation,
        email,
        phone,
        city,
        state,
        country,
        current_system,
        challenges,
        preferred_date,
        preferred_time,
        additional_notes,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating demo request:', error);
      return NextResponse.json(
        { error: 'Failed to create demo request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Demo request submitted successfully',
      request: newRequest
    });
  } catch (error) {
    console.error('Error in POST /api/super-admin/demo-requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
