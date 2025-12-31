import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch all registration tokens (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const { data: tokens, error } = await supabase
      .from('registration_tokens')
      .select(`
        *,
        demo_request:demo_requests(
          institution_name,
          contact_name,
          email,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tokens:', error);
      return NextResponse.json(
        { error: 'Failed to fetch registration tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Error in GET /api/super-admin/registration-tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
