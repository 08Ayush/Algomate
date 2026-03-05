import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getPool } from '@/lib/db';

async function ensureContactMessagesTable() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Always save to database first — this is the reliable path
    try {
      await ensureContactMessagesTable();
      const pool = getPool();
      await pool.query(
        `INSERT INTO contact_messages (name, email, subject, message) VALUES ($1, $2, $3, $4)`,
        [name.trim(), email.trim().toLowerCase(), subject.trim(), message.trim()]
      );
    } catch (dbErr) {
      console.error('Failed to save contact message to DB:', dbErr);
      // Non-fatal — still attempt email below
    }

    // Only attempt email if SMTP credentials are configured
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
      });

      const fromLabel = `${process.env.SMTP_FROM_NAME || 'Algomate'} <${process.env.SMTP_FROM_EMAIL || smtpUser}>`;
      const contactTo = process.env.CONTACT_EMAIL || 'pygramalgomate@gmail.com';

      await transporter.sendMail({
        from: fromLabel,
        to: contactTo,
        replyTo: email,
        subject: `[Contact Form] ${subject}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#2563A3 0%,#5FB3B3 100%);padding:28px;border-radius:10px 10px 0 0;text-align:center;">
              <h2 style="color:white;margin:0;font-size:22px;">New Contact Message</h2>
              <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Algomate Website</p>
            </div>
            <div style="background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 0;color:#64748b;width:100px;vertical-align:top;">Name:</td>
                  <td style="padding:8px 0;color:#1e293b;font-weight:600;">${name}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#64748b;vertical-align:top;">Email:</td>
                  <td style="padding:8px 0;color:#1e293b;font-weight:600;">${email}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#64748b;vertical-align:top;">Subject:</td>
                  <td style="padding:8px 0;color:#1e293b;font-weight:600;">${subject}</td>
                </tr>
              </table>
              <div style="background:#f8fafc;border-left:4px solid #2563A3;padding:16px;border-radius:0 8px 8px 0;margin-top:16px;">
                <p style="color:#334155;margin:0;line-height:1.7;white-space:pre-wrap;">${message}</p>
              </div>
              <p style="color:#94a3b8;font-size:13px;margin-top:24px;">
                Reply directly to this email to respond to ${name}.
              </p>
            </div>
          </div>
        `,
      });

      // Auto-reply to sender
      await transporter.sendMail({
        from: fromLabel,
        to: email,
        subject: `We received your message – Algomate`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#2563A3 0%,#5FB3B3 100%);padding:28px;border-radius:10px 10px 0 0;text-align:center;">
              <h2 style="color:white;margin:0;font-size:22px;">Thanks for reaching out!</h2>
              <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Algomate</p>
            </div>
            <div style="background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
              <p style="color:#475569;line-height:1.7;">Hi ${name},</p>
              <p style="color:#475569;line-height:1.7;">
                We've received your message and our team will get back to you within 24 hours.
              </p>
              <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin:20px 0;">
                <p style="color:#64748b;margin:0;font-size:14px;"><strong>Your subject:</strong> ${subject}</p>
              </div>
              <p style="color:#475569;line-height:1.7;">
                In the meantime, feel free to explore our 
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/docs" style="color:#2563A3;">documentation</a>.
              </p>
              <p style="color:#94a3b8;font-size:13px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">
                Algomate · pygramalgomate@gmail.com · Nagpur, Maharashtra, India
              </p>
            </div>
          </div>
        `,
      });
    } else {
      console.log(`[Contact] SMTP not configured. Message from ${name} <${email}> saved to DB only.`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}
