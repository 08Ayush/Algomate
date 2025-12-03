# Quick Fix Guide: AI Timetable Generation Conflicts

## Problem
AI Assistant shows: **"No qualified faculty found for [Subject Name]"**

## Quick Solution (5 minutes)

### Step 1: Run Auto-Assignment SQL Script

1. Open Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/hwfdzrqfesebmuzgqmpe/sql
   ```

2. Copy and paste this script:

```sql
-- Auto-assign faculty to subjects (Round-robin distribution)
DO $$
DECLARE
    subject_rec RECORD;
    faculty_list UUID[];
    faculty_count INTEGER;
    faculty_index INTEGER := 0;
    dept_id UUID;
BEGIN
    FOR dept_id IN 
        SELECT DISTINCT department_id 
        FROM subjects 
        WHERE is_active = TRUE
    LOOP
        SELECT ARRAY_AGG(id ORDER BY first_name) INTO faculty_list
        FROM users
        WHERE role = 'faculty' 
          AND department_id = dept_id
          AND is_active = TRUE;
        
        faculty_count := ARRAY_LENGTH(faculty_list, 1);
        
        IF faculty_count IS NULL OR faculty_count = 0 THEN
            CONTINUE;
        END IF;
        
        faculty_index := 0;
        
        FOR subject_rec IN 
            SELECT * FROM subjects 
            WHERE department_id = dept_id 
              AND is_active = TRUE
            ORDER BY semester, name
        LOOP
            faculty_index := (faculty_index % faculty_count) + 1;
            
            INSERT INTO faculty_qualified_subjects (
                faculty_id,
                subject_id,
                proficiency_level,
                preference_score,
                teaching_load_weight,
                can_handle_lab,
                can_handle_tutorial,
                is_primary_teacher
            ) VALUES (
                faculty_list[faculty_index],
                subject_rec.id,
                7,
                6,
                1.0,
                subject_rec.subject_type = 'LAB' OR subject_rec.requires_lab,
                TRUE,
                TRUE
            )
            ON CONFLICT (faculty_id, subject_id) DO UPDATE SET
                is_primary_teacher = TRUE,
                proficiency_level = 7;
        END LOOP;
    END LOOP;
END $$;
```

3. Click **"Run"** button

4. You should see: **"Success. No rows returned"**

### Step 2: Verify Assignments

Run this verification query:

```sql
-- Check if all subjects now have faculty
SELECT 
    s.semester,
    s.code,
    s.name,
    COUNT(fq.id) as faculty_count
FROM subjects s
LEFT JOIN faculty_qualified_subjects fq ON s.id = fq.subject_id
WHERE s.is_active = TRUE
GROUP BY s.semester, s.code, s.name, s.id
ORDER BY s.semester, s.name;
```

Expected result: Every subject should have `faculty_count >= 1`

### Step 3: Test AI Generation

1. Go to: `http://localhost:3000/faculty/ai-timetable-creator`
2. Enter prompt: **"Create timetable for 3rd semester"**
3. Click **"Generate"**
4. Should now work without "no qualified faculty" errors! ✅

---

## Alternative: Use the UI (No SQL Required)

### Step 1: Navigate to Qualifications Page

```
http://localhost:3000/faculty/qualifications
```

### Step 2: Check Status

- See how many qualifications exist
- Note which subjects show in red (no faculty assigned)

### Step 3: Add Missing Qualifications

For each subject without faculty:

1. Click **"Add Qualification"** button
2. Select a **Faculty member**
3. Select the **Subject**
4. Set **Proficiency Level** (7-8 is good)
5. Set **Preference Score** (5-6 is neutral)
6. Check **"Can handle lab"** if it's a lab subject
7. Check **"Primary Teacher"** for the main instructor
8. Click **"Add Qualification"**

### Step 4: Repeat

Continue until all subjects have at least 1 faculty member assigned.

---

## Verification Checklist

After running the fix, verify:

- [ ] All subjects have at least 1 qualified faculty
- [ ] Faculty are distributed somewhat evenly
- [ ] Lab subjects have faculty with `can_handle_lab = TRUE`
- [ ] AI timetable generation works without conflicts

---

## What This Does

The system creates entries in the `faculty_qualified_subjects` table that link:
- **Faculty members** → **Subjects they can teach**

The AI algorithm queries this table to assign teachers to classes. If a subject has no qualified faculty, it creates a conflict and skips that subject.

---

## Troubleshooting

### Still getting conflicts?

Run this to find problematic subjects:

```sql
SELECT 
    s.semester,
    s.code,
    s.name,
    s.subject_type
FROM subjects s
LEFT JOIN faculty_qualified_subjects fq ON s.id = fq.subject_id
WHERE s.is_active = TRUE
  AND fq.id IS NULL
ORDER BY s.semester, s.name;
```

Any rows returned = subjects without faculty → **Assign them manually via UI**

### Too many conflicts?

Check faculty workload:

```sql
SELECT 
    u.first_name || ' ' || u.last_name as faculty_name,
    COUNT(*) as subjects_count
FROM users u
JOIN faculty_qualified_subjects fq ON u.id = fq.faculty_id
WHERE u.role = 'faculty'
GROUP BY u.id, u.first_name, u.last_name
ORDER BY subjects_count DESC;
```

If one faculty has too many subjects, redistribute via UI.

---

## Summary

**Problem:** AI can't generate timetables → "No qualified faculty" errors

**Solution:** Assign faculty to subjects via:
- SQL script (auto-assign) ← **Fastest**
- UI page at `/faculty/qualifications` ← **Most control**

**Result:** AI timetable generation works! ✅

---

**Need more help?** See `FACULTY_QUALIFICATION_SYSTEM.md` for complete documentation.
