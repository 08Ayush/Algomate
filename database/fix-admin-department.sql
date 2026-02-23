-- Fix Admin Users - Remove Department Association
-- Admin users should only be associated with college_id, not department_id
-- This makes them true "super admins" who can manage all departments

-- Step 1: Check current admin users
SELECT 
    id,
    first_name,
    last_name,
    email,
    college_uid,
    role,
    department_id,
    college_id
FROM users
WHERE role = 'admin';

-- Step 2: Update all admin users to have NULL department_id
-- This removes their association with any specific department
UPDATE users
SET department_id = NULL
WHERE role = 'admin';

-- Step 3: Verify the update
SELECT 
    id,
    first_name,
    last_name,
    email,
    college_uid,
    role,
    department_id,
    college_id,
    'Department removed - Admin is now college-level only' as status
FROM users
WHERE role = 'admin';

-- Step 4: Check the schema to ensure department_id allows NULL for admins
-- (This is just informational, no changes made)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users' 
    AND column_name IN ('department_id', 'college_id', 'role');
