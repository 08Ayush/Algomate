-- SQL to create B.Ed batch and fix bucket
-- Run this in Supabase SQL Editor

-- 1. Create B.Ed batch with explicit UUID
INSERT INTO batches (
  id,
  name,
  college_id,
  department_id,
  semester,
  academic_year,
  expected_strength,
  actual_strength,
  section,
  is_active
) VALUES (
  gen_random_uuid(),
  'B.Ed - Semester 1',
  'afbcc29b-8b1c-40b9-baf7-e5a494aabe02',
  'f95bcc58-1758-4c34-ba97-936175b4ca91',
  1,
  '2025-26',
  30,
  25,
  'A',
  true
);

-- 2. Update existing bucket to link to the new batch
UPDATE elective_buckets 
SET batch_id = (
  SELECT id FROM batches 
  WHERE name = 'B.Ed - Semester 1' 
  AND college_id = 'afbcc29b-8b1c-40b9-baf7-e5a494aabe02'
  AND semester = 1
)
WHERE id = 'fd279320-ca26-417a-a38c-dcbd88e5ef61';

-- 3. Verify the fix
SELECT 
  b.name as bucket_name,
  bt.name as batch_name,
  bt.semester,
  COUNT(s.id) as subject_count
FROM elective_buckets b
JOIN batches bt ON b.batch_id = bt.id
LEFT JOIN subjects s ON s.course_group_id = b.id
WHERE b.id = 'fd279320-ca26-417a-a38c-dcbd88e5ef61'
GROUP BY b.id, b.bucket_name, bt.name, bt.semester;