# Quick Debug Steps

## You have the data (7 batches, time slots, classrooms) ✅

Now let's check why the save is still failing.

## Step 1: Check Console Logs

Open browser console (F12) and look for these specific logs when you click "Save Draft":

### Expected Logs:
```
👤 Full user object: { ... }
📋 User properties: {
  id: "...",
  department_id: "...",
  college_id: "...",
  ...
}
📤 Sending timetable save request: { ... }
```

### If you see:
```
❌ Missing user fields: {
  userId: undefined,
  departmentId: "...",
  collegeId: "...",
  ...
}
```

Then your user object is missing the `id` field!

## Step 2: Check localStorage

Paste this in browser console:
```javascript
// Check localStorage
const userStr = localStorage.getItem('user');
console.log('Raw user string:', userStr);

// Parse it
const user = JSON.parse(userStr);
console.log('Parsed user:', user);
console.log('User keys:', Object.keys(user));

// Check specific fields
console.log('Has id?', 'id' in user, '→', user.id);
console.log('Has userId?', 'userId' in user, '→', user.userId);
console.log('Has department_id?', 'department_id' in user, '→', user.department_id);
console.log('Has departmentId?', 'departmentId' in user, '→', user.departmentId);
console.log('Has college_id?', 'college_id' in user, '→', user.college_id);
console.log('Has collegeId?', 'collegeId' in user, '→', user.collegeId);
```

## Step 3: Run Diagnostic Queries

Copy the `DIAGNOSTIC_QUERIES.sql` file content and run it in Supabase SQL Editor.

**Pay special attention to:**

### Query 1 (Batch for Semester 3):
```sql
SELECT 
  b.id as batch_id,
  b.name,
  d.id as department_id,
  c.id as college_id
FROM batches b
JOIN departments d ON b.department_id = d.id
JOIN colleges c ON b.college_id = c.id
WHERE b.semester = 3 AND b.is_active = true
LIMIT 1;
```

Copy the `batch_id` from this result!

### Query 10 (Your User):
```sql
SELECT 
  u.id,
  u.department_id,
  u.college_id,
  d.name as department_name,
  c.name as college_name
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN colleges c ON u.college_id = c.id
WHERE u.email = 'your-email@example.com';  -- Replace with your email
```

Make sure your user has `department_id` and `college_id`!

## Step 4: Manual Test

If user object is incomplete, try this in browser console to test the API directly:

```javascript
// Get batch_id from Query 1 above
const batch_id = 'YOUR-BATCH-ID-FROM-QUERY-1';

// Get your user_id from Query 10
const user_id = 'YOUR-USER-ID-FROM-QUERY-10';

// Test the API directly
fetch('/api/timetables', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    assignments: [
      // Add at least one assignment here
      {
        subject: { id: 'subject-id', name: 'Test Subject', code: 'TEST101', subjectType: 'THEORY' },
        faculty: { id: 'faculty-id', firstName: 'John', lastName: 'Doe' },
        timeSlot: { id: 'time-slot-id', day: 'Monday', startTime: '09:00', endTime: '10:00' },
        duration: 1
      }
    ],
    createdBy: user_id,
    academicYear: '2025-26',
    semester: 3,
    departmentId: 'dept-id-from-query',
    collegeId: 'college-id-from-query',
    batchId: batch_id,
    title: 'Test Timetable'
  })
})
.then(r => r.json())
.then(data => console.log('✅ Response:', data))
.catch(err => console.error('❌ Error:', err));
```

## Expected Results:

### If Successful:
```json
{
  "success": true,
  "timetable": {
    "id": "...",
    "title": "Test Timetable",
    "status": "draft",
    "batch_id": "...",
    "task_id": "..."
  },
  "message": "Timetable saved successfully",
  "classes_created": 1
}
```

### If Failed:
Look at the error message - it will tell you EXACTLY what's wrong!

## Common Issues:

### Issue 1: "Missing: college ID"
**Cause:** User object doesn't have `college_id` OR frontend isn't sending it
**Fix:** Check Query 10 - does your user have college_id in database?

### Issue 2: "No active batch found"
**Cause:** batch_id not being sent, or batch doesn't exist
**Fix:** Use the batch_id from Query 1

### Issue 3: "Failed to create generation task"
**Cause:** Missing required fields in task creation
**Check:** Console logs will show which field

### Issue 4: "Failed to create scheduled classes"
**Cause:** Invalid subject_id, faculty_id, or time_slot_id
**Check:** Make sure IDs in your assignments are valid UUIDs from database

## Next Steps:

1. ✅ Run the diagnostic queries
2. ✅ Check localStorage in browser console
3. ✅ Share the results here
4. ✅ Try the manual API test if needed

**Share the output from Step 1 (Console Logs) and Step 2 (localStorage) and I'll help you fix it!**
