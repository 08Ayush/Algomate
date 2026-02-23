-- Check the current user's college and department info

-- First, find your user
SELECT 
  u.id,
  u.email,
  u.username,
  u.first_name,
  u.last_name,
  u.role,
  u.department_id,
  u.college_id,
  d.name as department_name,
  d.code as department_code,
  c.name as college_name,
  c.code as college_code
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN colleges c ON u.college_id = c.id
ORDER BY u.created_at DESC
LIMIT 10;

-- If your user doesn't have department_id or college_id, we need to fix it
-- Find available colleges and departments
SELECT 
  c.id as college_id,
  c.name as college_name,
  c.code as college_code,
  d.id as department_id,
  d.name as department_name,
  d.code as department_code
FROM colleges c
JOIN departments d ON d.college_id = c.id
ORDER BY c.name, d.name;

-- Example: Update user with college and department
-- ⚠️ REPLACE the user email and IDs before running!
/*
UPDATE users 
SET 
  college_id = 'your-college-id-from-above',
  department_id = 'your-department-id-from-above'
WHERE email = 'your-email@example.com';
*/

-- Verify the update
SELECT 
  u.email,
  u.department_id,
  u.college_id,
  d.name as department,
  c.name as college
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN colleges c ON u.college_id = c.id
WHERE u.email = 'your-email@example.com';
