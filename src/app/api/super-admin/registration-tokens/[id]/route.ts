import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireRoles } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch single token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

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

// PATCH - Reactivate a used token or extend expiry
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();
    const { action, expiresInDays } = body;

    // Check if token exists
    const { data: existingToken, error: checkError } = await supabase
      .from('registration_tokens')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingToken) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    if (action === 'reactivate') {
      // Calculate new expiry (default 7 days from now, or use provided value)
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + (expiresInDays || 7));

      const { data: updatedToken, error: updateError } = await supabase
        .from('registration_tokens')
        .update({ 
          is_used: false, 
          used_at: null,
          expires_at: newExpiry.toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error reactivating token:', updateError);
        return NextResponse.json(
          { error: 'Failed to reactivate token' },
          { status: 500 }
        );
      }

      // Generate the registration URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const registrationUrl = `${baseUrl}/college/register?token=${existingToken.token}`;

      return NextResponse.json({
        success: true,
        message: 'Token reactivated successfully',
        token: updatedToken,
        registrationUrl,
        expiresAt: newExpiry.toISOString()
      });
    }

    if (action === 'extend') {
      if (existingToken.is_used) {
        return NextResponse.json(
          { error: 'Cannot extend expiry of a used token' },
          { status: 400 }
        );
      }

      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + (expiresInDays || 7));

      const { data: updatedToken, error: updateError } = await supabase
        .from('registration_tokens')
        .update({ expires_at: newExpiry.toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error extending token expiry:', updateError);
        return NextResponse.json(
          { error: 'Failed to extend token expiry' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Token expiry extended successfully',
        token: updatedToken,
        expiresAt: newExpiry.toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "reactivate" or "extend"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in PATCH /api/super-admin/registration-tokens/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
