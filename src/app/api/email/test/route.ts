import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { emailService } from '@/services/email/emailService';

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { to } = await request.json();

    console.log('🧪 Testing email configuration...');

    // Verify SMTP connection first
    const isConnected = await emailService.verifyConnection();
    
    if (!isConnected) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'SMTP connection failed. Please check your email configuration.',
          configured: false
        },
        { status: 500 }
      );
    }

    // Send test email
    const result = await emailService.sendEmail({
      to: to || process.env.SMTP_USER!,
      subject: '✅ Test Email - Academic Compass',
      template: 'system/test',
      data: {
        testMessage: 'This is a test email from Academic Compass timetable system. If you received this, your email configuration is working correctly!',
        timestamp: new Date().toISOString(),
        collegeWebsite: process.env.COLLEGE_WEBSITE || 'http://localhost:3000',
      },
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${to || process.env.SMTP_USER}`,
        messageId: result.messageId,
        configured: true,
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          configured: true 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Test email API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        configured: false 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const isConfigured = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD
    );

    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        message: 'SMTP credentials not configured. Please set up environment variables.',
        required: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'],
      });
    }

    const isConnected = await emailService.verifyConnection();

    return NextResponse.json({
      configured: true,
      connected: isConnected,
      message: isConnected 
        ? 'Email service is configured and connected' 
        : 'Email service is configured but connection failed',
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        fromName: process.env.SMTP_FROM_NAME,
        fromEmail: process.env.SMTP_FROM_EMAIL,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        configured: false, 
        connected: false,
        error: error.message 
      },
      { status: 500 }
    );
  }
}
