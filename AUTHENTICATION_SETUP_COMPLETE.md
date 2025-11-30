# Authentication Setup Guide

## Current Status ✅
- **Environment Variables**: Updated `.env` with proper auth tokens
- **Server Running**: http://localhost:3001 (port 3001 due to 3000 being in use)
- **Database Schema**: Ready for authentication setup

## Required Database Setup

### Step 1: Run Authentication Setup SQL
Execute the SQL file I created to set up the authentication system:

```bash
# In your Supabase SQL Editor, run:
/database/auth_setup.sql
```

This will:
- Create `admin_users` table with proper token support
- Migrate existing users from `users` table
- Generate authentication tokens
- Set up helper functions

### Step 2: Test Login Credentials

**Default Admin Credentials:**
- **Email**: `admin@svpcet.edu.in` (based on your college code)
- **Password**: `admin123`

**Super Admin Credentials:**
- **Email**: `superadmin@academiccompass.edu.in`  
- **Password**: `admin123`

## Frontend Usage

### Step 3: Login Process
```javascript
// Login API call
const response = await fetch('/api/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@svpcet.edu.in',
    password: 'admin123'
  })
});

const data = await response.json();
if (data.user) {
  // Store user data and token
  localStorage.setItem('user', JSON.stringify(data.user));
  localStorage.setItem('authToken', data.token);
  
  // Redirect to dashboard
  window.location.href = '/admin/dashboard';
}
```

### Step 4: API Authentication
The NEP curriculum APIs now support both:

**Method 1: Direct Token (Recommended)**
```javascript
// Use the token directly from login response
const token = data.token; // From login response

fetch('/api/nep/subjects?course=B.Tech&semester=1', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**Method 2: Base64 User Data (Fallback)**
```javascript
// Current admin dashboard method
const userData = localStorage.getItem('user');
const authToken = Buffer.from(userData).toString('base64');

fetch('/api/nep/subjects?course=B.Tech&semester=1', {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
});
```

## Testing the Fix

### Step 5: Test Authentication Flow

1. **Visit**: http://localhost:3001/admin/dashboard
2. **Login with**: admin@svpcet.edu.in / admin123
3. **Navigate to**: NEP Curriculum Builder
4. **Select**: Course and Semester
5. **Verify**: Subjects load without "No authentication token found" error

### Step 6: Debug Commands

**Check Database Setup:**
```sql
-- Verify admin_users table exists
SELECT COUNT(*) FROM admin_users;

-- Check created admin users
SELECT name, email, role, college_id, 
       SUBSTRING(token, 1, 20) || '...' as token_preview 
FROM admin_users WHERE is_active = true;

-- Test college association
SELECT au.name, au.email, c.name as college_name 
FROM admin_users au 
JOIN colleges c ON au.college_id = c.id;
```

**Browser Console Tests:**
```javascript
// Check current auth state
console.log('User:', localStorage.getItem('user'));
console.log('Token:', localStorage.getItem('authToken'));

// Test API endpoint
fetch('/api/auth-test', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(console.log);
```

## Environment Variables Summary

Your `.env` file now includes:
- `AUTH_SECRET`: Main authentication secret
- `AUTH_TOKEN`: Static token for testing
- `NEXTAUTH_SECRET`: NextAuth secret
- `AUTH_PROVIDER`: Set to 'supabase'
- Updated Supabase credentials

## Troubleshooting

### If Still Getting "No authentication token found":
1. Clear browser cache and localStorage
2. Restart development server: `npm run dev`
3. Check browser console for detailed error messages
4. Verify database setup completed successfully

### Common Issues:
- **Port Change**: App now runs on port 3001
- **Token Mismatch**: Use login API to get proper tokens
- **Database Missing**: Run auth_setup.sql in Supabase
- **College Association**: Ensure users have valid college_id

## Next Steps

After database setup:
1. Login via `/admin/dashboard`  
2. Navigate to NEP Curriculum Builder
3. Select course: "B.Tech", "M.Tech", etc.
4. Select semester: 1-8
5. Subjects should now load successfully with college-based filtering

The authentication system now supports both direct token validation and base64-encoded user data for backward compatibility.