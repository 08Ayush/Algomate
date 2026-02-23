-- ============================================
-- Fix Admin Access Level
-- ============================================
-- This script updates the access_level for college_admin users
-- from 'write' to 'admin' to grant proper permissions

-- Check current status
SELECT 
  college_uid,
  first_name,
  last_name,
  role,
  access_level AS current_access_level
FROM users
WHERE role = 'college_admin';

-- Update access_level for all college_admin users
UPDATE users
SET access_level = 'admin'
WHERE role = 'college_admin';

-- Verify the change
SELECT 
  college_uid,
  first_name,
  last_name,
  role,
  access_level AS updated_access_level
FROM users
WHERE role = 'college_admin';

-- Expected Result:
-- college_uid: ADM000001
-- role: college_admin
-- access_level: admin (changed from 'write')
