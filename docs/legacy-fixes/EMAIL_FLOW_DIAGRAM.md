# 🔄 Email Notification Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIMETABLE PUBLICATION FLOW                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  PUBLISHER ACTIONS   │
└──────────────────────┘
         │
         ├─── Option 1: Review Queue
         │    └─> Click "Approve & Publish"
         │
         └─── Option 2: Direct Publish
              └─> Click "Publish" in AI Creator
         │
         ▼
┌──────────────────────────────────────────┐
│  System Updates Timetable Status         │
│  ✓ generated_timetables.status           │
│    → 'published'                         │
│  ✓ workflow_approvals                    │
│    → 'approved'                          │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  POST /api/email/sendUpdate              │
│  Body: {                                 │
│    timetableId: "uuid",                  │
│    publishedBy: "Publisher Name"         │
│  }                                       │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Fetch Timetable Details                 │
│  ✓ Batch information                     │
│  ✓ Course details                        │
│  ✓ Department info                       │
│  ✓ Academic year                         │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Query Database for Recipients           │
│                                          │
│  Students Query:                         │
│  SELECT * FROM users                     │
│  WHERE role = 'student'                  │
│    AND course_id = <course_id>           │
│    AND current_semester = <semester>     │
│    AND email IS NOT NULL                 │
│                                          │
│  Faculty Query:                          │
│  SELECT * FROM users                     │
│  WHERE role = 'faculty'                  │
│    AND department_id = <dept_id>         │
│    AND email IS NOT NULL                 │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Prepare Email Content                   │
│  ✓ Render Handlebars template            │
│  ✓ Personalize for each recipient        │
│  ✓ Add recipient name                    │
│  ✓ Include timetable details             │
│  ✓ Generate view URL                     │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Send Emails (Batch Processing)          │
│                                          │
│  For each recipient:                     │
│  ┌────────────────────────────┐          │
│  │ 1. Render personalized HTML│          │
│  │ 2. Send via SMTP            │          │
│  │ 3. Log to notifications DB  │          │
│  │ 4. Handle errors gracefully │          │
│  └────────────────────────────┘          │
└──────────────────────────────────────────┘
         │
         ├─────────────────┬──────────────┐
         ▼                 ▼              ▼
┌─────────────┐   ┌─────────────┐  ┌──────────────┐
│  Student 1  │   │  Student 2  │  │  Faculty 1   │
│  📧 Email   │   │  📧 Email   │  │  📧 Email    │
└─────────────┘   └─────────────┘  └──────────────┘
         │                 │              │
         ▼                 ▼              ▼
┌─────────────────────────────────────────────────┐
│         Email Inbox (Gmail, Outlook, etc)       │
│                                                 │
│  📧 New Timetable Published - Semester 3        │
│                                                 │
│  Hello Ayush,                                   │
│                                                 │
│  Great news! A new timetable has been          │
│  published for B.Ed Semester 3...               │
│                                                 │
│  [View Your Timetable] (Blue Button)            │
└─────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Database Logging                        │
│  ✓ Insert into notifications table       │
│    {                                     │
│      user_id: "recipient-uuid",          │
│      type: "timetable_published",        │
│      title: "New Timetable Published",   │
│      metadata: {                         │
│        timetable_id: "...",              │
│        batch_id: "...",                  │
│        sent_via: "email"                 │
│      }                                   │
│    }                                     │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Return Statistics to Publisher          │
│  {                                       │
│    success: true,                        │
│    message: "Sent to 45 recipients",     │
│    stats: {                              │
│      total: 45,                          │
│      sent: 45,                           │
│      failed: 0,                          │
│      students: 40,                       │
│      faculty: 5                          │
│    }                                     │
│  }                                       │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Publisher Sees Success Message          │
│                                          │
│  ✅ Timetable approved and published     │
│      successfully!                       │
│                                          │
│  📧 Email notifications sent to:         │
│  • 40 students                           │
│  • 5 faculty members                     │
│  Total: 45/45 emails sent                │
└──────────────────────────────────────────┘
```

---

## 📊 Data Flow

### Input Data
```json
{
  "timetableId": "6a69a555-9a4b-43e2-bb97-72d63a2b65b7",
  "publishedBy": "Dr. Manoj Bramhe"
}
```

### Database Queries
```sql
-- Get timetable with relationships
SELECT t.*, b.*, c.*, d.*
FROM generated_timetables t
JOIN batches b ON t.batch_id = b.id
JOIN courses c ON b.course_id = c.id
JOIN departments d ON c.department_id = d.id
WHERE t.id = '6a69a555-...';

-- Get students
SELECT id, email, first_name, last_name
FROM users
WHERE role = 'student'
  AND course_id = 'df8020b0-...'
  AND current_semester = 3
  AND email IS NOT NULL;

-- Get faculty
SELECT id, email, first_name, last_name
FROM users
WHERE role = 'faculty'
  AND department_id = '3f4fda3d-...'
  AND email IS NOT NULL;
```

### Email Template Data
```javascript
{
  recipientName: "Ayush Kshirsagar",
  recipientRole: "Student",
  timetableTitle: "Semester 3 - 2025-26",
  batchName: "B.Ed Semester 3",
  section: "A",
  semester: 3,
  courseName: "Bachelor of Education",
  courseCode: "BED",
  departmentName: "Education Department",
  academicYear: "2025-26",
  publishedDate: "December 9, 2025",
  publishedTime: "3:45 PM",
  timetableUrl: "http://localhost:3000/student/timetable?id=...",
  viewUrl: "http://localhost:3000/student/dashboard"
}
```

### SMTP Request
```
From: Academic Compass <noreply@academiccompass.edu>
To: ayushkshirsagar28@gmail.com
Subject: 📅 New Timetable Published - B.Ed Semester 3
Content-Type: text/html; charset=UTF-8

[Rendered HTML from template]
```

---

## 🔄 Error Handling Flow

```
Send Email
    │
    ├─── Success ──> Log to DB ──> Count++
    │
    └─── Failure ──> Log Error ──> Continue
                          │
                          └─> Still count in stats
```

**Philosophy:** 
- Don't stop on individual email failures
- Log all errors for debugging
- Return comprehensive statistics
- Notify publisher about any failures

---

## 🎯 Success Scenarios

### Scenario 1: All Emails Sent Successfully
```
✅ Timetable approved and published successfully!

📧 Email notifications sent to:
• 40 students
• 5 faculty members
Total: 45/45 emails sent
```

### Scenario 2: Some Emails Failed
```
✅ Timetable approved and published successfully!

⚠️ Email notifications sent to:
• 38 students (2 failed)
• 5 faculty members
Total: 43/45 emails sent
```

### Scenario 3: Email Service Down
```
✅ Timetable approved and published successfully!

⚠️ Warning: Failed to send email notifications.
Please inform students manually.
```

---

## 📝 Key Design Decisions

1. **Non-Blocking Email Sending**
   - Timetable publishes even if emails fail
   - Email errors don't block workflow

2. **Batch Processing**
   - Send all emails in parallel
   - Use Promise.allSettled() for resilience

3. **Personalization**
   - Each email personalized with recipient name
   - Role-specific messaging

4. **Comprehensive Logging**
   - Every email logged to database
   - Full audit trail maintained

5. **User Feedback**
   - Clear success/failure messages
   - Detailed statistics shown
   - Actionable error messages

---

**Visual Flow Chart Last Updated:** December 9, 2025
