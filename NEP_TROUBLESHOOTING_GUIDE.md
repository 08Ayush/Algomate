# NEP Curriculum Builder - Troubleshooting Guide

## ✅ Issues Fixed (December 2025)

### Issue 1: Wrong Number of Semesters Showing
**Problem**: All courses showed 8 semesters, but B.Ed and M.Ed are only 2-year programs (4 semesters each).

**Solution**: ✅ FIXED
- ITEP: 8 semesters (4 years)
- B.Ed: 4 semesters (2 years)
- M.Ed: 4 semesters (2 years)

The semester dropdown now dynamically adjusts based on the selected course.

### Issue 2: No Subjects Showing in Available Subjects List
**Problem**: Subjects weren't being retrieved from the database even though they existed.

**Root Cause**: The code was filtering subjects by checking if the course name appeared in `subject.code` or `subject.name`, but your subjects don't have "ITEP", "B.Ed", or "M.Ed" in their codes/names.

**Solution**: ✅ FIXED
- Now uses the `program` column in subjects table as primary filter
- Falls back to code/name matching if program column is empty
- Added console logging to help debug subject counts

---

## 🚀 What You Need to Do Now

### Step 1: Run Database Migration (If Not Done Already)
```sql
-- In Supabase SQL Editor, run:
-- File: database/nep_curriculum_migration.sql
```

### Step 2: Tag Your Subjects with Program Values
```sql
-- In Supabase SQL Editor, run:
-- File: database/tag_subjects_with_program.sql

-- This will:
-- 1. Auto-detect subjects based on naming patterns
-- 2. Tag them with ITEP, B.Ed, or M.Ed
-- 3. Show verification results
```

### Step 3: Test the Application
1. Refresh your browser (Ctrl+F5)
2. Login as college admin
3. Navigate to NEP Curriculum Builder
4. Select **B.Ed** → You should see only **Semesters 1-4**
5. Select **Semester 1** → Subjects should appear in "Available Subjects"
6. Open browser console (F12) → Check for log: "Found X subjects for B.Ed semester 1"

---

## 🔍 Debugging: If Subjects Still Don't Show

### Check 1: Verify Program Column Exists
```sql
-- In Supabase SQL Editor
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subjects' AND column_name = 'program';
```

**Expected Result**: Should return one row showing `program` column with `character varying` type.

If empty, run the migration script first.

### Check 2: Check If Subjects Have Program Values
```sql
-- Check how many subjects have program assigned
SELECT 
    program,
    COUNT(*) as count
FROM subjects 
WHERE is_active = true
GROUP BY program;
```

**Expected Result**:
- ITEP: X subjects
- B.Ed: Y subjects
- M.Ed: Z subjects
- NULL: 0 subjects (ideally)

If you see many NULL values, run `database/tag_subjects_with_program.sql`.

### Check 3: Verify Semester Field is Populated
```sql
-- Check subjects for a specific program and semester
SELECT id, code, name, semester, program
FROM subjects 
WHERE program = 'B.Ed' 
AND semester = 1
AND is_active = true;
```

**Expected Result**: Should return subjects for B.Ed Semester 1.

If empty, your subjects don't have semester values assigned. You need to update them:

```sql
-- Example: Assign semesters to B.Ed subjects
UPDATE subjects 
SET semester = 1 
WHERE code IN ('BED101', 'BED102', 'BED103') 
AND is_active = true;

UPDATE subjects 
SET semester = 2 
WHERE code IN ('BED201', 'BED202', 'BED203') 
AND is_active = true;
```

### Check 4: Verify College ID Match
```sql
-- Get your college admin's college_id
SELECT id, first_name, last_name, email, college_id, role 
FROM users 
WHERE role = 'college_admin';

-- Check if subjects exist for that college
SELECT COUNT(*) as subject_count
FROM subjects 
WHERE college_id = 'your-college-uuid-from-above'
AND is_active = true;
```

**Expected Result**: Should return > 0 subjects.

If 0, your subjects are assigned to a different college. Update them:

```sql
UPDATE subjects 
SET college_id = 'correct-college-uuid'
WHERE college_id = 'wrong-college-uuid';
```

---

## 🧪 Quick Test Queries

### Test Query 1: What the Frontend Sees (B.Ed Semester 1)
```sql
-- This mimics what CurriculumBuilder.fetchSubjects() does
SELECT id, code, name, semester, program
FROM subjects 
WHERE college_id = 'your-college-uuid'
AND semester = 1
AND program = 'B.Ed'
AND is_active = true
AND course_group_id IS NULL
ORDER BY code;
```

### Test Query 2: What the Frontend Sees (ITEP Semester 1)
```sql
SELECT id, code, name, semester, program
FROM subjects 
WHERE college_id = 'your-college-uuid'
AND semester = 1
AND program = 'ITEP'
AND is_active = true
AND course_group_id IS NULL
ORDER BY code;
```

### Test Query 3: Check Browser Console Logs
Open browser console (F12) and look for:
```
Found 5 subjects for B.Ed semester 1
```

If you see `Found 0 subjects`, the database query returned no results.

