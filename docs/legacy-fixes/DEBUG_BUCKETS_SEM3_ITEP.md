# Debug Queries for NEP Buckets Issue (3rd Sem ITEP)

Run these queries in Supabase SQL Editor to diagnose why buckets aren't showing:

## 1. Check if ITEP course exists
```sql
SELECT id, code, title, nature_of_course, college_id
FROM courses 
WHERE code ILIKE '%ITEP%' OR title ILIKE '%integrated%';
```
**Expected:** Should show ITEP course with its UUID

---

## 2. Check if batch exists for Semester 3 ITEP
```sql
SELECT b.id, b.name, b.section, b.semester, b.course_id, b.academic_year, b.is_active,
       c.code as course_code, c.title as course_title
FROM batches b
LEFT JOIN courses c ON b.course_id = c.id
WHERE b.semester = 3 
  AND c.code ILIKE '%ITEP%'
ORDER BY b.created_at DESC;
```
**Expected:** Should show the batch(es) created for Semester 3 ITEP

---

## 3. Check if elective buckets exist for the batch
```sql
-- First get the batch ID from query #2, then:
SELECT eb.*, b.name as batch_name, b.semester, c.code as course_code
FROM elective_buckets eb
JOIN batches b ON eb.batch_id = b.id
JOIN courses c ON b.course_id = c.id
WHERE b.semester = 3 
  AND c.code ILIKE '%ITEP%';
```
**Expected:** Should show "SEM 3 MAJOR 1" bucket visible in admin dashboard

---

## 4. Check if subjects are linked to the buckets
```sql
-- Using bucket ID from query #3:
SELECT s.id, s.code, s.name, s.course_group_id, s.is_active,
       eb.bucket_name, s.credit_value, s.nep_category
FROM subjects s
JOIN elective_buckets eb ON s.course_group_id = eb.id
JOIN batches b ON eb.batch_id = b.id
JOIN courses c ON b.course_id = c.id
WHERE b.semester = 3 
  AND c.code ILIKE '%ITEP%';
```
**Expected:** Should show 4 subjects with course_group_id pointing to bucket ID

---

## 5. Check student's course_id
```sql
-- Replace with actual student email
SELECT id, first_name, last_name, email, course_id, current_semester, college_id, college_uid
FROM users 
WHERE email = 'student@example.com' -- REPLACE WITH ACTUAL STUDENT EMAIL
  AND role = 'student';
```
**Expected:** Student should have course_id matching ITEP course UUID

---

## 6. Check student's batch enrollment
```sql
-- Replace with student ID from query #5
SELECT sbe.*, b.name, b.section, b.semester, b.course_id,
       c.code as course_code, c.title as course_title
FROM student_batch_enrollment sbe
JOIN batches b ON sbe.batch_id = b.id
JOIN courses c ON b.course_id = c.id
WHERE sbe.student_id = 'STUDENT_ID_HERE' -- REPLACE
  AND sbe.is_active = true;
```
**Expected:** Student should be enrolled in Semester 3 ITEP batch

---

## 7. COMPLETE CHAIN VERIFICATION
```sql
SELECT 
  u.email as student_email,
  u.course_id as student_course_id,
  c.code as course_code,
  c.title as course_title,
  sbe.batch_id,
  b.name as batch_name,
  b.semester,
  b.course_id as batch_course_id,
  CASE 
    WHEN u.course_id = b.course_id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as course_match,
  eb.id as bucket_id,
  eb.bucket_name,
  COUNT(s.id) as subject_count
FROM users u
LEFT JOIN courses c ON u.course_id = c.id
LEFT JOIN student_batch_enrollment sbe ON u.id = sbe.student_id AND sbe.is_active = true
LEFT JOIN batches b ON sbe.batch_id = b.id
LEFT JOIN elective_buckets eb ON b.id = eb.batch_id
LEFT JOIN subjects s ON eb.id = s.course_group_id AND s.is_active = true
WHERE u.email = 'student@example.com' -- REPLACE WITH ACTUAL STUDENT EMAIL
  AND u.role = 'student'
GROUP BY u.email, u.course_id, c.code, c.title, sbe.batch_id, b.name, b.semester, 
         b.course_id, eb.id, eb.bucket_name;
```
**Expected:** Should show complete chain with ✅ MATCH and subject_count > 0

---

## Common Issues and Fixes

### Issue 1: Student has no course_id
**Fix:**
```sql
-- Get ITEP course ID first
SELECT id FROM courses WHERE code = 'ITEP';

-- Update student with course_id
UPDATE users 
SET course_id = 'COURSE_UUID_HERE' -- Replace with actual UUID
WHERE email = 'student@example.com';
```

---

### Issue 2: Student not enrolled in batch
**Fix:**
```sql
-- Get batch ID for Sem 3 ITEP
SELECT b.id 
FROM batches b
JOIN courses c ON b.course_id = c.id
WHERE b.semester = 3 AND c.code = 'ITEP';

-- Enroll student in batch
INSERT INTO student_batch_enrollment (student_id, batch_id, is_active)
VALUES (
  (SELECT id FROM users WHERE email = 'student@example.com'),
  'BATCH_UUID_HERE', -- Replace with actual batch UUID
  true
);
```

---

### Issue 3: Batch course_id doesn't match student's course_id
**Fix:**
```sql
-- Update batch to use correct course_id
UPDATE batches 
SET course_id = (SELECT id FROM courses WHERE code = 'ITEP')
WHERE semester = 3 
  AND name LIKE '%YOUR_BATCH_NAME%';
```

---

### Issue 4: Subjects not linked to bucket
**Fix:**
```sql
-- Get bucket ID
SELECT id FROM elective_buckets WHERE bucket_name = 'SEM 3 MAJOR 1';

-- Link subjects to bucket
UPDATE subjects 
SET course_group_id = 'BUCKET_UUID_HERE' -- Replace with bucket UUID
WHERE code IN ('9ENCMJT0301', '9GEOMJT0301', '9PSYCMJT0301', '9EDUMJT0301');
-- Replace with actual subject codes from admin dashboard
```

---

## Quick Test After Fixes

After making any fixes, test with this query:
```sql
-- This should return rows with data
SELECT 
  '1. Course exists' as check_step,
  COUNT(*) as result
FROM courses WHERE code = 'ITEP'

UNION ALL

SELECT 
  '2. Batch exists for Sem 3',
  COUNT(*)
FROM batches b
JOIN courses c ON b.course_id = c.id
WHERE b.semester = 3 AND c.code = 'ITEP' AND b.is_active = true

UNION ALL

SELECT 
  '3. Buckets exist',
  COUNT(*)
FROM elective_buckets eb
JOIN batches b ON eb.batch_id = b.id
JOIN courses c ON b.course_id = c.id
WHERE b.semester = 3 AND c.code = 'ITEP'

UNION ALL

SELECT 
  '4. Subjects linked to buckets',
  COUNT(*)
FROM subjects s
JOIN elective_buckets eb ON s.course_group_id = eb.id
JOIN batches b ON eb.batch_id = b.id
JOIN courses c ON b.course_id = c.id
WHERE b.semester = 3 AND c.code = 'ITEP' AND s.is_active = true;
```

**All rows should show result > 0**
