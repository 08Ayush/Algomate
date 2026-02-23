# NEP Buckets Not Showing - Complete Diagnostic Guide

## Issue
Admin created buckets for Semester 3 ITEP course, but student dashboard shows "0 buckets available"

## Investigation Steps

### Step 1: Check Browser Console Logs
Open student dashboard and check browser console (F12). You should now see detailed logs:
- 🎯 User data with course_id
- 📚 API call parameters
- 📡 API response status
- ✅ or ❌ Buckets data received

### Step 2: Check Debug Panel
A red debug panel is now visible on the student dashboard showing:
- User's course_id
- Batch information
- Current buckets state
- Exact API URL being called

### Step 3: Run SQL Diagnostic Queries
See `DEBUG_BUCKETS_SEM3_ITEP.md` for complete SQL queries to run in Supabase

## Common Root Causes & Solutions

### Problem 1: Student has no course_id ❌
**Symptoms:**
- Debug panel shows `course_id: null` or `course_id: undefined`
- Console shows: "courseId=undefined"

**Solution:**
```sql
-- Get ITEP course ID
SELECT id, code, title FROM courses WHERE code = 'ITEP';

-- Update student
UPDATE users 
SET course_id = '<ITEP_COURSE_UUID>' 
WHERE email = 'student@example.com';
```

---

### Problem 2: Student not enrolled in any batch ❌
**Symptoms:**
- Debug panel shows `batch: null`
- Console error: "No batch data found"

**Solution:**
```sql
-- Find the Semester 3 ITEP batch
SELECT b.id, b.name, b.semester 
FROM batches b
JOIN courses c ON b.course_id = c.id
WHERE b.semester = 3 AND c.code = 'ITEP';

-- Enroll student
INSERT INTO student_batch_enrollment (student_id, batch_id, is_active)
VALUES (
  '<STUDENT_UUID>',
  '<BATCH_UUID>',
  true
);
```

---

### Problem 3: Batch course_id doesn't match admin-created batch ❌
**Symptoms:**
- API logs show "No batch found" despite batch existing in admin
- Different course_id between student and batch

**Solution:**
```sql
-- Check batch course_id
SELECT id, name, semester, course_id FROM batches WHERE semester = 3;

-- If wrong, update it
UPDATE batches 
SET course_id = '<CORRECT_ITEP_COURSE_UUID>'
WHERE semester = 3 AND name = '<BATCH_NAME>';
```

---

### Problem 4: Subjects not linked to buckets ❌
**Symptoms:**
- Buckets show up but with 0 subjects
- `subjectCount: 0` in debug panel

**Solution:**
```sql
-- Get bucket ID from admin dashboard or:
SELECT id, bucket_name, batch_id FROM elective_buckets;

-- Link subjects to bucket
UPDATE subjects 
SET course_group_id = '<BUCKET_UUID>'
WHERE code IN (
  '9ENCMJT0301',  -- English (American Literature)
  '9GEOMJT0301',  -- Geography
  '9PSYCMJT0301', -- Child Development and Educational Psychology
  '9EDUPST0301'   -- Basics of Pedagogy
);
```

---

## Verification Checklist

After applying fixes, verify each step:

- [ ] **Student has course_id**
  ```sql
  SELECT email, course_id FROM users WHERE email = 'student@example.com';
  ```
  Should return: non-null course_id UUID

- [ ] **Student enrolled in batch**
  ```sql
  SELECT * FROM student_batch_enrollment WHERE student_id = '<STUDENT_UUID>' AND is_active = true;
  ```
  Should return: 1 row with batch_id

- [ ] **Batch exists for Sem 3 ITEP**
  ```sql
  SELECT b.*, c.code FROM batches b 
  JOIN courses c ON b.course_id = c.id 
  WHERE b.semester = 3 AND c.code = 'ITEP';
  ```
  Should return: 1+ rows

