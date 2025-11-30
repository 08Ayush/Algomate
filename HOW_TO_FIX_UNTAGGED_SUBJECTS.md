# How to Fix "0 Tagged Subjects" Issue

## 🔴 Problem
You ran the tagging query and got:
```
tagged_subjects: 0
untagged_subjects: 190
total_active_subjects: 190
```

This means **none of your subjects** have the `program` column populated.

---

## ✅ Solution (Step-by-Step)

### Step 1: Diagnose Your Subject Structure

**Run this script**: `database/diagnose_subjects.sql`

This will show you:
1. If the `program` column exists
2. What your subject codes actually look like
3. How subjects are organized by department
4. Sample subject data

**Look at the output** and determine:
- Do your subjects have codes like "BED101", "ITEP201", etc.?
- Or do they have generic codes like "CS101", "MATH201"?
- Are subjects organized by department?

---

### Step 2: Choose the Right Tagging Method

Based on your college structure, choose ONE of these approaches:

#### **APPROACH A: Your College Only Offers B.Ed** ✅ EASIEST

If your college only has B.Ed program (190 subjects for 4 semesters):

**Run this script**: `database/quick_tag_bed_subjects.sql`

```sql
-- This will tag ALL your subjects as B.Ed
UPDATE subjects 
SET program = 'B.Ed'
WHERE is_active = true;
```

Then verify:
```sql
SELECT program, COUNT(*) 
FROM subjects 
WHERE is_active = true 
GROUP BY program;
```

Expected result: `B.Ed: 190`

---

#### **APPROACH B: You Have Multiple Programs (B.Ed, M.Ed, ITEP)**

##### Option 1: Tag by Department Name

```sql
-- First, see your departments
SELECT id, name, code FROM departments ORDER BY name;

-- Then tag based on department
UPDATE subjects SET program = 'B.Ed'
WHERE department_id IN (
    SELECT id FROM departments 
    WHERE name ILIKE '%B.Ed%' OR name ILIKE '%Bachelor%'
);

UPDATE subjects SET program = 'M.Ed'
WHERE department_id IN (
    SELECT id FROM departments 
    WHERE name ILIKE '%M.Ed%' OR name ILIKE '%Master%'
);

UPDATE subjects SET program = 'ITEP'
WHERE department_id IN (
    SELECT id FROM departments 
    WHERE name ILIKE '%ITEP%'
);
```

##### Option 2: Tag by Semester Range

If your subjects are organized by semester:
- Semesters 1-4 = B.Ed
- Semesters 5-8 = ITEP

```sql
UPDATE subjects 
SET program = 'B.Ed' 
WHERE semester BETWEEN 1 AND 4 AND is_active = true;

UPDATE subjects 
SET program = 'ITEP' 
WHERE semester BETWEEN 5 AND 8 AND is_active = true;
```

##### Option 3: Tag by Department UUID (Most Reliable)

```sql
-- Get department IDs
SELECT id, name FROM departments;

-- Copy the UUIDs and paste below
UPDATE subjects SET program = 'B.Ed'
WHERE department_id = 'paste-uuid-here' AND is_active = true;

UPDATE subjects SET program = 'M.Ed'
WHERE department_id = 'paste-another-uuid-here' AND is_active = true;
```

---

### Step 3: Verify the Tagging

Run this query:
```sql
SELECT 
    COUNT(*) FILTER (WHERE program IS NOT NULL) as tagged_subjects,
    COUNT(*) FILTER (WHERE program IS NULL) as untagged_subjects,
    COUNT(*) as total_active_subjects
FROM subjects 
WHERE is_active = true;
```

**Expected result**:
- `tagged_subjects`: 190 (or your total)
- `untagged_subjects`: 0
- `total_active_subjects`: 190

---

### Step 4: Check Distribution by Program

```sql
SELECT 
    program,
    COUNT(*) as subject_count,
    COUNT(DISTINCT semester) as semester_count
FROM subjects 
WHERE is_active = true
GROUP BY program
ORDER BY program;
```

