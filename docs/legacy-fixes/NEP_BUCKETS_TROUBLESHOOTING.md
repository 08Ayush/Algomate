# NEP 2020 Buckets Troubleshooting Guide

## Data Flow and Schema Relationships

### 1. Database Schema Structure

```
courses (B.Ed, M.Ed, ITEP, etc.)
  ↓ (course_id)
batches (Sem 1 A, Sem 1 B, etc.)
  ↓ (batch_id)
elective_buckets (Humanities Major Pool, Science Minor Pool, etc.)
  ↓ (course_group_id in subjects table)
subjects (Subject 1, Subject 2, etc.)
```

### 2. How Students See Their Buckets

**Step 1: Student Login**
- Student has `course_id` and `current_semester` in users table
- Student is enrolled in a batch via `student_batch_enrollment` table

**Step 2: Fetch Buckets**
API Call: `/api/nep/buckets?courseId={course_id}&semester={semester}&studentId={student_id}`

1. Find the batch:
   ```sql
   SELECT * FROM batches 
   WHERE college_id = ? 
   AND semester = ? 
   AND course_id = ? 
   AND is_active = true
   ```

2. Find elective buckets for that batch:
   ```sql
   SELECT * FROM elective_buckets 
   WHERE batch_id = ?
   ```

3. Find subjects in each bucket:
   ```sql
   SELECT * FROM subjects 
   WHERE course_group_id = bucket.id 
   AND college_id = ? 
   AND is_active = true
   ```

### 3. Key Fields in Each Table

**users table:**
- `course_id` - Links to courses table
- `current_semester` - Student's current semester
- `college_uid` - College unique identifier

**batches table:**
- `id` - Primary key
- `course_id` - Links to courses table
- `semester` - Semester number (1-8)
- `college_id` - College identifier
- `name` - Batch name (e.g., "A", "B")
- `section` - Section identifier

**elective_buckets table:**
- `id` - Primary key (THIS is what goes in subjects.course_group_id)
- `batch_id` - Links to batches table
- `bucket_name` - Display name (e.g., "Humanities Major Pool")
- `min_selection` - Minimum subjects student must select
- `max_selection` - Maximum subjects student can select

**subjects table:**
- `id` - Primary key
- `course_group_id` - Links to elective_buckets.id (NOT batch_id!)
- `code` - Subject code
- `name` - Subject name
- `credit_value` - Calculated credits (lecture + tutorial + practical/2)
- `nep_category` - MAJOR, MINOR, ELECTIVE, etc.
- `college_id` - College identifier

### 4. Common Issues and Solutions

#### Issue 1: "No buckets available"
**Cause:** Batch not found for the student's course + semester combination
**Check:**
```sql
SELECT * FROM batches 
WHERE course_id = 'student_course_id' 
AND semester = 'student_semester' 
AND is_active = true;
```

#### Issue 2: "Buckets shown but no subjects"
**Cause:** Subjects don't have `course_group_id` set to the bucket's id
**Check:**
```sql
-- First get bucket IDs
SELECT id, bucket_name, batch_id FROM elective_buckets WHERE batch_id = 'your_batch_id';

-- Then check if subjects exist for each bucket
SELECT id, code, name, course_group_id 
FROM subjects 
WHERE course_group_id = 'bucket_id';
```

**Fix:**
```sql
-- Update subjects to link to bucket
UPDATE subjects 
SET course_group_id = 'bucket_id' 
WHERE id IN ('subject_id_1', 'subject_id_2', ...);
```

#### Issue 3: "Student sees wrong semester's buckets"
**Cause:** Student's `current_semester` is not set or batch enrollment is incorrect
**Check:**
```sql
-- Check student's semester
SELECT current_semester FROM users WHERE id = 'student_id';

-- Check student's batch enrollment
SELECT b.semester, b.name, b.section 
FROM student_batch_enrollment sbe
JOIN batches b ON sbe.batch_id = b.id
WHERE sbe.student_id = 'student_id' AND sbe.is_active = true;
```

### 5. Required Data Setup for NEP Buckets to Work

1. **Create Course:**
   ```sql
   INSERT INTO courses (college_id, code, title, nature_of_course)
   VALUES ('college_id', 'ITEP', 'Integrated Teacher Education Program (B.A.B.Ed)', 'Integrated');
   ```

2. **Create Batch for Semester:**
   ```sql
   INSERT INTO batches (college_id, department_id, course_id, semester, academic_year, name, section)
   VALUES ('college_id', 'dept_id', 'course_id', 1, '2024-25', 'A', 'A');
   ```

3. **Create Elective Bucket:**
   ```sql
   INSERT INTO elective_buckets (batch_id, bucket_name, min_selection, max_selection, is_common_slot)
   VALUES ('batch_id', 'Semester 1 Humanities Major Pool', 1, 1, true);
   ```

4. **Link Subjects to Bucket:**
   ```sql
   UPDATE subjects 
   SET course_group_id = 'bucket_id'
   WHERE id IN (
     SELECT id FROM subjects 
     WHERE nep_category = 'MAJOR' 
     AND semester = 1
     AND course_id = 'course_id'
   );
   ```

5. **Enroll Student in Batch:**
   ```sql
   INSERT INTO student_batch_enrollment (student_id, batch_id, is_active)
   VALUES ('student_id', 'batch_id', true);
   ```

### 6. Testing Checklist

- [ ] Student has `course_id` in users table
- [ ] Student has `current_semester` in users table or batch enrollment
- [ ] Batch exists for student's course_id + semester
- [ ] Elective buckets exist for the batch
- [ ] Subjects have `course_group_id` pointing to bucket IDs
- [ ] Subjects are marked as `is_active = true`
- [ ] Student is enrolled in the batch via `student_batch_enrollment`

### 7. Debug Queries

Run these queries in Supabase SQL editor to debug:

```sql
-- 1. Check student data
SELECT id, first_name, last_name, course_id, current_semester, college_uid
FROM users 
WHERE email = 'student_email@example.com';

-- 2. Check student's batch enrollment
SELECT sbe.*, b.name, b.semester, b.course_id
FROM student_batch_enrollment sbe
JOIN batches b ON sbe.batch_id = b.id
WHERE sbe.student_id = 'student_id' AND sbe.is_active = true;

-- 3. Check buckets for batch
SELECT eb.*, b.name as batch_name, b.semester
FROM elective_buckets eb
JOIN batches b ON eb.batch_id = b.id
WHERE b.course_id = 'course_id' AND b.semester = 1;

-- 4. Check subjects in buckets
SELECT s.id, s.code, s.name, s.course_group_id, eb.bucket_name
FROM subjects s
JOIN elective_buckets eb ON s.course_group_id = eb.id
WHERE eb.batch_id = 'batch_id';

-- 5. Full chain verification
SELECT 
  u.email as student_email,
  c.code as course_code,
  b.semester,
  b.name as batch_name,
  eb.bucket_name,
  COUNT(s.id) as subject_count
FROM users u
JOIN courses c ON u.course_id = c.id
JOIN student_batch_enrollment sbe ON u.id = sbe.student_id
JOIN batches b ON sbe.batch_id = b.id
JOIN elective_buckets eb ON b.id = eb.batch_id
LEFT JOIN subjects s ON eb.id = s.course_group_id
WHERE u.id = 'student_id'
GROUP BY u.email, c.code, b.semester, b.name, eb.bucket_name;
```
