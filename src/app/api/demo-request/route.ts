import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Initialize Supabase admin client
const supabaseAdmin = supabase;

interface DemoRequestData {
  institutionName: string;
  institutionType: string;
  website?: string;
  studentCount: string;
  facultyCount?: string;
  contactName: string;
  designation?: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  currentSystem?: string;
  challenges: string[];
  preferredDate?: string;
  preferredTime?: string;
  additionalNotes?: string;
}

// POST - Submit a new demo request
export async function POST(request: NextRequest) {
  try {
    const data: DemoRequestData = await request.json();

    // Validate required fields
    if (!data.institutionName || !data.institutionType || !data.studentCount ||
        !data.contactName || !data.email || !data.phone || !data.city || !data.state) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Store the demo request in database
    const { data: demoRequest, error: dbError } = await supabaseAdmin
      .from('demo_requests')
      .insert({
        institution_name: data.institutionName,
        institution_type: data.institutionType,
        website: data.website || null,
        student_count: data.studentCount,
        faculty_count: data.facultyCount || null,
        contact_name: data.contactName,
        designation: data.designation || null,
        email: data.email,
        phone: data.phone,
        city: data.city,
        state: data.state,
        country: data.country || 'India',
        current_system: data.currentSystem || null,
        challenges: data.challenges,
        preferred_date: data.preferredDate || null,
        preferred_time: data.preferredTime || null,
        additional_notes: data.additionalNotes || null,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // If the table doesn't exist, we'll still send the email
      if (dbError.code !== '42P01') { // 42P01 = table doesn't exist
        console.error('Failed to save demo request to database:', dbError);
      }
    }

    // Send notification email to admin
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Email to admin
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@algomate.io',
        to: process.env.ADMIN_EMAIL || 'admin@algomate.io',
        subject: `🎓 New Demo Request: ${data.institutionName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">New Demo Request</h1>
            </div>
            <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Institution Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; width: 40%;">Institution Name:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${data.institutionName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Type:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.institutionType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Students:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.studentCount}</td>
                </tr>
                ${data.facultyCount ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Faculty:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.facultyCount}</td>
                </tr>
                ` : ''}
                ${data.website ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Website:</td>
                  <td style="padding: 8px 0; color: #1e293b;"><a href="${data.website}">${data.website}</a></td>
                </tr>
                ` : ''}
              </table>

              <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-top: 20px;">Contact Information</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; width: 40%;">Name:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${data.contactName}</td>
                </tr>
                ${data.designation ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Designation:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.designation}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Email:</td>
                  <td style="padding: 8px 0; color: #1e293b;"><a href="mailto:${data.email}">${data.email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Phone:</td>
                  <td style="padding: 8px 0; color: #1e293b;"><a href="tel:${data.phone}">${data.phone}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Location:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.city}, ${data.state}, ${data.country}</td>
                </tr>
              </table>

              ${data.challenges.length > 0 ? `
              <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-top: 20px;">Challenges Faced</h2>
              <ul style="color: #1e293b; padding-left: 20px;">
                ${data.challenges.map(c => `<li style="padding: 4px 0;">${c}</li>`).join('')}
              </ul>
              ` : ''}

              ${data.preferredDate || data.preferredTime ? `
              <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-top: 20px;">Preferred Demo Schedule</h2>
              <p style="color: #1e293b;">
                ${data.preferredDate ? `Date: ${data.preferredDate}` : ''}
                ${data.preferredDate && data.preferredTime ? ' | ' : ''}
                ${data.preferredTime ? `Time: ${data.preferredTime}` : ''}
              </p>
              ` : ''}

              ${data.additionalNotes ? `
              <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-top: 20px;">Additional Notes</h2>
              <p style="color: #1e293b; background: #e2e8f0; padding: 15px; border-radius: 8px;">${data.additionalNotes}</p>
              ` : ''}

              <div style="margin-top: 30px; padding: 15px; background: #dbeafe; border-radius: 8px;">
                <p style="color: #1e40af; margin: 0;">
                  <strong>Action Required:</strong> Please review this request and schedule a demo call with the institution.
                </p>
              </div>
            </div>
          </div>
        `,
      });

      // Confirmation email to the requester
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@algomate.io',
        to: data.email,
        subject: 'Demo Request Received - Algomate ERP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">Algomate</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Enterprise ERP for Education</p>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1e293b; margin-top: 0;">Thank You for Your Interest!</h2>
              <p style="color: #475569; line-height: 1.6;">
                Dear ${data.contactName},
              </p>
              <p style="color: #475569; line-height: 1.6;">
                We have received your demo request for <strong>${data.institutionName}</strong>. 
                Our team is excited to show you how Algomate can transform your institution's 
                academic management.
              </p>

              <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1e293b; margin-top: 0;">What Happens Next?</h3>
                <ol style="color: #475569; padding-left: 20px;">
                  <li style="padding: 5px 0;">Our team will review your requirements</li>
                  <li style="padding: 5px 0;">We'll contact you within 24-48 hours to schedule the demo</li>
                  <li style="padding: 5px 0;">You'll receive demo credentials to explore the platform</li>
                </ol>
              </div>

              ${data.preferredDate ? `
              <p style="color: #475569; line-height: 1.6;">
                <strong>Your Preferred Schedule:</strong> ${data.preferredDate}${data.preferredTime ? ` at ${data.preferredTime}` : ''}
                <br>We'll do our best to accommodate this timing.
              </p>
              ` : ''}

              <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
                <p style="color: #475569; line-height: 1.6; margin-bottom: 5px;">
                  Have questions? Feel free to reply to this email or contact us at:
                </p>
                <p style="color: #3b82f6; margin: 0;">
                  📧 support@algomate.io | 📞 +91 XXXXXXXXXX
                </p>
              </div>

              <p style="color: #475569; line-height: 1.6; margin-top: 30px;">
                Best Regards,<br>
                <strong>The Algomate Team</strong>
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Demo request submitted successfully',
      requestId: demoRequest?.id
    });

  } catch (error) {
    console.error('Error processing demo request:', error);
    return NextResponse.json(
      { error: 'Failed to process demo request' },
      { status: 500 }
    );
  }
}

// GET - Retrieve demo requests (for admin)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin access (you'd typically validate the JWT token here)
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('demo_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ requests: data });

  } catch (error) {
    console.error('Error fetching demo requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch demo requests' },
      { status: 500 }
    );
  }
}
