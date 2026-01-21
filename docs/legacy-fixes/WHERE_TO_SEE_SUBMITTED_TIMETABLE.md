# ✅ Timetable Submitted Successfully!

## Where to See Your Submitted Timetable

### For Creators (You):
**Location:** `/faculty/timetables`
- Your timetable status changed from **"DRAFT"** → **"PENDING_APPROVAL"**
- You can see it in the timetables list with a yellow "Pending" badge

### For Publishers (Reviewers):
**Location:** `/faculty/review-queue`
- Publishers can see all pending timetables
- They can Approve or Reject your submission

---

## What Happened in Database

### 1. **generated_timetables** table updated:
```sql
UPDATE generated_timetables 
SET status = 'pending_approval' 
WHERE id = 'your-timetable-id';
```

### 2. **workflow_approvals** table - NEW RECORD created:
```sql
INSERT INTO workflow_approvals (
    timetable_id,
    workflow_step,
    performed_by,
    performed_at,
    comments
) VALUES (
    'your-timetable-id',
    'submitted_for_review',
    'your-user-id',
    NOW(),
    'Submitted for review by creator'
);
```

---

## How to Check

### Check in Your App:

1. **Stay on Timetables Page** (`/faculty/timetables`)
   - Your timetable should now show:
     - 🟡 **Status Badge:** "PENDING APPROVAL" (yellow)
     - ⏳ **Submitted:** Just now
     - ❌ **Submit Button:** Disabled (already submitted)

2. **Login as Publisher** (if you have publisher account)
   - Navigate to: `/faculty/review-queue`
   - You should see your timetable in the pending list
   - Shows: Title, Batch, Creator name, Submission time
   - Actions: "Approve & Publish" or "Reject"

### Check in Database (Supabase):

1. **Open Supabase Dashboard** → SQL Editor
2. **Run this query** to see your submission:

```sql
-- See your timetable status
SELECT 
    id,
    title,
    status,
    academic_year,
    semester,
    created_at,
    updated_at
FROM generated_timetables
WHERE created_by = 'd448a49d-5627-4782-87c7-fe34f72fab35'  -- Your user ID
ORDER BY created_at DESC
LIMIT 5;
```

3. **Check workflow history:**

```sql
-- See workflow approval records
SELECT 
    wa.id,
    gt.title as timetable_title,
    wa.workflow_step,
    wa.performed_at,
    wa.comments,
    u.first_name || ' ' || u.last_name as performed_by_name
FROM workflow_approvals wa
JOIN generated_timetables gt ON wa.timetable_id = gt.id
JOIN users u ON wa.performed_by = u.id
WHERE gt.created_by = 'd448a49d-5627-4782-87c7-fe34f72fab35'
ORDER BY wa.performed_at DESC
LIMIT 10;
```

Expected result:
```
timetable_title          | workflow_step         | performed_at        | comments
-------------------------|----------------------|---------------------|-------------------------
Your Timetable Name      | submitted_for_review | 2025-10-10 12:30:00 | Submitted for review...
Your Timetable Name      | created              | 2025-10-10 12:00:00 | Timetable created
```

---

## Next Steps in Workflow

### Current Stage: ⏳ Pending Approval
Your timetable is waiting for publisher review.

### What Happens Next:

#### Option 1: ✅ Approved
Publisher clicks "Approve & Publish"
- Status changes: `pending_approval` → `published`
- Workflow record added: `workflow_step = 'approved'`
- Timetable becomes visible to students
- You get notified (future feature)

#### Option 2: ❌ Rejected
Publisher clicks "Reject" and enters reason
- Status changes: `pending_approval` → `rejected`
- Workflow record added: `workflow_step = 'rejected'` with rejection_reason
- You can edit and resubmit
- You see rejection reason

---

## Screenshots of Where to Look

### 1. Your Timetables Page
```
┌─────────────────────────────────────────────────┐
│  My Timetables                                   │
├─────────────────────────────────────────────────┤
│  🔍 Search: _____________                        │
│  Filter: [All] [Draft] [Pending] [Published]    │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ Your Timetable Title        🟡 PENDING   │   │
│  │ Batch: CSE Sem 5                         │   │
│  │ Submitted: Just now                      │   │
│  │ Classes: 24                              │   │
│  │ [View] [Delete] [Submit] ← DISABLED      │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 2. Publisher's Review Queue
```
┌─────────────────────────────────────────────────┐
│  Review Queue - Pending Approvals               │
├─────────────────────────────────────────────────┤
│  Pending: 1                                      │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ Your Timetable Title                     │   │
│  │ Created by: Prof. Yogita Nikhare         │   │
│  │ Batch: CSE Sem 5                         │   │
│  │ Submitted: 2 mins ago                    │   │
│  │ Classes: 24                              │   │
│  │ [View] [Approve & Publish] [Reject]      │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Quick Verification Commands

### Check timetable status:
```sql
SELECT title, status FROM generated_timetables 
WHERE id = 'your-timetable-id';
```
Should return: `pending_approval`

### Check workflow submission:
```sql
SELECT workflow_step, performed_at 
FROM workflow_approvals 
WHERE timetable_id = 'your-timetable-id' 
ORDER BY performed_at DESC LIMIT 1;
```
Should return: `submitted_for_review` with current timestamp

### Count pending timetables:
```sql
SELECT COUNT(*) as pending_count 
FROM generated_timetables 
WHERE status = 'pending_approval';
```
Should return at least 1

---

## If You Don't See It

### Refresh the Page
Press `Ctrl + F5` to hard refresh

### Check Console Logs
Open browser console (F12) and look for:
```
✅ Timetable submitted for review successfully
```

### Check Network Tab
Look for successful API calls to:
- `/api/timetables` or
- Supabase requests

### Verify in Database
Run the SQL queries above to confirm:
- Timetable status is `pending_approval`
- Workflow record exists with `submitted_for_review`

---

## Summary

✅ **Your timetable was successfully submitted!**
- Status: DRAFT → PENDING_APPROVAL
- Workflow: Created → Submitted for Review
- Location: `/faculty/timetables` (with yellow badge)
- Publisher sees it: `/faculty/review-queue`
- Waiting for: Publisher to approve or reject

**Next:** Wait for publisher to review, or login as publisher yourself to test the approval flow!

---

**Date:** October 10, 2025  
**Your User:** Prof. Yogita Nikhare  
**Timetable Status:** Pending Approval ⏳