**Expected result** (example for B.Ed only):
```
program | subject_count | semester_count
B.Ed    | 190           | 4
```

---

### Step 5: Ensure Subjects Have Semester Values

The NEP Curriculum Builder also requires subjects to have a `semester` value (1-8).

Check if subjects have semesters:
```sql
SELECT 
    semester,
    COUNT(*) as count
FROM subjects 
WHERE is_active = true
GROUP BY semester
ORDER BY semester;
```

If you see `NULL` or missing semesters, you need to assign them:

```sql
-- Example: Assign semesters based on subject codes
UPDATE subjects SET semester = 1 WHERE code LIKE '%101' OR code LIKE '%SEM1%';
UPDATE subjects SET semester = 2 WHERE code LIKE '%201' OR code LIKE '%SEM2%';
UPDATE subjects SET semester = 3 WHERE code LIKE '%301' OR code LIKE '%SEM3%';
UPDATE subjects SET semester = 4 WHERE code LIKE '%401' OR code LIKE '%SEM4%';

-- OR manually assign by department
UPDATE subjects 
SET semester = 1
WHERE department_id = 'dept-uuid' AND name ILIKE '%semester 1%';
```

---

### Step 6: Test the Frontend

1. Refresh your browser (Ctrl+F5)
2. Go to NEP Curriculum Builder
3. Select **B.Ed** → **Semester 1**
4. You should now see subjects in "Available Subjects"
5. Open browser console (F12) → Look for: `"Found X subjects for B.Ed semester 1"`

---

## 🧪 Quick Test Query (Run This After Tagging)

This simulates what the frontend will query:

```sql
-- Replace 'your-college-uuid' with your actual college ID
-- Get it from: SELECT id, name FROM colleges;

SELECT 
    id, code, name, semester, program
FROM subjects 
WHERE college_id = 'your-college-uuid'
AND semester = 1
AND program = 'B.Ed'
AND is_active = true
AND course_group_id IS NULL
ORDER BY code;
```

**Expected**: Should return subjects for B.Ed Semester 1.

---

## 📋 Common Scenarios

### Scenario 1: I Only Have B.Ed Program
**Solution**: Use `quick_tag_bed_subjects.sql` → Tags all 190 subjects as B.Ed

### Scenario 2: Subjects Are Organized by Department
**Solution**: Get department IDs, then tag subjects by department_id

### Scenario 3: Subjects Have Clear Code Patterns
**Solution**: Tag by code patterns (e.g., "BED%" for B.Ed)

### Scenario 4: Subjects Don't Have Semesters
**Solution**: Manually assign semesters based on subject codes or names

---

## 🆘 Still Stuck?

Share the output of this diagnostic query:

```sql
-- Comprehensive diagnostic
SELECT 
    'Total Subjects' as metric,
    COUNT(*)::text as value
FROM subjects WHERE is_active = true

UNION ALL

SELECT 
    'Subjects with Program',
    COUNT(*)::text
FROM subjects WHERE is_active = true AND program IS NOT NULL

UNION ALL

SELECT 
    'Subjects with Semester',
    COUNT(*)::text
FROM subjects WHERE is_active = true AND semester IS NOT NULL

UNION ALL

SELECT 
    'Department: ' || d.name,
    COUNT(s.id)::text
FROM subjects s
JOIN departments d ON s.department_id = d.id
WHERE s.is_active = true
GROUP BY d.name;
```

This will help identify exactly where the issue is.

---

## 📂 Files You Need

1. **Diagnosis**: `database/diagnose_subjects.sql` - See your data structure
2. **Quick Fix**: `database/quick_tag_bed_subjects.sql` - Tag all as B.Ed
3. **Full Script**: `database/tag_subjects_with_program.sql` - Advanced tagging
4. **Troubleshooting**: `NEP_TROUBLESHOOTING_GUIDE.md` - Complete guide
