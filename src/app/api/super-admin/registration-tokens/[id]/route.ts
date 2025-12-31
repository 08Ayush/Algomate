import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch single token
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data: token, error } = await supabase
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
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching token:', error);
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error in GET /api/super-admin/registration-tokens/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a token
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if token exists and is not used
    const { data: existingToken, error: checkError } = await supabase
      .from('registration_tokens')
      .select('is_used')
      .eq('id', id)
      .single();

    if (checkError || !existingToken) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    if (existingToken.is_used) {
      return NextResponse.json(
        { error: 'Cannot delete a used token' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('registration_tokens')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting token:', error);
      return NextResponse.json(
        { error: 'Failed to delete token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/super-admin/registration-tokens/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
