# Quick Action Guide

## Problem
Getting "User information is incomplete. Missing: college ID" when clicking Save Draft.

## Your Setup ✅
- **1 batch** for semester 3
- **1 batch** for semester 5
- **1 batch** for semester 7
- **7 classrooms** available

## Root Cause
Your user in localStorage is missing `college_id` and `department_id` fields.

## Quick Fix (Choose ONE)

### Option A: Let System Work Without User College/Department (FASTEST) ✅

**What we just did:**
- Removed frontend validation requiring college/department
- API will automatically derive college/department from batch
- You can save timetables without having these fields in your user object

**Try it now:**
1. **Refresh browser** (Ctrl+F5)
2. Go to manual scheduling page
3. Create an assignment
4. Click "Save Draft"
5. ✅ Should work now!

### Option B: Fix Your User in Database (PROPER FIX)

**Step 1: Check your user**
```sql
SELECT id, email, department_id, college_id 
FROM users 
WHERE email = 'your-email@example.com';
```

**Step 2: If NULL, update it**
```sql
-- Find college and department IDs
SELECT c.id, c.name, d.id, d.name
FROM colleges c
JOIN departments d ON d.college_id = c.id;

-- Update your user (replace the IDs)
UPDATE users 
SET 
  college_id = 'your-college-id',
  department_id = 'your-department-id'
WHERE email = 'your-email@example.com';
```

**Step 3: Re-login**
- Logout from app
- Login again
- localStorage will have updated user data

## Test It

1. Open browser console (F12)
2. Go to `/faculty/manual-scheduling`
3. Add one assignment
4. Enter a title
5. Click "Save Draft"

**Expected in Console:**
```
📤 Sending timetable save request: { ... }
✅ Created timetable: [uuid]
```

**Expected Alert:**
```
✅ Timetable saved successfully!
```

## Still Not Working?

Run this in browser console:
```javascript
// Check localStorage
const user = JSON.parse(localStorage.getItem('user'));
console.log('User:', user);
console.log('Keys:', Object.keys(user));
```

Then share the output!

## Files Changed
- ✅ `ManualSchedulingComponent.tsx` - Removed college/department requirement
- ✅ `/api/timetables/route.ts` - Already handles missing college/department
- ✅ Database schema - Uses batch_id FK (college/dept via relationship)

---

**TL;DR:** Just refresh and try saving again. If still fails, check user in database with SQL queries above.
