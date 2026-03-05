import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

const supabaseAdmin = supabase;

interface CollegeRegistrationData {
  collegeName: string;
  collegeCode: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  website?: string;
  establishedYear?: string;
  affiliatedUniversity?: string;
  accreditation?: string;
  principalName: string;
  principalEmail: string;
  principalPhone?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  adminDesignation?: string;
  adminPassword: string;
  academicYear: string;
  workingDays: string[];
  startTime: string;
  endTime: string;
  registrationToken?: string;
}

// Hash password using bcrypt (same as login verification)
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Generate a unique college UID for the admin
function generateCollegeUID(collegeCode: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${collegeCode.toUpperCase()}-ADMIN-${timestamp}`;
}

export async function POST(request: NextRequest) {
  try {
    const data: CollegeRegistrationData = await request.json();

    // Validate required fields
    if (!data.collegeName || !data.collegeCode || !data.adminEmail || !data.adminPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate registration token if provided
    let tokenData: any = null;
    if (data.registrationToken) {
      const { data: fetchedToken, error: tokenError } = await supabaseAdmin
        .from('registration_tokens')
        .select('*')
        .eq('token', data.registrationToken)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (tokenError || !fetchedToken) {
        return NextResponse.json(
          { error: 'Invalid or expired registration token' },
          { status: 400 }
        );
      }
      
      // Store token data for later use - don't mark as used yet!
      tokenData = fetchedToken;
    }

    // Check if college code already exists
    const { data: existingCollege } = await supabaseAdmin
      .from('colleges')
      .select('id')
      .eq('code', data.collegeCode.toUpperCase())
      .single();

    if (existingCollege) {
      return NextResponse.json(
        { error: 'A college with this code already exists' },
        { status: 400 }
      );
    }

    // Check if admin email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', data.adminEmail.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Create the college
    const collegeId = crypto.randomUUID();
    const { data: college, error: collegeError } = await supabaseAdmin
      .from('colleges')
      .insert({
        id: collegeId,
        name: data.collegeName,
        code: data.collegeCode.toUpperCase(),
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        website: data.website || null,
        established_year: data.establishedYear ? parseInt(data.establishedYear) : null,
        affiliated_university: data.affiliatedUniversity || null,
        accreditation: data.accreditation || null,
        principal_name: data.principalName,
        principal_email: data.principalEmail,
        principal_phone: data.principalPhone || null,
        academic_year: data.academicYear,
        working_days: data.workingDays,
        college_start_time: data.startTime + ':00',
        college_end_time: data.endTime + ':00',
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (collegeError) {
      console.error('College creation error:', collegeError);
      throw new Error('Failed to create college');
    }

    // Generate admin UID
    const adminUID = generateCollegeUID(data.collegeCode);

    // Hash password
    const passwordHash = await hashPassword(data.adminPassword);

    // Create the college admin user
    // Note: designation is NULL for college_admin role (not faculty)
    const { data: adminUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        first_name: data.adminFirstName,
        last_name: data.adminLastName,
        email: data.adminEmail.toLowerCase(),
        phone: data.adminPhone,
        college_uid: adminUID,
        password_hash: passwordHash,
        role: 'college_admin',
        college_id: college.id,
        is_active: true,
        email_verified: true, // Pre-verified since they came through registration
        created_at: new Date().toISOString()
      })
      .select('id, first_name, last_name, email, college_uid, role')
      .single();

    if (userError) {
      console.error('Admin user creation error:', userError);
      // Rollback college creation
      await supabaseAdmin.from('colleges').delete().eq('id', college.id);
      throw new Error('Failed to create admin user');
    }

    // NOW mark token as used - only after successful college and user creation
    if (data.registrationToken && tokenData) {
      await supabaseAdmin
        .from('registration_tokens')
        .update({ 
          is_used: true, 
          used_at: new Date().toISOString()
        })
        .eq('token', data.registrationToken);

      // Update demo request status if linked
      if (tokenData.demo_request_id) {
        await supabaseAdmin
          .from('demo_requests')
          .update({ status: 'registered' })
          .eq('id', tokenData.demo_request_id);
      }
    }

    // Send welcome email
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

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@algomate.io',
        to: data.adminEmail,
        subject: `Welcome to Algomate - ${data.collegeName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">Welcome to Algomate!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="color: #475569; line-height: 1.6;">
                Dear ${data.adminFirstName} ${data.adminLastName},
              </p>
              <p style="color: #475569; line-height: 1.6;">
                Congratulations! Your institution <strong>${data.collegeName}</strong> has been 
                successfully registered on Algomate ERP.
              </p>

              <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1e293b; margin-top: 0;">Your Login Credentials</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">College Code:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: bold; font-family: monospace;">${data.collegeCode.toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Admin UID:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: bold; font-family: monospace;">${adminUID}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Email:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${data.adminEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Role:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">College Administrator</td>
                  </tr>
                </table>
              </div>

              <h3 style="color: #1e293b;">Getting Started</h3>
              <ol style="color: #475569; padding-left: 20px;">
                <li style="padding: 5px 0;">Log in to your Admin Dashboard</li>
                <li style="padding: 5px 0;">Set up your departments and courses</li>
                <li style="padding: 5px 0;">Add faculty members and assign their roles</li>
                <li style="padding: 5px 0;">Create student batches and enroll students</li>
                <li style="padding: 5px 0;">Configure subjects and timetable constraints</li>
                <li style="padding: 5px 0;">Generate AI-powered timetables!</li>
              </ol>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" 
                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                  Go to Login
                </a>
              </div>

              <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
                <p style="color: #64748b; font-size: 14px;">
                  Need help? Contact our support team at support@algomate.io
                </p>
              </div>
            </div>
          </div>
        `,
      });

      // Also notify super admin about new registration
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@algomate.io',
        to: process.env.ADMIN_EMAIL || 'admin@algomate.io',
        subject: `🎉 New College Registered: ${data.collegeName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 10px 10px 0 0;">
              <h2 style="color: white; margin: 0;">New College Registration</h2>
            </div>
            <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 10px 10px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">College Name:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${data.collegeName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Code:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${data.collegeCode.toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Location:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.city}, ${data.state}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Admin:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.adminFirstName} ${data.adminLastName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Admin Email:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.adminEmail}</td>
                </tr>
              </table>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the registration if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'College registered successfully',
      college: {
        id: college.id,
        name: college.name,
        code: college.code
      },
      admin: {
        id: adminUser.id,
        uid: adminUser.college_uid,
        email: adminUser.email,
        role: adminUser.role
      }
    });

  } catch (error: any) {
    console.error('College registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register college' },
      { status: 500 }
    );
  }
}
