-- Diagnostic queries to debug "Failed to create generation task" error

-- 1. Check if your user exists and is valid
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  department_id,
  college_id,
  is_active
FROM users
WHERE email = 'your-email@example.com';  -- Replace with your actual email

-- 2. Check if batch exists for semester 3
SELECT 
  id,
  name,
  semester,
  academic_year,
  department_id,
  college_id,
  is_active
FROM batches
WHERE semester = 3 AND is_active = true;

-- 3. Try to manually create a generation task (test permissions)
-- Replace the UUIDs with actual values from queries 1 and 2
/*
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
  'Test Manual Timetable',
  'your-batch-id-from-query-2',  -- Replace
  '2025-26',
  3,
  'COMPLETED',
  'COMPLETED',
  100,
  'Test task creation',
  '{"method": "manual"}',
  'your-user-id-from-query-1',  -- Replace
  NOW(),
  NOW(),
  1,
  100.0,
  0
) RETURNING *;
*/

-- 4. Check table permissions for timetable_generation_tasks
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'timetable_generation_tasks';

-- 5. Check if there are any constraints or triggers that might be failing
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'timetable_generation_tasks'::regclass;

-- 6. Check for any existing generation tasks
SELECT 
  id,
  task_name,
  batch_id,
  semester,
  status,
  created_by,
  created_at
FROM timetable_generation_tasks
ORDER BY created_at DESC
LIMIT 10;

-- 7. Verify the user ID format is correct UUID
SELECT 
  id,
  pg_typeof(id) as id_type,
  email
FROM users
WHERE email = 'your-email@example.com';

-- 8. Check if the batch foreign key reference is valid
SELECT 
  b.id as batch_id,
  b.name,
  b.semester,
  EXISTS(
    SELECT 1 FROM timetable_generation_tasks 
    WHERE batch_id = b.id
  ) as has_tasks
FROM batches b
WHERE b.semester = 3 AND b.is_active = true;