- [ ] **Batch course_id matches student's course_id**
  ```sql
  SELECT 
    u.course_id as student_course,
    b.course_id as batch_course,
    CASE WHEN u.course_id = b.course_id THEN '✅ MATCH' ELSE '❌ MISMATCH' END as status
  FROM users u
  CROSS JOIN batches b
  WHERE u.email = 'student@example.com' AND b.semester = 3;
  ```
  Should show: ✅ MATCH

- [ ] **Buckets exist for the batch**
  ```sql
  SELECT * FROM elective_buckets WHERE batch_id = '<BATCH_UUID>';
  ```
  Should return: 1+ rows (including "SEM 3 MAJOR 1")

- [ ] **Subjects linked to buckets**
  ```sql
  SELECT s.code, s.name, eb.bucket_name 
  FROM subjects s
  JOIN elective_buckets eb ON s.course_group_id = eb.id
  WHERE eb.bucket_name = 'SEM 3 MAJOR 1';
  ```
  Should return: 4 subjects

---

## Quick Test Procedure

1. **Run the complete chain query:**
```sql
SELECT 
  u.email,
  u.course_id,
  c.code as course_code,
  sbe.batch_id,
  b.semester,
  eb.id as bucket_id,
  eb.bucket_name,
  COUNT(s.id) as subject_count
FROM users u
LEFT JOIN courses c ON u.course_id = c.id
LEFT JOIN student_batch_enrollment sbe ON u.id = sbe.student_id
LEFT JOIN batches b ON sbe.batch_id = b.id
LEFT JOIN elective_buckets eb ON b.id = eb.batch_id
LEFT JOIN subjects s ON eb.id = s.course_group_id
WHERE u.email = 'student@example.com'
GROUP BY u.email, u.course_id, c.code, sbe.batch_id, b.semester, eb.id, eb.bucket_name;
```

**Expected Result:**
```
email: student@example.com
course_id: <UUID>
course_code: ITEP
batch_id: <UUID>
semester: 3
bucket_id: <UUID>
bucket_name: SEM 3 MAJOR 1
subject_count: 4
```

2. **Refresh student dashboard** - Should now show buckets!

3. **Check debug panel** - Should show `bucketsCount: 1` with 4 subjects

---

## API Flow Documentation

### Request Flow:
```
Student Dashboard Page
  ↓
fetchNepCurriculumData()
  ↓
GET /api/nep/buckets?courseId=<UUID>&semester=3&studentId=<UUID>
  ↓
API finds batch WHERE college_id AND course_id AND semester
  ↓
API finds elective_buckets WHERE batch_id
  ↓
API finds subjects WHERE course_group_id = bucket.id
  ↓
Returns: [{ bucket_name, subjects: [...], ... }]
  ↓
Student Dashboard displays buckets + subjects
```

### Key Join Relationships:
```
users.course_id → courses.id
student_batch_enrollment.batch_id → batches.id
batches.course_id → courses.id
elective_buckets.batch_id → batches.id
subjects.course_group_id → elective_buckets.id (NOT batches.id!)
```

---

## After Fixing - Remove Debug Panel

Once buckets are showing correctly, remove the debug panel:

1. Open `src/app/student/dashboard/page.tsx`
2. Find the comment `{/* DEBUG PANEL - REMOVE IN PRODUCTION */}`
3. Delete the entire Card component (lines ~600-665)
4. Remove console.log statements added for debugging

---

## Still Not Working?

1. **Share browser console logs** - All logs starting with 🎯, 📚, 📡, ✅, ❌
2. **Share debug panel screenshot** - The red panel on student dashboard
3. **Share SQL query results** - From `DEBUG_BUCKETS_SEM3_ITEP.md`
4. **Check network tab** - Filter for "buckets", check request/response

---

## Summary

The most likely issue is one of:
1. Student missing `course_id` in users table
2. Student not enrolled in Semester 3 ITEP batch
3. Batch `course_id` doesn't match ITEP course UUID
4. Subjects `course_group_id` not set to bucket ID

Run the diagnostic queries to identify and fix the exact issue!
