import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { email, uid, collegeName, adminName } = await request.json();

    if (!email || !uid) {
      return NextResponse.json(
        { error: 'Email and UID are required' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@academiccompass.com',
      to: email,
      subject: `Your Admin Credentials - ${collegeName || 'Academic Compass'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">Your Admin Credentials</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="color: #475569; line-height: 1.6;">
              Dear ${adminName || 'Administrator'},
            </p>
            <p style="color: #475569; line-height: 1.6;">
              Here are your login credentials for <strong>${collegeName || 'Academic Compass'}</strong>.
            </p>

            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e293b; margin-top: 0;">Login Credentials</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; color: #64748b; border-bottom: 1px solid #e2e8f0;">Admin UID:</td>
                  <td style="padding: 12px 0; color: #1e293b; font-weight: bold; font-family: monospace; border-bottom: 1px solid #e2e8f0; text-align: right;">${uid}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #64748b;">Password:</td>
                  <td style="padding: 12px 0; color: #1e293b; font-style: italic; text-align: right;">The password you set during registration</td>
                </tr>
              </table>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border: 1px solid #fcd34d; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>⚠️ Important:</strong> Keep these credentials secure and do not share them with anyone. 
                If you forget your password, use the "Forgot Password" option on the login page.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/login" 
                 style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Go to Login
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">

            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              This email was sent by Academic Compass ERP.<br>
              If you didn't request these credentials, please ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: 'Credentials sent successfully' });

  } catch (error: any) {
    console.error('Send credentials email error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
