# Notification System - Production Ready

## Overview

This document describes the complete notification system implementation for the Academic Compass platform.

## 🔧 Database Migration

**Run the following SQL migration on your Supabase database:**

```bash
# File location
database/migrations/complete_notification_system.sql
```

### What the migration does:
1. **Extends notification_type ENUM** with 20+ new notification types
2. **Adds columns to notifications table**: `content_type`, `content_id`, `priority`, `action_url`, `expires_at`
3. **Creates announcements table** for college/department/batch announcements
4. **Creates submission_question_grades table** for detailed assignment grading
5. **Adds performance indexes** for fast notification queries
6. **Sets up Row Level Security policies**

---

## 📢 Notification Types

### Timetable Notifications
| Type | Description | Recipients |
|------|-------------|------------|
| `timetable_published` | Timetable is published | Students, Faculty in batch/department |
| `timetable_approved` | Timetable approved by HOD | Creator |
| `timetable_rejected` | Timetable rejected by HOD | Creator |
| `schedule_change` | Published timetable updated | Affected students/faculty |
| `approval_request` | Timetable submitted for review | Publishers/HODs |
| `conflict_detected` | Scheduling conflicts found | Creator, Publishers |

### Assignment Notifications
| Type | Description | Recipients |
|------|-------------|------------|
| `assignment_created` | New assignment posted | Students in batch |
| `assignment_due` | Assignment due reminder | Students who haven't submitted |
| `assignment_submitted` | Student submitted assignment | Faculty/Creator |
| `assignment_graded` | Assignment has been graded | Student |

### Announcement & Event Notifications
| Type | Description | Recipients |
|------|-------------|------------|
| `announcement` | New announcement | Target audience (batch/dept/college) |
| `event_created` | New event scheduled | Target audience |
| `event_reminder` | Event reminder | Registered/target audience |
| `event_cancelled` | Event cancelled | Registered/target audience |

### System Notifications
| Type | Description | Recipients |
|------|-------------|------------|
| `system_alert` | System-wide alert | All users in college |
| `maintenance_alert` | Scheduled maintenance | All users |
| `resource_updated` | Resource availability changed | Affected faculty |
| `policy_update` | Platform policy changes | All users |

---

## 🔌 API Endpoints

### Timetable Workflow
| Endpoint | Method | Notification Triggered |
|----------|--------|------------------------|
| `/api/timetables/publish` | POST | `approval_request`, `timetable_approved`, `timetable_rejected`, `timetable_published` |
| `/api/timetables/[id]/submit` | POST | `approval_request` |
| `/api/timetables/[id]/approve` | POST | `timetable_approved`, `timetable_published` |
| `/api/timetables/[id]/reject` | POST | `timetable_rejected` |

### Assignments
| Endpoint | Method | Notification Triggered |
|----------|--------|------------------------|
| `/api/assignments` | POST | `assignment_created` (if notifyStudents=true) |
| `/api/student/assignment/[id]/submit` | POST | `assignment_submitted` |
| `/api/assignments/[id]/grade/[submissionId]` | POST | `assignment_graded` |

### Announcements
| Endpoint | Method | Notification Triggered |
|----------|--------|------------------------|
| `/api/announcements` | POST | `announcement` |
| `/api/announcements` | GET | - |

### Events
| Endpoint | Method | Notification Triggered |
|----------|--------|------------------------|
| `/api/events` | POST | `event_created` |
| `/api/events` | GET | - |

---

## 🎛️ Notification Options

All notification-triggering endpoints support these options:

```typescript
{
  notifyStudents: boolean,  // Default: true
  notifyFaculty: boolean,   // Default: true
}
```

### Example Usage

```typescript
// Create assignment with notifications
fetch('/api/assignments', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Quiz 1',
    batchId: '...',
    // ... other fields
    notifyStudents: true  // Students will receive notifications
  })
});

// Create announcement
fetch('/api/announcements', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Important Notice',
    content: 'This is the announcement content...',
    targetType: 'department',  // 'batch' | 'department' | 'college'
    notifyStudents: true,
    notifyFaculty: true,
    priority: 'high'
  })
});

// Publish timetable with notification control
fetch('/api/timetables/publish', {
  method: 'POST',
  body: JSON.stringify({
    action: 'approve',
    timetable_id: '...',
    notifyStudents: true,
    notifyFaculty: true
  })
});
```

---

## 🔔 UI Components

### NotificationBell Component
Location: `src/components/NotificationBell.tsx`

Features:
- Shows unread notification count
- Dropdown with recent notifications
- Click to navigate to relevant content
- Mark as read functionality
- Priority indicators (Urgent, Important)

### Notifications Page
Location: `src/app/notifications/page.tsx`

Features:
- Full list of all notifications
- Filter by read/unread status
- Filter by notification type (grouped by category)
- Mark all as read
- Refresh functionality
- Stats dashboard (Total, Unread, Read)

---

## 🧪 Testing the System

### Step 1: Run Database Migration
```sql
-- Run the complete_notification_system.sql in Supabase SQL Editor
```

### Step 2: Test Timetable Workflow
1. Create a timetable as Creator faculty
2. Submit for approval → Check if Publishers receive notification
3. Approve/Reject as Publisher → Check if Creator receives notification
4. On approval, check if students/faculty receive publication notification

### Step 3: Test Assignment Workflow
1. Create an assignment → Check if students receive notification
2. Submit as student → Check if faculty receives notification
3. Grade as faculty → Check if student receives notification

### Step 4: Test Announcements
1. Create announcement with different target types
2. Verify correct recipients receive notifications

---

## 🗃️ Files Modified/Created

### New Files
- `database/migrations/complete_notification_system.sql`
- `src/app/api/announcements/route.ts`
- `src/app/api/assignments/[id]/grade/[submissionId]/route.ts`
- `NOTIFICATION_SYSTEM.md` (this file)

### Modified Files
- `src/lib/notificationService.ts` - Enhanced with all notification functions
- `src/app/api/assignments/route.ts` - Added notification support
- `src/app/api/events/route.ts` - Added notification support
- `src/app/api/timetables/publish/route.ts` - Added notification triggers
- `src/app/api/timetables/[id]/submit/route.ts` - Added notification trigger
- `src/app/api/timetables/[id]/approve/route.ts` - Added notification triggers
- `src/app/api/timetables/[id]/reject/route.ts` - Added notification trigger
- `src/app/api/student/assignment/[id]/submit/route.ts` - Added notification trigger
- `src/app/notifications/page.tsx` - Extended for new notification types
- `src/components/NotificationBell.tsx` - Extended for new notification types

---

## 🔒 Security Notes

1. **Row Level Security**: All notification tables have RLS enabled
2. **Server-side only**: Notifications are created server-side using service role key
3. **User verification**: All endpoints verify user authentication before creating notifications
4. **College isolation**: Users can only see notifications from their own college

---

## 📈 Performance Considerations

1. **Indexed queries**: All common query patterns have indexes
2. **Singleton Supabase client**: Single instance reused across requests
3. **Bulk insert**: Multiple notifications created in single database call
4. **Non-blocking**: Notification failures don't break main operations
5. **Cleanup function**: `cleanup_expired_notifications()` removes old notifications

---

## 🚀 Ready for Production

The notification system is now production-ready with:
- ✅ Complete database schema
- ✅ All API integrations
- ✅ UI components updated
- ✅ RLS security policies
- ✅ Performance indexes
- ✅ Error handling
- ✅ Logging for debugging
