import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validate a registration token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Check if token exists and is valid
    const { data: tokenData, error } = await supabaseAdmin
      .from('registration_tokens')
      .select('*')
      .eq('token', token)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !tokenData) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired registration token'
      });
    }

    // Get associated demo request data if available
    let demoRequestData = null;
    if (tokenData.demo_request_id) {
      const { data: demoRequest } = await supabaseAdmin
        .from('demo_requests')
        .select('institution_name, email, phone, city, state')
        .eq('id', tokenData.demo_request_id)
        .single();
      
      demoRequestData = demoRequest;
    }

    return NextResponse.json({
      valid: true,
      tokenData: demoRequestData || {
        institutionName: tokenData.institution_name,
        email: tokenData.email
      }
    });

  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}

// Generate a new registration token (for super admin)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { demoRequestId, email, institutionName, expiresInDays = 7 } = body;

    if (!email && !demoRequestId) {
      return NextResponse.json(
        { error: 'Email or demo request ID is required' },
        { status: 400 }
      );
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Store the token
    const { data, error } = await supabaseAdmin
      .from('registration_tokens')
      .insert({
        token,
        demo_request_id: demoRequestId || null,
        email: email || null,
        institution_name: institutionName || null,
        expires_at: expiresAt.toISOString(),
        is_used: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Generate the registration URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const registrationUrl = `${baseUrl}/college/register?token=${token}`;

    return NextResponse.json({
      success: true,
      token,
      registrationUrl,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration token' },
      { status: 500 }
    );
  }
}
