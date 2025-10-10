# User Object Property Name Fix

## Problem
When clicking "Save Draft" or "Submit for Review", the error appeared:
```
User information is incomplete. Please log in again.
Missing user fields: {}
```

## Root Cause
The code was checking for specific property names (`user.id`, `user.department_id`, `user.college_id`), but the actual user object from localStorage might use different property naming conventions:
- `userId` vs `id`
- `departmentId` vs `department_id` (camelCase vs snake_case)
- `collegeId` vs `college_id`

## Solution
Updated the code to check for multiple possible property names and use whichever is available:

```typescript
// Try different property names that might be used
const userId = user?.id || user?.userId;
const departmentId = user?.department_id || user?.departmentId;
const collegeId = user?.college_id || user?.collegeId;
```

## Changes Made

### 1. Enhanced saveSchedule() Function
- Added comprehensive logging to show full user object
- Tries both camelCase and snake_case property names
- Shows which specific fields are missing if validation fails
- Uses flexible property names in the API payload

### 2. Enhanced submitForReview() Function
- Same flexible property name handling
- Updated to use `userId` variable instead of `user.id`
- Better error messages showing which specific fields are missing

## Testing Instructions

### Step 1: Check the User Object
1. Open browser console (F12)
2. Click "Save Draft"
3. Look for this log:
   ```
   👤 Full user object: { ... }
   📋 User properties: {
     id: "...",
     userId: "...",
     department_id: "...",
     departmentId: "...",
     college_id: "...",
     collegeId: "...",
     allKeys: [...]
   }
   ```
4. This will show you exactly which properties your user object has

### Step 2: Verify the Fix Works
If you see the user object logged properly, the save should now work!

### Step 3: If Still Failing
If you still see missing fields, check the console output:
```
❌ Missing user fields: {
  userId: undefined,
  departmentId: "...",
  collegeId: "...",
  missingFields: ["user ID"],
  fullUser: { ... }
}
```

This will tell you exactly which field is missing and show the full user object structure.

## Common User Object Formats

### Format 1: Snake Case (database format)
```json
{
  "id": "abc-123",
  "department_id": "dept-456",
  "college_id": "college-789",
  "role": "faculty",
  "faculty_type": "creator"
}
```

### Format 2: Camel Case (JavaScript format)
```json
{
  "userId": "abc-123",
  "departmentId": "dept-456",
  "collegeId": "college-789",
  "role": "faculty",
  "facultyType": "creator"
}
```

### Format 3: Mixed (some APIs use this)
```json
{
  "id": "abc-123",
  "departmentId": "dept-456",
  "collegeId": "college-789",
  "role": "faculty",
  "faculty_type": "creator"
}
```

The updated code now handles ALL these formats! ✅

## What to Do If User Object is Completely Empty

If the console shows `fullUser: {}` or `fullUser: null`, then the user is not logged in properly. You need to:

1. **Check localStorage:**
   ```javascript
   // In browser console
   console.log(localStorage.getItem('user'));
   ```

2. **If null or invalid, log in again:**
   - Go to `/login`
   - Enter your credentials
   - This will repopulate the user object

3. **Check the login API:**
   - Make sure the login endpoint returns all required fields
   - Fields needed: `id`, `department_id`, `college_id`, `role`, `faculty_type`

## Additional Debug Commands

Run these in the browser console to debug:

```javascript
// Check what's in localStorage
const userStr = localStorage.getItem('user');
console.log('Raw user string:', userStr);

// Parse and inspect
const user = JSON.parse(userStr);
console.log('Parsed user:', user);
console.log('User keys:', Object.keys(user));
console.log('Has id?', 'id' in user);
console.log('Has department_id?', 'department_id' in user);
console.log('Has college_id?', 'college_id' in user);
```

## Files Modified
- `src/components/ManualSchedulingComponent.tsx` - Updated saveSchedule() and submitForReview() functions

## Next Steps
1. Restart your dev server if it's running
2. Refresh the browser page
3. Try saving a timetable again
4. Check console for the `👤 Full user object` log
5. Share the console output if still having issues
