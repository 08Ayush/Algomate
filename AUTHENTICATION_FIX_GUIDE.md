# NEP Curriculum Authentication Fix Guide

## Current Issue
The error "No authentication token found" occurs because:
1. The CurriculumBuilder component expects authentication data in localStorage
2. The Supabase configuration is incomplete (missing environment variables)
3. There's a mismatch between authentication methods

## Quick Fix Steps

### Step 1: Set Up Supabase Environment Variables
1. Go to your Supabase project dashboard (https://supabase.com/dashboard)
2. Navigate to **Settings > API**
3. Copy your project credentials
4. Update the `.env.local` file with your actual values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### Step 2: Test Authentication
1. Navigate to `/admin/dashboard` and ensure you're logged in
2. Open browser console and run: `console.log(localStorage.getItem('user'))`
3. You should see user data in JSON format

### Step 3: Test NEP API Endpoints
1. Go to `/nep-curriculum` page
2. Select course and semester
3. Check console for detailed error messages

## Debugging Steps

### Check User Data in Console
Open browser console and run:
```javascript
// Check if user data exists
const userData = localStorage.getItem('user');
console.log('User data:', userData);

// Check if it's valid JSON
if (userData) {
  try {
    const parsed = JSON.parse(userData);
    console.log('Parsed user:', parsed);
  } catch (e) {
    console.error('Invalid JSON in user data:', e);
  }
}
```

### Test Authentication Endpoint
Visit: `http://localhost:3000/api/auth-test`
This will show detailed authentication debug information.

### Manual API Test
```javascript
// In browser console, test the subjects API
const userData = localStorage.getItem('user');
if (userData) {
  const authToken = btoa(userData); // Base64 encode
  fetch('/api/nep/subjects?course=B.Tech&semester=1', {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  })
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
}
```

## Expected Flow
1. User logs in via `/admin/dashboard`
2. User data is stored in localStorage with key 'user'
3. CurriculumBuilder reads user data and creates base64 auth token
4. API endpoints decode token and validate user against database
5. Subjects and buckets are fetched with college-based filtering

## If Still Getting Errors

### Error: "Missing Supabase environment variables"
- Update `.env.local` with correct Supabase credentials
- Restart development server: `npm run dev`

### Error: "No user data found"
- Login again via `/admin/dashboard`
- Check if user data is in localStorage: `localStorage.getItem('user')`

### Error: "Database error while validating user"
- Check if `admin_users` table exists in your Supabase database
- Ensure the user record exists and `is_active` is true
- Verify `college_id` matches between token and database

## Database Requirements
Ensure these tables exist in your Supabase database:
- `admin_users` (with columns: id, name, email, role, college_id, is_active)
- `colleges` (with columns: id, name)
- `subjects` (with columns: id, code, name, college_id, semester, nep_category, etc.)
- `elective_buckets` (with columns: id, college_id, course, semester, bucket_name, etc.)

## Next Steps After Fix
1. Test subject fetching by selecting different courses/semesters
2. Test bucket creation and drag-and-drop functionality
3. Test curriculum saving functionality
4. Verify college-based data isolation (different college admins see different data)