---

## 🛠️ Manual Fix: Tag Subjects by Department

If your subjects are organized by department instead of course:

```sql
-- Find your departments
SELECT id, name, code FROM departments;

-- Tag all subjects in a specific department
UPDATE subjects 
SET program = 'B.Ed',
    semester = 1  -- Adjust as needed
WHERE department_id = 'your-bed-department-uuid'
AND code LIKE '%SEM1%';  -- Adjust pattern as needed

UPDATE subjects 
SET program = 'B.Ed',
    semester = 2
WHERE department_id = 'your-bed-department-uuid'
AND code LIKE '%SEM2%';
```

---

## 📊 Expected Behavior After Fix

### When Course = B.Ed
- Semester dropdown: Shows **1, 2, 3, 4** (not 8)
- Semester 1 selected: Shows subjects where `program = 'B.Ed'` AND `semester = 1`

### When Course = M.Ed
- Semester dropdown: Shows **1, 2, 3, 4** (not 8)
- Semester 2 selected: Shows subjects where `program = 'M.Ed'` AND `semester = 2`

### When Course = ITEP
- Semester dropdown: Shows **1, 2, 3, 4, 5, 6, 7, 8**
- Semester 3 selected: Shows subjects where `program = 'ITEP'` AND `semester = 3`

### When switching courses
- Semester automatically resets to **Semester 1**
- Prevents invalid selections (e.g., B.Ed Semester 8)

---

## 📝 Common Scenarios

### Scenario 1: Subjects Don't Have Semester Field
**Fix:**
```sql
-- Manually assign semesters based on subject codes
UPDATE subjects SET semester = 1 WHERE code LIKE '%101' OR code LIKE '%SEM1%';
UPDATE subjects SET semester = 2 WHERE code LIKE '%201' OR code LIKE '%SEM2%';
UPDATE subjects SET semester = 3 WHERE code LIKE '%301' OR code LIKE '%SEM3%';
UPDATE subjects SET semester = 4 WHERE code LIKE '%401' OR code LIKE '%SEM4%';
```

### Scenario 2: Subjects in Different Colleges
**Fix:**
```sql
-- Move subjects to correct college
UPDATE subjects 
SET college_id = (SELECT id FROM colleges WHERE name = 'Your College Name')
WHERE department_id IN (SELECT id FROM departments WHERE college_id = 'correct-college-uuid');
```

### Scenario 3: Subjects Already in Buckets (course_group_id NOT NULL)
These won't show in "Available Subjects" because they're already assigned to buckets.

**To check:**
```sql
SELECT s.code, s.name, eb.bucket_name
FROM subjects s
JOIN elective_buckets eb ON s.course_group_id = eb.id
WHERE s.program = 'B.Ed' AND s.semester = 1;
```

**To reset (if needed):**
```sql
UPDATE subjects 
SET course_group_id = NULL
WHERE program = 'B.Ed' AND semester = 1;
```

---

## ✅ Verification Checklist

Before testing, ensure:

- [ ] Migration script `nep_curriculum_migration.sql` executed successfully
- [ ] Subjects have `program` column populated (ITEP/B.Ed/M.Ed)
- [ ] Subjects have `semester` column populated (1-8)
- [ ] Subjects have `college_id` matching your college admin's college
- [ ] Subjects have `is_active = true`
- [ ] Subjects have `course_group_id = NULL` (not already in buckets)
- [ ] Browser cache cleared (Ctrl+Shift+Delete)
- [ ] Application restarted (if running dev server)

---

## 🆘 Still Having Issues?

### Get Diagnostic Data
Run this query and share the results:

```sql
-- Comprehensive diagnostic query
SELECT 
    'College Admin Info' as info_type,
    u.email as value,
    u.college_id as college_id,
    c.name as college_name
FROM users u
LEFT JOIN colleges c ON u.college_id = c.id
WHERE u.role = 'college_admin'

UNION ALL

SELECT 
    'Total Active Subjects',
    COUNT(*)::text,
    college_id::text,
    NULL
FROM subjects 
WHERE is_active = true
GROUP BY college_id

UNION ALL

SELECT 
    'Subjects with Program',
    COUNT(*)::text,
    college_id::text,
    program
FROM subjects 
WHERE is_active = true AND program IS NOT NULL
GROUP BY college_id, program

UNION ALL

SELECT 
    'Subjects with Semester',
    COUNT(*)::text,
    college_id::text,
    semester::text
FROM subjects 
WHERE is_active = true AND semester IS NOT NULL
GROUP BY college_id, semester;
```

This will help identify exactly where the data issue is.

---

## 📚 Documentation Reference

- **Implementation Summary**: `NEP_CURRICULUM_IMPLEMENTATION_SUMMARY.md`
- **Quick Start Guide**: `NEP_CURRICULUM_QUICKSTART.md`
- **User Guide**: `NEP_CURRICULUM_COLLEGE_ADMIN.md`
- **Migration Script**: `database/nep_curriculum_migration.sql`
- **Subject Tagging Script**: `database/tag_subjects_with_program.sql`
