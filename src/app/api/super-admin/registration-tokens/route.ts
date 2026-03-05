import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { emailService } from '@/services/email/emailService';

// GET - Fetch all registration tokens (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;

    const pool = getPool();
    const { rows: tokens } = await pool.query(`
      SELECT
        rt.*,
        CASE WHEN dr.id IS NOT NULL
          THEN json_build_object(
            'institution_name', dr.institution_name,
            'contact_name', dr.contact_name,
            'email', dr.email,
            'phone', dr.phone
          )
          ELSE NULL
        END AS demo_request
      FROM registration_tokens rt
      LEFT JOIN demo_requests dr ON dr.id = rt.demo_request_id
      ORDER BY rt.created_at DESC
    `);

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Error in GET /api/super-admin/registration-tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new registration token
export async function POST(request: NextRequest) {
  try {
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const {
      institution_name,
      email,
      demo_request_id,
      expires_in_days = 30,
      created_by
    } = body;

    // Validate required fields
    if (!institution_name || !email) {
      return NextResponse.json(
        { error: 'Institution name and email are required' },
        { status: 400 }
      );
    }

    // Generate unique token
    const token = `REG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);

    // Insert token
    const { data: newToken, error } = await supabase
      .from('registration_tokens')
      .insert({
        token,
        institution_name,
        email,
        demo_request_id: demo_request_id || null,
        expires_at: expiresAt.toISOString(),
        is_used: false,
        created_by: created_by || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating token:', error);
      return NextResponse.json(
        { error: 'Failed to create registration token' },
        { status: 500 }
      );
    }

    // Generate registration URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const registrationUrl = `${baseUrl}/college/register?token=${token}`;

    // Send registration link email to the institution contact
    const expiresFormatted = expiresAt.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    await emailService.sendEmail({
      to: email,
      subject: `Your Algomate Registration Link – ${institution_name}`,
      template: 'registration-link',
      data: { institutionName: institution_name, registrationUrl },
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%);padding:30px;border-radius:10px 10px 0 0;text-align:center;">
            <h1 style="color:white;margin:0;font-size:26px;">Algomate</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Smart Timetable Scheduler</p>
          </div>
          <div style="background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
            <h2 style="color:#1e293b;margin-top:0;">Your Private Registration Link</h2>
            <p style="color:#475569;line-height:1.7;">
              Congratulations! Your institution <strong>${institution_name}</strong> has been approved to join Algomate.
              Please use the link below to complete your college registration.
            </p>

            <div style="background:#f1f5f9;border-left:4px solid #3b82f6;padding:20px;border-radius:0 8px 8px 0;margin:24px 0;">
              <p style="color:#64748b;font-size:13px;margin:0 0 8px;">Your private registration link:</p>
              <a href="${registrationUrl}" style="color:#3b82f6;word-break:break-all;font-size:14px;">${registrationUrl}</a>
            </div>

            <div style="text-align:center;margin:28px 0;">
              <a href="${registrationUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%);color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
                Complete Registration
              </a>
            </div>

            <div style="background:#fef3c7;border:1px solid #fcd34d;padding:16px;border-radius:8px;margin:24px 0;">
              <p style="color:#92400e;margin:0;font-size:13px;">
                <strong>⚠️ Important:</strong> This link is unique to your institution and expires on <strong>${expiresFormatted}</strong>.
                Do not share it with anyone. It can only be used once.
              </p>
            </div>

            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
            <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
              This email was sent by Algomate. If you did not request this, please ignore it or contact
              <a href="mailto:support@algomate.io" style="color:#3b82f6;">support@algomate.io</a>.
            </p>
          </div>
        </div>`
    });

    return NextResponse.json({
      success: true,
      message: 'Registration token created and email sent successfully',
      token: newToken,
      registrationUrl
    });
  } catch (error) {
    console.error('Error in POST /api/super-admin/registration-tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
