# Notification System - Production Ready

## Overview

This document describes the complete notification system implementation for the **Academic Compass** platform. It covers In-App notifications for Timetables, Assignments, Proctoring, Events, and System Administration.

**Current Status:** ✅ **Core In-App Workflows Implemented** | ⚠️ **Email/Reminders Pending**

## 🔧 Database Migration

**Run the following SQL migration on your Supabase database:**

```bash
# File location
database/migrations/complete_notification_system.sql
```

---

## 📢 Notification Types (Implemented)

### Timetable Notifications
| Type | Description | Recipients | Status |
|------|-------------|------------|--------|
| `timetable_published` | Timetable is published | Students, Faculty in batch/department | ✅ Active |
| `timetable_approved` | Timetable approved by HOD | Creator | ✅ Active |
| `timetable_rejected` | Timetable rejected by HOD | Creator | ✅ Active |
| `schedule_change` | Published timetable updated | Affected students/faculty | ✅ Active |
| `approval_request` | Timetable submitted for review | Publishers/HODs | ✅ Active |
| `conflict_detected` | Scheduling conflicts found | Creator, Publishers | ✅ Active |

### Assignment & Proctoring Notifications
| Type | Description | Recipients | Status |
|------|-------------|------------|--------|
| `assignment_created` | New assignment posted | Students in batch | ✅ Active |
| `assignment_submitted` | Student submitted assignment | Faculty/Creator | ✅ Active |
| `assignment_graded` | Assignment has been graded | Student | ✅ Active |
| `proctoring_violation` | **Violation detected (Tab Switch)** | Faculty/Creator | ✅ Active |
| `assignment_due` | Assignment due reminder | Students | ⏳ Pending Cron |

### NEP Curriculum & Electives
| Type | Description | Recipients | Status |
|------|-------------|------------|--------|
| `nep_bucket_created` | Elective Bucket Created | Department Faculty | ✅ Active |
| `nep_bucket_published` | Bucket Published for Selection | Students in Batch | ✅ Active |
| `nep_selection_locked` | Student Selection Confirmed | Student | ✅ Active |
| `nep_subjects_added` | Faculty adds subjects | College Admin | ✅ Active |
| `nep_allotment_released`| Allotment Result announced | Batch Students | ⏳ Generic |

### Announcement & Event Notifications
| Type | Description | Recipients | Status |
|------|-------------|------------|--------|
| `announcement` | New announcement | Target audience (batch/dept/college) | ✅ Active |
| `event_created` | New event scheduled | Target audience | ✅ Active |
| `event_reminder` | Event reminder | Registered/target audience | ⏳ Pending Cron |
| `event_cancelled` | Event cancelled | Registered/target audience | ✅ Active |

### System Notifications (Super Admin)
| Type | Description | Recipients | Status |
|------|-------------|------------|--------|
| `system_alert` | System-wide alert (Global/College) | All users | ✅ Active |
| `maintenance_alert` | Scheduled maintenance | All users | ✅ Active |
| `resource_updated` | Resource availability changed | Affected faculty | ✅ Active |

---

## 🔌 API Endpoints (Wired up)

### Timetable Workflow
| Endpoint | Method | Notification Triggered |
|----------|--------|------------------------|
| `/api/timetables/publish` | POST | `approval_request`, `timetable_approved`, `timetable_rejected`, `timetable_published` |
| `/api/timetables/[id]/submit` | POST | `approval_request` |
| `/api/timetables/[id]/approve` | POST | `timetable_approved`, `timetable_published` |
| `/api/timetables/[id]/reject` | POST | `timetable_rejected` |

### Assignments & Proctoring
| Endpoint | Method | Notification Triggered |
|----------|--------|------------------------|
| `/api/assignments` | POST | `assignment_created` (if notifyStudents=true) |
| `/api/student/assignment/[id]/submit` | POST | `assignment_submitted`, **`proctoring_violation`** |
| `/api/assignments/[id]/grade/[submissionId]` | POST | `assignment_graded` |

### Communication Hub (Admin/Super Admin)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/system-alerts` | POST | Sends `system_alert` to College or Global (Super Admin) |
| `/api/announcements` | POST | Sends `announcement` to specific audience |

---

## 🚧 Pending / Future Work

The following features were identified in the workflow requirements but are **not yet implemented** (requires additional infrastructure):

### 1. Automated Reminders (Cron Jobs)
**Missing Component:** A scheduled task runner (e.g., Vercel Cron, GitHub Actions, or a dedicated Node.js worker).
*   **`assignment_due`**: "Assignment X is due in 1 hour."
*   **`event_reminder`**: "Event Y starts tomorrow."
*   **Implementation Strategy:** Create an API route `/api/cron/reminders` that checks DB for upcoming deadlines each hour.

### 2. Comprehensive Email Notifications
**Current Status:** Only `timetable_published` triggers an email via `/api/email/sendUpdate`.
**Gap:**
*   High-Priority Alerts (Proctoring Violations, System Alerts) currently only send In-App notifications.
*   **Recommendation:** Integrate `emailService` into `notificationService.ts` for 'Urgent' priority notifications.

### 3. Parent/Guardian Alerts
**Gap:** No "Guardian" role or relationship exists in the User schema.
*   **Requirement:** "Notify Parent of Absence/Grades".
*   **Action:** Requires Schema update to link Students to Parents.

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

### Step 3: Test Assignment & Proctoring
1. Create an assignment with **"Proctoring Enabled"**.
2. **Student:** Attempt to switch tabs during the test (simulate violation). Submit.
3. **Faculty:** Check Bell icon for **"Proctoring Alert"**.

### Step 4: Test Communication Hub
1. **Super Admin:** Go to `/super-admin/communication`. Broadcast a "Global Maintenance" alert.
2. **User:** Log in as any student/faculty to verify the popup alert.

---

## 🗃️ Files Modified/Created

### Key Service
- `src/lib/notificationService.ts` - Central logic for all In-App notifications.

### New Pages
- `/admin/communication/page.tsx` - College Admin Hub.
- `/super-admin/communication/page.tsx` - Super Admin Hub.

### Modified APIs
- `src/app/api/assignments/route.ts`
- `src/app/api/student/assignment/[id]/submit/route.ts` (Added Proctoring Hooks)
- `src/components/DashboardHeader.tsx` (Live Notification Feed)

---

## � Ready for Production?
*   ✅ **In-App System**: **YES**. Fully functional.
*   ⚠️ **Email System**: **PARTIAL**. (Timetables only).
*   ⚠️ **Reminders**: **NO**. (Needs Cron).
