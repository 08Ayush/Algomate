# Debug: "Failed to create generation task" Error

## This Error Means
The API tried to INSERT into `timetable_generation_tasks` table but the database rejected it.

## Common Causes

### 1. Invalid User ID (Most Common) 🔴
**Symptom:** `created_by` foreign key constraint fails
**Cause:** The user ID from localStorage doesn't exist in the database

**Check:**
```sql
-- Replace with your email
SELECT id, email, first_name, last_name, role 
FROM users 
WHERE email = 'your-email@example.com';
```

**If no results:** You need to create a user account in the database
**If results:** Copy the `id` - this should match what's in your localStorage

### 2. Invalid Batch ID
**Symptom:** `batch_id` foreign key constraint fails
**Cause:** Batch doesn't exist for semester 3

**Check:**
```sql
SELECT id, name, semester, academic_year, is_active
FROM batches
WHERE semester = 3 AND is_active = true;
```

**If no results:** Create a batch for semester 3
**If results:** The API should find this automatically

### 3. Permission Denied
**Symptom:** "permission denied for table timetable_generation_tasks"
**Cause:** Database RLS (Row Level Security) or role permissions

**Check:**
```sql
-- Check table permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'timetable_generation_tasks';
```

**Fix:**
```sql
-- Grant full permissions (run as admin)
GRANT ALL ON timetable_generation_tasks TO anon;
GRANT ALL ON timetable_generation_tasks TO authenticated;
GRANT ALL ON timetable_generation_tasks TO service_role;

-- If RLS is enabled, disable it or add policies
ALTER TABLE timetable_generation_tasks DISABLE ROW LEVEL SECURITY;
```

### 4. Enum Type Mismatch
**Symptom:** "invalid input value for enum"
**Cause:** Status or phase values don't match enum definition

**Check schema enum values:**
```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'generation_task_status'::regtype
ORDER BY enumsortorder;

SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'algorithm_phase'::regtype
ORDER BY enumsortorder;
```

**Should show:**
- `generation_task_status`: PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
- `algorithm_phase`: INITIALIZING, CP_SAT, GA, FINALIZING, COMPLETED, FAILED

## Step-by-Step Debug

### Step 1: Check Browser Console
Open browser console (F12) and look for these logs:

**Expected:**
```
📥 Received timetable save request: { ... }
✅ Found batch: { batchId: "...", departmentId: "...", collegeId: "..." }
👤 Validating user exists: "user-uuid"
✅ User validated: { id: "...", email: "...", name: "...", role: "..." }
📝 Creating generation task...
📋 Task data: { ... }
```

**If you see:**
```
❌ User not found: "user-uuid"
```
→ Your localStorage user ID doesn't exist in database

**If you see:**
```
❌ Error creating generation task: { ... }
❌ Full error object: { "message": "...", "code": "...", "hint": "..." }
```
→ Share this full error message!

### Step 2: Check Your localStorage
In browser console, run:
```javascript
const user = JSON.parse(localStorage.getItem('user'));
console.log('User ID:', user.id || user.userId);
console.log('User email:', user.email);
```

Then check if this user exists in database:
```sql
SELECT id, email FROM users WHERE id = 'paste-user-id-here';
```

### Step 3: Test Direct Insert
Try creating a task manually in Supabase SQL Editor:

```sql
-- First, get valid IDs
SELECT 
  (SELECT id FROM users WHERE email = 'your-email' LIMIT 1) as user_id,
  (SELECT id FROM batches WHERE semester = 3 AND is_active = true LIMIT 1) as batch_id;
```

Then try to insert:
```sql
INSERT INTO timetable_generation_tasks (
  task_name,
  batch_id,
  academic_year,
  semester,
  status,
  current_phase,
  progress,
  current_message,
  algorithm_config,
  created_by,
  started_at,
  completed_at,
  solutions_generated,
  best_fitness_score,
  execution_time_seconds
) VALUES (
  'Test Task',
  'paste-batch-id-from-above',
  '2025-26',
  3,
  'COMPLETED',
  'COMPLETED',
  100,
  'Test',
  '{"method": "manual"}',
  'paste-user-id-from-above',
  NOW(),
  NOW(),
  1,
  100.0,
  0
) RETURNING *;
```

**If this works:** API issue (check Supabase connection)
**If this fails:** Database constraint issue (read the error message)

### Step 4: Check Supabase Connection
In browser console:
```javascript
// Test Supabase connection
const { supabase } = await import('/src/lib/supabase.js');
const { data, error } = await supabase.from('users').select('count');
console.log('Supabase test:', { data, error });
```

**If error:** Supabase config issue (check environment variables)

## Quick Fixes

### Fix 1: Create Missing User
If your user doesn't exist in database:

```sql
INSERT INTO users (
  first_name,
  last_name,
  email,
  password_hash,
  college_uid,
  college_id,
  department_id,
  role,
  is_active,
  email_verified
) VALUES (
  'Your',
  'Name',
  'your-email@example.com',
  '$2a$10$dummyhashfornow',  -- You'll need to hash a real password
  'FAC001',
  (SELECT id FROM colleges WHERE code = 'SVPCET'),
  (SELECT id FROM departments WHERE code = 'CSE'),
  'faculty',
  true,
  true
) RETURNING id, email;
```

Then **re-login** to update localStorage with the correct user ID.

### Fix 2: Fix Permissions
```sql
-- Disable RLS (easiest for development)
ALTER TABLE timetable_generation_tasks DISABLE ROW LEVEL SECURITY;

-- Or grant permissions
GRANT ALL ON timetable_generation_tasks TO anon, authenticated;
```

### Fix 3: Check Foreign Keys
```sql
-- Verify all foreign key references exist
SELECT 
  'User exists' as check_type,
  EXISTS(SELECT 1 FROM users WHERE id = 'your-user-id') as result
UNION ALL
SELECT 
  'Batch exists' as check_type,
  EXISTS(SELECT 1 FROM batches WHERE semester = 3 AND is_active = true) as result;
```

Both should return `true`.

## What to Share for Help

If still failing, share:

1. **Full console error** (from browser F12):
   ```
   ❌ Full error object: { ... }
   ```

2. **User check result**:
   ```sql
   SELECT id, email FROM users WHERE email = 'your-email';
   ```

3. **Batch check result**:
   ```sql
   SELECT id, name FROM batches WHERE semester = 3;
   ```

4. **Manual insert test result** (success or error message)

---

**Most Likely:** Your user ID in localStorage doesn't match a user in the database. Check localStorage user ID and verify it exists in the `users` table!
