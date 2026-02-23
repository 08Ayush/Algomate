# Admin Access Denied Error - FIXED ✅

## Problem
After successfully logging in as admin, you're getting "Access Denied" message when trying to access the admin dashboard.

## Root Causes

### 1. Frontend Role Check Issue ❌
**File**: `src/app/admin/dashboard/page.tsx`

The dashboard was only checking for `role === 'admin'`, but the database has `role = 'college_admin'`.

```tsx
// Before (WRONG)
if (user.role !== 'admin') {
  router.push('/login?message=Access denied');
  return;
}
```

### 2. Database Access Level Issue ❌
**Table**: `users` table in Supabase

From your screenshot, the admin user has:
- `role`: `college_admin` ✅ (Correct)
- `access_level`: `write` ❌ (WRONG - should be 'admin')

The `access_level` field controls what the user can do:
- `read` - Can only view data
- `write` - Can view and create data
- `admin` - Full access to all features
- `super_admin` - System-wide admin access

## Solutions

### Solution 1: Update Frontend Code ✅ (DONE)

**File**: `src/app/admin/dashboard/page.tsx`

**Changed**:
```tsx
// After (CORRECT)
if (user.role !== 'admin' && user.role !== 'college_admin') {
  router.push('/login?message=Access denied');
  return;
}
```

Also updated the `Faculty` interface to include `'college_admin'`:
```tsx
interface Faculty {
  // ...
  role: 'admin' | 'college_admin' | 'faculty';
  // ...
}
```

### Solution 2: Update Database Access Level ⚠️ (NEEDS YOUR ACTION)

You need to update the `access_level` in Supabase from `'write'` to `'admin'`.

#### Option A: Using Supabase Dashboard (EASIEST)

1. Open your Supabase dashboard (you already have it open in your screenshot)
2. Go to **Table Editor** → **users** table
3. Find the row with `college_uid = 'ADM000001'`
4. Click on the `access_level` cell (currently showing "write")
5. From the dropdown, select **"admin"**
6. The change will be saved automatically

#### Option B: Using SQL Editor

1. In Supabase, go to **SQL Editor**
2. Create a new query
3. Copy and paste this SQL:

```sql
-- Update access_level for college_admin users
UPDATE users
SET access_level = 'admin'
WHERE role = 'college_admin';

-- Verify the change
SELECT college_uid, first_name, last_name, role, access_level
FROM users
WHERE role = 'college_admin';
```

4. Click **Run** or press `Ctrl+Enter`
5. You should see the updated record with `access_level = 'admin'`

#### Option C: Using the Script File

I've created a SQL file for you: `fix-admin-access-level.sql`

1. Open your Supabase SQL Editor
2. Copy the contents from `fix-admin-access-level.sql`
3. Paste and run it

## What Each Access Level Means

| Access Level | Permissions |
|--------------|-------------|
| `read` | View data only (no create/edit/delete) |
| `write` | View + Create (limited edit/delete) |
| `admin` | Full access to all features ✅ **Use this for college_admin** |
| `super_admin` | System-wide admin (multi-college) |

## Expected Database Values for Admin User

```
college_uid:    ADM000001
role:           college_admin  ✅
access_level:   admin         ⚠️ (Currently 'write' - NEEDS UPDATE)
department_id:  NULL          ✅
```

## Testing After Fix

1. **Update the access_level in Supabase** (see options above)
2. **Logout and login again** as admin
3. You should now have full access to the admin dashboard
4. Test these features:
   - ✅ View departments
   - ✅ Create/edit/delete departments
   - ✅ View faculty
   - ✅ Create/edit/delete faculty
   - ✅ View classrooms
   - ✅ Create/edit/delete classrooms

## Files Modified

1. ✅ `src/app/admin/dashboard/page.tsx` - Updated role check
2. ⚠️ **Supabase `users` table** - YOU need to update `access_level`

## Quick Fix Summary

**Frontend**: ✅ DONE (automatically fixed by my changes)

**Database**: ⚠️ ACTION REQUIRED
1. Open Supabase Table Editor
2. Click on `users` table
3. Find admin user (ADM000001)
4. Change `access_level` from "write" to "admin"
5. Done!

---

**Note**: The frontend code is already fixed and will work once you update the `access_level` in the database. The change takes less than 10 seconds using the Supabase dashboard!
