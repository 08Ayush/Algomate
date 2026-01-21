# SMTP Email Notification Implementation Guide

## Overview
This guide provides a comprehensive implementation plan for integrating SMTP email notifications into the Academic Compass timetable management system. The email service will notify students and faculty about timetable updates, approvals, and schedule changes.

---

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Email Service Architecture](#email-service-architecture)
3. [SMTP Configuration](#smtp-configuration)
4. [Database Schema Integration](#database-schema-integration)
5. [Email Templates](#email-templates)
6. [Implementation Steps](#implementation-steps)
7. [API Endpoints](#api-endpoints)
8. [Security Best Practices](#security-best-practices)
9. [Testing Strategy](#testing-strategy)
10. [Monitoring and Logging](#monitoring-and-logging)

---

## System Requirements

### Dependencies
```json
{
  "dependencies": {
    "nodemailer": "^6.9.7",
    "handlebars": "^4.7.8",
    "juice": "^10.0.0",
    "html-to-text": "^9.0.5"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.14"
  }
}
```

### Environment Variables
```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM_NAME=Academic Compass
SMTP_FROM_EMAIL=noreply@academiccompass.edu

# Email Settings
EMAIL_ENABLED=true
EMAIL_QUEUE_ENABLED=true
EMAIL_RATE_LIMIT=50
EMAIL_BATCH_SIZE=10
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY=5000

# College Information
COLLEGE_NAME=Government College of Education
COLLEGE_WEBSITE=https://gcoej.edu.in
COLLEGE_SUPPORT_EMAIL=support@gcoej.edu.in
```

---

## Email Service Architecture

### Directory Structure
```
src/
├── services/
│   ├── email/
│   │   ├── emailService.ts          # Main email service
│   │   ├── emailQueue.ts            # Queue management
│   │   ├── emailTemplates.ts        # Template renderer
│   │   └── smtpConfig.ts            # SMTP configuration
│   └── notifications/
│       ├── notificationService.ts   # Notification orchestrator
│       └── notificationTypes.ts     # Type definitions
├── templates/
│   ├── email/
│   │   ├── layouts/
│   │   │   └── base.hbs             # Base email layout
│   │   ├── timetable/
│   │   │   ├── published.hbs        # Timetable published
│   │   │   ├── updated.hbs          # Timetable updated
│   │   │   ├── approved.hbs         # Timetable approved
│   │   │   └── rejected.hbs         # Timetable rejected
│   │   ├── schedule/
│   │   │   ├── change.hbs           # Schedule change
│   │   │   ├── cancellation.hbs     # Class cancellation
│   │   │   └── reminder.hbs         # Class reminder
│   │   └── system/
│   │       ├── welcome.hbs          # Welcome email
│   │       ├── password-reset.hbs   # Password reset
│   │       └── account-verified.hbs # Account verification
└── utils/
    └── emailHelpers.ts              # Utility functions
```

---

## SMTP Configuration

### Supported Email Providers

#### 1. Gmail (Recommended for Development)
```typescript
// src/services/email/smtpConfig.ts
const gmailConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD // App-specific password
  },
  tls: {
    rejectUnauthorized: false
  }
};
```

**Gmail Setup Steps:**
1. Enable 2-Factor Authentication
2. Generate App-Specific Password: https://myaccount.google.com/apppasswords
3. Use the 16-character password in `SMTP_PASSWORD`

#### 2. Outlook/Office 365
```typescript
const outlookConfig = {
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
};
```

#### 3. SendGrid (Recommended for Production)
```typescript
const sendgridConfig = {
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
};
```

#### 4. Custom SMTP Server
```typescript
const customConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
};
```

---

## Database Schema Integration

### Email Logs Table (Already exists: `notifications`)
```sql
-- Existing notifications table can be extended
ALTER TABLE notifications 
ADD COLUMN email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN email_sent_at TIMESTAMPTZ,
ADD COLUMN email_error TEXT,
ADD COLUMN email_retry_count INT DEFAULT 0;

CREATE INDEX idx_notifications_email_status 
ON notifications(email_sent, created_at) 
WHERE email_sent = FALSE;
```

### Email Queue Table (New)
```sql
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT,
    template_name VARCHAR(100),
    template_data JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
    priority INT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_queue_status ON email_queue(status, scheduled_at);
CREATE INDEX idx_email_queue_priority ON email_queue(priority DESC, created_at);
```

### Email Templates Table (Optional)
```sql
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(500) NOT NULL,
    html_template TEXT NOT NULL,
    text_template TEXT,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    version INT DEFAULT 1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Email Templates

### Base Layout Template
```handlebars
<!-- templates/email/layouts/base.hbs -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .footer { background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; }
        .button { background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
        .info-box { background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
        .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{collegeName}}</h1>
            <p>Academic Compass - Timetable Management System</p>
        </div>
        <div class="content">
            {{{body}}}
        </div>
        <div class="footer">
            <p>&copy; {{year}} {{collegeName}}. All rights reserved.</p>
            <p>
                <a href="{{collegeWebsite}}">Visit Website</a> | 
                <a href="mailto:{{supportEmail}}">Contact Support</a>
            </p>
            <p style="color: #6b7280; font-size: 11px;">
                This is an automated email. Please do not reply to this message.
            </p>
        </div>
    </div>
</body>
</html>
```

### Timetable Published Template
```handlebars
<!-- templates/email/timetable/published.hbs -->
<h2>New Timetable Published! 📅</h2>

<p>Hello {{recipientName}},</p>

<p>A new timetable has been published for your {{batchName}}.</p>

<div class="info-box">
    <strong>Timetable Details:</strong>
    <ul>
        <li><strong>Semester:</strong> {{semester}}</li>
        <li><strong>Academic Year:</strong> {{academicYear}}</li>
        <li><strong>Effective From:</strong> {{effectiveFrom}}</li>
        <li><strong>Published By:</strong> {{publishedBy}}</li>
        <li><strong>Published On:</strong> {{publishedAt}}</li>
    </ul>
</div>

<p style="text-align: center; margin: 30px 0;">
    <a href="{{timetableUrl}}" class="button">View Timetable</a>
</p>

<p><strong>What's Next?</strong></p>
<ul>
    <li>Review your class schedule</li>
    <li>Note down your classroom assignments</li>
    <li>Check for any special instructions</li>
    <li>Mark important dates on your calendar</li>
</ul>

<p>If you have any questions or concerns, please contact your class coordinator.</p>

<p>Best regards,<br>Academic Compass Team</p>
```

### Timetable Updated Template
```handlebars
<!-- templates/email/timetable/updated.hbs -->
<h2>Timetable Update Notice ⚠️</h2>

<p>Hello {{recipientName}},</p>

<p>The timetable for {{batchName}} has been updated. Please review the changes.</p>

<div class="warning-box">
    <strong>Update Summary:</strong>
    <ul>
        <li><strong>Updated On:</strong> {{updatedAt}}</li>
        <li><strong>Updated By:</strong> {{updatedBy}}</li>
        <li><strong>Reason:</strong> {{updateReason}}</li>
    </ul>
</div>

{{#if changedClasses}}
<p><strong>Changed Classes:</strong></p>
<table style="width: 100%; border-collapse: collapse;">
    <thead>
        <tr style="background: #f3f4f6;">
            <th style="padding: 10px; border: 1px solid #ddd;">Subject</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Previous</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Updated</th>
        </tr>
    </thead>
    <tbody>
        {{#each changedClasses}}
        <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">{{this.subject}}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">{{this.previous}}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">{{this.updated}}</td>
        </tr>
        {{/each}}
    </tbody>
</table>
{{/if}}

<p style="text-align: center; margin: 30px 0;">
    <a href="{{timetableUrl}}" class="button">View Updated Timetable</a>
</p>

<p>Please adjust your schedule accordingly and inform your peers about these changes.</p>

<p>Best regards,<br>Academic Compass Team</p>
```

### Schedule Change Notification
```handlebars
<!-- templates/email/schedule/change.hbs -->
<h2>Schedule Change Alert 🔔</h2>

<p>Hello {{recipientName}},</p>

<p>There has been a change to your class schedule. Please take note of the following:</p>

<div class="info-box">
    <strong>Change Details:</strong>
    <ul>
        <li><strong>Subject:</strong> {{subjectName}} ({{subjectCode}})</li>
        <li><strong>Date:</strong> {{classDate}}</li>
        <li><strong>Original Time:</strong> {{originalTime}}</li>
        <li><strong>New Time:</strong> {{newTime}}</li>
        <li><strong>Original Room:</strong> {{originalRoom}}</li>
        <li><strong>New Room:</strong> {{newRoom}}</li>
        <li><strong>Faculty:</strong> {{facultyName}}</li>
    </ul>
</div>

{{#if reason}}
<p><strong>Reason for Change:</strong> {{reason}}</p>
{{/if}}

<p style="text-align: center; margin: 30px 0;">
    <a href="{{scheduleUrl}}" class="button">View Full Schedule</a>
</p>

<p><strong>Action Required:</strong></p>
<ul>
    <li>Update your personal calendar</li>
    <li>Arrive at the new location on time</li>
    <li>Inform classmates who might have missed this notification</li>
</ul>

<p>Best regards,<br>Academic Compass Team</p>
```

### Faculty Assignment Notification
```handlebars
<!-- templates/email/timetable/faculty-assignment.hbs -->
<h2>Teaching Assignment Notification 👨‍🏫</h2>

<p>Dear {{facultyName}},</p>

<p>You have been assigned to teach the following classes for {{semester}} - {{academicYear}}.</p>

<div class="info-box">
    <strong>Your Teaching Schedule:</strong>
    
    {{#each assignments}}
    <div style="margin: 15px 0; padding: 10px; background: white; border-radius: 5px;">
        <strong>{{this.subjectName}} ({{this.subjectCode}})</strong>
        <ul style="margin: 5px 0;">
            <li>Batch: {{this.batchName}}</li>
            <li>Hours per Week: {{this.hoursPerWeek}}</li>
            <li>Room: {{this.classroom}}</li>
            <li>Days: {{this.scheduledDays}}</li>
        </ul>
    </div>
    {{/each}}
</div>

<p><strong>Total Teaching Load:</strong> {{totalHours}} hours per week</p>

<p style="text-align: center; margin: 30px 0;">
    <a href="{{timetableUrl}}" class="button">View Complete Timetable</a>
</p>

<p><strong>Next Steps:</strong></p>
<ul>
    <li>Review your class schedule and room assignments</li>
    <li>Prepare your course materials</li>
    <li>Check classroom facilities and equipment</li>
    <li>Contact HOD if you have any scheduling conflicts</li>
</ul>

<p>Best regards,<br>Academic Administration</p>
```

---

## Implementation Steps

### Step 1: Install Dependencies
```bash
npm install nodemailer handlebars juice html-to-text
npm install --save-dev @types/nodemailer
```

### Step 2: Create Email Service
```typescript
// src/services/email/emailService.ts
import nodemailer from 'nodemailer';
import { renderTemplate } from './emailTemplates';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    template: string;
    data: any;
    attachments?: any[];
  }) {
    try {
      const html = await renderTemplate(options.template, options.data);
      const text = this.convertHtmlToText(html);

      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: html,
        text: text,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('SMTP connection verified');
      return true;
    } catch (error) {
      console.error('SMTP verification failed:', error);
      return false;
    }
  }

  private convertHtmlToText(html: string): string {
    // Convert HTML to plain text
    const { convert } = require('html-to-text');
    return convert(html, {
      wordwrap: 130,
      selectors: [
        { selector: 'a', options: { ignoreHref: false } },
        { selector: 'img', format: 'skip' },
      ],
    });
  }
}

export const emailService = new EmailService();
```

### Step 3: Create Template Renderer
```typescript
// src/services/email/emailTemplates.ts
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import juice from 'juice';

export async function renderTemplate(templateName: string, data: any): Promise<string> {
  try {
    // Load base layout
    const layoutPath = path.join(process.cwd(), 'templates/email/layouts/base.hbs');
    const layoutContent = await fs.readFile(layoutPath, 'utf-8');
    
    // Load specific template
    const templatePath = path.join(process.cwd(), `templates/email/${templateName}.hbs`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    
    // Compile templates
    const layoutTemplate = Handlebars.compile(layoutContent);
    const bodyTemplate = Handlebars.compile(templateContent);
    
    // Render body
    const bodyHtml = bodyTemplate({
      ...data,
      collegeName: process.env.COLLEGE_NAME,
      collegeWebsite: process.env.COLLEGE_WEBSITE,
    });
    
    // Render full email with layout
    const fullHtml = layoutTemplate({
      body: bodyHtml,
      subject: data.subject,
      collegeName: process.env.COLLEGE_NAME,
      collegeWebsite: process.env.COLLEGE_WEBSITE,
      supportEmail: process.env.COLLEGE_SUPPORT_EMAIL,
      year: new Date().getFullYear(),
    });
    
    // Inline CSS for better email client compatibility
    const inlinedHtml = juice(fullHtml);
    
    return inlinedHtml;
  } catch (error) {
    console.error('Template rendering error:', error);
    throw error;
  }
}

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', (date: Date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

Handlebars.registerHelper('formatTime', (time: string) => {
  return new Date(`2000-01-01 ${time}`).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
});

Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
```

### Step 4: Create Notification Service
```typescript
// src/services/notifications/notificationService.ts
import { emailService } from '../email/emailService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class NotificationService {
  async notifyTimetablePublished(timetableId: string) {
    try {
      // Get timetable details
      const { data: timetable } = await supabase
        .from('generated_timetables')
        .select(`
          *,
          batch:batches(*),
          created_by_user:users!created_by(first_name, last_name)
        `)
        .eq('id', timetableId)
        .single();

      if (!timetable) throw new Error('Timetable not found');

      // Get all enrolled students
      const { data: students } = await supabase
        .from('student_batch_enrollment')
        .select('student:users!student_id(email, first_name, last_name)')
        .eq('batch_id', timetable.batch_id)
        .eq('is_active', true);

      // Get all assigned faculty
      const { data: faculty } = await supabase
        .from('scheduled_classes')
        .select('faculty:users!faculty_id(email, first_name, last_name)')
        .eq('timetable_id', timetableId);

      const recipients = [
        ...students?.map(s => s.student) || [],
        ...faculty?.map(f => f.faculty) || [],
      ];

      // Send emails
      for (const recipient of recipients) {
        if (!recipient?.email) continue;

        await emailService.sendEmail({
          to: recipient.email,
          subject: `New Timetable Published - ${timetable.batch.name}`,
          template: 'timetable/published',
          data: {
            recipientName: `${recipient.first_name} ${recipient.last_name}`,
            batchName: timetable.batch.name,
            semester: timetable.semester,
            academicYear: timetable.academic_year,
            effectiveFrom: timetable.effective_from,
            publishedBy: `${timetable.created_by_user.first_name} ${timetable.created_by_user.last_name}`,
            publishedAt: timetable.approved_at,
            timetableUrl: `${process.env.NEXT_PUBLIC_APP_URL}/timetables/${timetableId}`,
          },
        });

        // Log notification
        await supabase.from('notifications').insert({
          recipient_id: recipient.id,
          type: 'timetable_published',
          title: 'New Timetable Published',
          message: `A new timetable has been published for ${timetable.batch.name}`,
          timetable_id: timetableId,
          batch_id: timetable.batch_id,
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        });
      }

      return { success: true, notified: recipients.length };
    } catch (error) {
      console.error('Notification error:', error);
      throw error;
    }
  }

  async notifyScheduleChange(changeDetails: any) {
    // Similar implementation for schedule changes
  }

  async notifyFacultyAssignment(assignmentDetails: any) {
    // Similar implementation for faculty assignments
  }
}

export const notificationService = new NotificationService();
```

---

## API Endpoints

### POST /api/notifications/timetable-published
```typescript
// src/app/api/notifications/timetable-published/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/services/notifications/notificationService';

export async function POST(request: NextRequest) {
  try {
    const { timetableId } = await request.json();

    if (!timetableId) {
      return NextResponse.json(
        { error: 'Timetable ID is required' },
        { status: 400 }
      );
    }

    const result = await notificationService.notifyTimetablePublished(timetableId);

    return NextResponse.json({
      success: true,
      message: `Notifications sent to ${result.notified} recipients`,
      data: result,
    });
  } catch (error: any) {
    console.error('Notification API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notifications' },
      { status: 500 }
    );
  }
}
```

### POST /api/email/test
```typescript
// src/app/api/email/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/services/email/emailService';

export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json();

    const result = await emailService.sendEmail({
      to: to || process.env.SMTP_USER!,
      subject: 'Test Email - Academic Compass',
      template: 'system/test',
      data: {
        testMessage: 'This is a test email from Academic Compass',
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'Test email sent successfully' 
        : 'Failed to send test email',
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## Security Best Practices

### 1. Environment Variable Protection
```typescript
// Validate required environment variables on startup
const requiredEnvVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM_EMAIL',
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
```

### 2. Rate Limiting
```typescript
// Implement rate limiting for email sending
const rateLimiter = {
  maxPerHour: 100,
  maxPerDay: 500,
  perRecipient: 10,
};

// Use Redis or database to track email sending rates
```

### 3. Email Validation
```typescript
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeEmailContent(content: string): string {
  // Remove potentially malicious content
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}
```

### 4. Unsubscribe Mechanism
```typescript
// Add unsubscribe functionality
async function handleUnsubscribe(userId: string, notificationType: string) {
  await supabase
    .from('notification_preferences')
    .update({ [notificationType]: false })
    .eq('user_id', userId);
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// tests/email.test.ts
import { emailService } from '@/services/email/emailService';

describe('Email Service', () => {
  test('should verify SMTP connection', async () => {
    const isConnected = await emailService.verifyConnection();
    expect(isConnected).toBe(true);
  });

  test('should render email template', async () => {
    const html = await renderTemplate('timetable/published', {
      recipientName: 'Test User',
      batchName: 'B.Ed Sem 1',
    });
    expect(html).toContain('Test User');
    expect(html).toContain('B.Ed Sem 1');
  });

  test('should send test email', async () => {
    const result = await emailService.sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      template: 'system/test',
      data: { testMessage: 'Hello' },
    });
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests
```bash
# Test email sending manually
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com"}'
```

---

## Monitoring and Logging

### Email Logging
```typescript
// Create email log entry
async function logEmail(emailData: {
  recipientId: string;
  subject: string;
  status: 'sent' | 'failed';
  error?: string;
}) {
  await supabase.from('email_logs').insert({
    recipient_id: emailData.recipientId,
    subject: emailData.subject,
    status: emailData.status,
    error_message: emailData.error,
    sent_at: new Date().toISOString(),
  });
}
```

### Monitoring Metrics
```typescript
// Track email metrics
const emailMetrics = {
  totalSent: 0,
  totalFailed: 0,
  averageDeliveryTime: 0,
  bounceRate: 0,
  openRate: 0,
};

// Use analytics service to track email performance
```

---

## Production Deployment Checklist

- [ ] Configure production SMTP credentials (SendGrid/Mailgun)
- [ ] Set up email queue with Redis/Bull
- [ ] Implement retry mechanism for failed emails
- [ ] Add email bounce handling
- [ ] Set up monitoring and alerts
- [ ] Configure email rate limits
- [ ] Add unsubscribe functionality
- [ ] Test all email templates
- [ ] Verify DKIM/SPF/DMARC records
- [ ] Set up email analytics
- [ ] Create email backup strategy
- [ ] Document troubleshooting procedures

---

## Troubleshooting Common Issues

### Issue 1: Authentication Failed (Gmail)
**Solution:** Use App-Specific Password, not regular password
```
1. Go to Google Account → Security → 2-Step Verification
2. Generate App Password
3. Use the 16-character password in SMTP_PASSWORD
```

### Issue 2: Connection Timeout
**Solution:** Check firewall/network settings
```
# Test SMTP connection
telnet smtp.gmail.com 587
```

### Issue 3: Emails Going to Spam
**Solution:** 
- Set up SPF, DKIM, and DMARC records
- Use reputable SMTP provider
- Avoid spam trigger words
- Include unsubscribe link

---

## Additional Resources

- [Nodemailer Documentation](https://nodemailer.com/about/)
- [Handlebars Documentation](https://handlebarsjs.com/)
- [SendGrid Best Practices](https://sendgrid.com/resource/email-deliverability-guide/)
- [Email Template Design Guide](https://www.campaignmonitor.com/dev-resources/)

---

## Next Steps

1. **Phase 1 (Week 1):** Set up SMTP configuration and test connection
2. **Phase 2 (Week 2):** Create email templates and test rendering
3. **Phase 3 (Week 3):** Implement notification service and API endpoints
4. **Phase 4 (Week 4):** Add email queue and retry mechanism
5. **Phase 5 (Week 5):** Testing and production deployment
6. **Phase 6 (Week 6):** Monitoring and optimization

---

**Document Version:** 1.0  
**Last Updated:** December 9, 2025  
**Maintained By:** Academic Compass Development Team
