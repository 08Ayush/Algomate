# URGENT: Get Full Error Details

## You're getting a 500 error but we need to see the EXACT error message!

## Step 1: Refresh and Try Again

1. **Hard refresh**: `Ctrl + F5`
2. Open console (F12)
3. Clear console (`Ctrl + L`)
4. Try to save timetable again
5. Look for these specific logs:

### What to Look For in Console:

**Should see:**
```
📤 Sending timetable save request: { ... }
📥 Save response: { error: "...", details: "...", hint: "..." }
📥 Response status: 500
📥 Full response data: { ... }
❌ Save failed with error: ...
❌ Error details: ...
❌ Error hint: ...
```

## Step 2: Check Network Tab

1. Open F12
2. Go to "Network" tab
3. Try to save timetable
4. Find the `/api/timetables` request (it will be RED)
5. Click on it
6. Go to "Response" tab
7. **Copy the ENTIRE response** and share it

## Step 3: Check Terminal/Server Logs

If you're running `npm run dev`, check that terminal window for error logs. You should see:

```
📥 Received timetable save request: { ... }
👤 Validating user exists: "uuid"
✅ User validated: { ... }
📝 Creating generation task...
❌ Error creating generation task: { ... }
```

**Share those logs!**

## Step 4: Manual Test (Quick)

Run this in browser console (F12):

```javascript
// Get user
const user = JSON.parse(localStorage.getItem('user'));

// Test fetch with detailed error handling
fetch('/api/timetables', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    assignments: [{
      subject: { id: 'a1b2c3d4', name: 'Test Subject', subjectType: 'THEORY' },
      faculty: { id: 'e5f6g7h8', firstName: 'Test', lastName: 'Faculty' },
      timeSlot: { id: '1', day: 'Monday', startTime: '09:00', endTime: '10:00' },
      duration: 1
    }],
    createdBy: user?.id || user?.userId,
    semester: 3,
    academicYear: '2025-26',
    title: 'Debug Test Timetable'
  })
})
.then(async response => {
  const data = await response.json();
  console.log('=== RESPONSE STATUS ===');
  console.log('Status:', response.status);
  console.log('OK:', response.ok);
  console.log('\n=== RESPONSE DATA ===');
  console.log(JSON.stringify(data, null, 2));
  return data;
})
.catch(err => {
  console.error('=== FETCH ERROR ===');
  console.error(err);
});
```

**Copy and paste the entire output here!**

## Step 5: Check Supabase Logs (If Possible)

Go to your Supabase dashboard → Logs → check for errors

## Most Likely Issues:

### Issue 1: User ID Invalid
```json
{
  "error": "Invalid user ID. User does not exist in database.",
  "success": false
}
```
**Fix:** Check if user exists in database

### Issue 2: Batch Not Found
```json
{
  "error": "No active batch found for semester 3",
  "success": false
}
```
**Fix:** Create a batch for semester 3

### Issue 3: Foreign Key Constraint
```json
{
  "error": "Failed to create generation task",
  "details": "insert or update on table violates foreign key constraint",
  "code": "23503"
}
```
**Fix:** Invalid reference (user_id or batch_id doesn't exist)

### Issue 4: Permission Denied
```json
{
  "error": "Failed to create generation task",
  "details": "permission denied for table timetable_generation_tasks"
}
```
**Fix:** Grant permissions or disable RLS

---

## IMMEDIATE NEXT STEP:

**Do Step 4 (Manual Test) RIGHT NOW and share the complete output!**

It will show us the EXACT error message with all details.
