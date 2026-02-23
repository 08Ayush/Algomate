# SMTP Email Notification Setup Guide

## 🚀 Quick Start

The SMTP email notification system has been successfully implemented in your Academic Compass application!

## 📦 Installed Packages

- ✅ `nodemailer` - Email sending service
- ✅ `handlebars` - Email template rendering
- ✅ `juice` - CSS inlining for email compatibility
- ✅ `html-to-text` - HTML to plain text conversion
- ✅ `@types/nodemailer` - TypeScript definitions

## 📁 Created Files Structure

```
src/
├── services/
│   ├── email/
│   │   ├── emailService.ts          ✅ Main email service
│   │   └── emailTemplates.ts        ✅ Template renderer
│   └── notifications/
│       └── notificationService.ts   ✅ Notification orchestrator
├── app/api/
│   ├── email/test/route.ts          ✅ Test email endpoint
│   └── notifications/
│       ├── schedule-change/route.ts ✅ Schedule change API
│       ├── urgent-update/route.ts   ✅ Urgent update API
│       └── timetable-published/route.ts ✅ Timetable publish API
└── components/
    └── EmergencyNotifications.tsx   ✅ Admin UI component

templates/
└── email/
    ├── layouts/base.hbs             ✅ Base email layout
    ├── schedule/
    │   ├── change.hbs               ✅ Schedule change template
    │   └── urgent-update.hbs        ✅ Urgent update template
    ├── timetable/
    │   └── published.hbs            ✅ Timetable published template
    └── system/
        └── test.hbs                 ✅ Test email template
```

## ⚙️ Configuration Steps

### 1. Set Up Environment Variables

Copy `.env.example` and update with your SMTP credentials:

```bash
# For Gmail (Recommended for testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM_NAME=Academic Compass
SMTP_FROM_EMAIL=noreply@academiccompass.edu

# College Information
COLLEGE_NAME=Government College of Education
COLLEGE_WEBSITE=https://gcoej.edu.in
COLLEGE_SUPPORT_EMAIL=support@gcoej.edu.in
```

### 2. Gmail App Password Setup (If using Gmail)

1. Go to Google Account: https://myaccount.google.com
2. Security → 2-Step Verification (Enable if not already)
3. App Passwords: https://myaccount.google.com/apppasswords
4. Select App: "Mail"
5. Select Device: "Other (Custom name)" → "Academic Compass"
6. Copy the 16-character password
7. Use this password in `SMTP_PASSWORD` environment variable

### 3. Alternative SMTP Providers

#### SendGrid (Recommended for Production)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### Outlook/Office 365
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

## 🧪 Testing the Email System

### Method 1: Using the Test API

```bash
# Test GET endpoint to check configuration
curl http://localhost:3000/api/email/test

# Send test email
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com"}'
```

### Method 2: Using Browser Console

```javascript
// Check email configuration
fetch('/api/email/test')
  .then(r => r.json())
  .then(console.log);

// Send test email
fetch('/api/email/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: 'your-email@example.com' })
})
  .then(r => r.json())
  .then(console.log);
```

## 📧 Using the Notification System

### 1. Schedule Change Notification

```javascript
// API Call
fetch('/api/notifications/schedule-change', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    batchId: 'batch-uuid',
    subjectName: 'Data Structures',
    subjectCode: 'CS201',
    facultyName: 'Dr. Smith',
    changeType: 'reschedule', // or 'cancellation', 'room_change', 'time_change'
    originalDate: '2025-12-15',
    newDate: '2025-12-16',
    originalTime: '09:00',
    newTime: '14:00',
    originalRoom: 'Room 101',
    newRoom: 'Room 205',
    reason: 'Faculty emergency'
  })
})
```

### 2. Urgent Update Notification

```javascript
fetch('/api/notifications/urgent-update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    batchId: 'batch-uuid',
    updateMessage: 'All classes for tomorrow are postponed due to college event',
    effectiveDate: '2025-12-10',
    priority: 'urgent' // or 'high'
  })
})
```

### 3. Timetable Published Notification

```javascript
fetch('/api/notifications/timetable-published', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    timetableId: 'timetable-uuid'
  })
})
```

## 🎨 Using the Admin UI Component

### Add to Admin/Publisher Dashboard

```tsx
import EmergencyNotifications from '@/components/EmergencyNotifications';

export default function AdminDashboard() {
  return (
    <div>
      {/* Other admin components */}
      <EmergencyNotifications />
    </div>
  );
}
```

## 🔒 Security Features

1. ✅ **Authentication Required**: Only admin, publisher, and faculty can send notifications
2. ✅ **Environment Variable Protection**: Sensitive credentials stored securely
3. ✅ **Email Validation**: Validates email addresses before sending
4. ✅ **Rate Limiting Ready**: Structure supports rate limiting implementation
5. ✅ **HTML Sanitization**: Templates are pre-sanitized

## 📊 Notification Types

### 1. Schedule Change (`schedule_change`)
- **Use Case**: Class rescheduling, room changes, time changes, cancellations
- **Recipients**: All students and faculty in the batch
- **Template**: Red/yellow alert box with change details

### 2. Urgent Update (`urgent_update`)
- **Use Case**: Emergency announcements, important policy changes
- **Recipients**: All students and faculty in the batch
- **Template**: Red urgent alert box with high visibility

### 3. Timetable Published (`timetable_published`)
- **Use Case**: New timetable publication
- **Recipients**: All enrolled students and assigned faculty
- **Template**: Blue info box with timetable details

## 🔍 Troubleshooting

### Issue: "SMTP connection failed"
**Solutions:**
- Verify SMTP credentials in `.env` file
- Check if 2FA and App Password are enabled (Gmail)
- Verify port number (587 for TLS, 465 for SSL)
- Check firewall/antivirus settings

### Issue: "Emails going to spam"
**Solutions:**
- Use reputable SMTP provider (SendGrid, Mailgun)
- Set up SPF, DKIM, and DMARC records
- Avoid spam trigger words
- Use professional sender name

### Issue: "Template not found error"
**Solutions:**
- Verify `templates/email/` directory exists
- Check file paths and extensions (.hbs)
- Ensure templates are in correct subdirectories

## 📈 Next Steps

1. ✅ **Test Email Configuration**
   ```bash
   curl -X POST http://localhost:3000/api/email/test
   ```

2. ✅ **Add Emergency Notifications Component to Admin Dashboard**
   - Import and add `<EmergencyNotifications />` component

3. ✅ **Configure Production SMTP**
   - Sign up for SendGrid/Mailgun
   - Update environment variables

4. ✅ **Customize Email Templates**
   - Edit templates in `templates/email/`
   - Update college branding and colors

5. ✅ **Monitor Email Delivery**
   - Check `notifications` table for sent status
   - Review SMTP service logs

## 📞 Support

If you encounter any issues:
1. Check browser console for errors
2. Review server logs for SMTP errors
3. Verify environment variables are loaded
4. Test with curl/Postman first
5. Check SMTP provider documentation

## 🎯 Production Checklist

- [ ] Configure production SMTP provider (SendGrid/Mailgun)
- [ ] Set up domain email (noreply@yourdomain.com)
- [ ] Configure SPF, DKIM, DMARC records
- [ ] Test all email templates
- [ ] Set up email monitoring and alerts
- [ ] Configure rate limiting
- [ ] Add unsubscribe functionality (optional)
- [ ] Implement email queue for large batches
- [ ] Set up email analytics tracking
- [ ] Create email backup strategy

---

**System Status:** ✅ Fully Implemented and Ready to Use

**Documentation Version:** 1.0  
**Last Updated:** December 9, 2025
