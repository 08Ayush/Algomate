-- ============================================================================
-- COMPREHENSIVE SCHEDULING DATA FIX
-- Academic Compass - Timetable Scheduler
-- ============================================================================
-- Generated from deep analysis of subjects.json (217 records) + live DB
-- College: c25be3d2-4b6d-4373-b6de-44a4e2a2508f
-- Departments: CSE (817ba459...), CSE-DS (6f6eafb0...)
-- ============================================================================

-- ============================================================================
-- HOW THE SCHEDULER USES THESE FIELDS (IMPORTANT - READ FIRST!)
-- ============================================================================
-- 
-- The scheduler (GA solver via transformer) works like this:
--
-- For THEORY subjects:
--   hours_per_week = required_hours_per_week (from batch_subjects)
--   Example: rhpw=3 → 3 one-hour slots per week
--
-- For LAB/PRACTICAL subjects:
--   hours_per_week = required_hours_per_week × 2 (transformer doubles it!)
--   Example: rhpw=1 → 2 slots → ONE 2-hour block per week
--   Example: rhpw=2 → 4 slots → TWO 2-hour blocks per week
--
-- Lab detection triggers (any one is enough):
--   1. subject_type IN ('LAB', 'PRACTICAL')  ← PRIMARY, always works
--   2. requires_lab = true
--   3. lab_hours > 0
--   4. Name contains "lab", "workshop", "practical", or code ends with "P"
--
-- Faculty requirement:
--   assigned_faculty_id in batch_subjects MUST be set, or the subject
--   will not be scheduled at all.
--
-- Department scoping:
--   The extractor only fetches faculty from the SAME department as the batch.
--   Cross-department subjects won't find qualified faculty.
-- ============================================================================


-- ============================================================================
-- FIX 0: Remove cross-department subjects from batches
-- ============================================================================
-- PROBLEM: 114 batch_subjects have a mismatch between the batch's dept and
--          the subject's dept. This causes the scheduler to fail finding
--          qualified faculty (it only looks in the batch's own department).
--
-- AFFECTED:
--   CSE batches with CSE-DS (24DS*) subjects   → 53 rows
--   CSE-DS batches with CSE (25CE*/25ES*) subjects → 61 rows
--
-- ⚠ WARNING: After deletion, these CSE batches will have ZERO subjects left
--   because 100% of their subjects belong to the other dept:
--     - CSE Batch 2024 - Sem 3  (all 11 subjects are 24DS/24ES)
--     - CSE Batch 2023 - Sem 5  (all 10 subjects are 24DS)
--     - CSE Batch 2023 - Sem 6  (all 10 subjects are 24DS)
--     - CSE Batch 2022 - Sem 8  (all 8 subjects are 24DS)
--
--   Before deleting, make sure 25CE-prefix subjects for those semesters
--   are added to the correct CSE batches. Otherwise, those batches will be
--   left with no curriculum at all.
--
-- CSE Batch 2025 - Sem 2 is safe: it has 25CE Sem-2 subjects (correct), 
--   plus 24DS duplicates (wrong) which will be removed.
-- ============================================================================

-- STEP 1: Preview what will be deleted per batch (run this first!)
/*
SELECT 
  b.name as batch_name,
  bd.code as batch_dept,
  sd.code as subject_dept,
  COUNT(*) as subjects_to_delete,
  STRING_AGG(s.code, ', ' ORDER BY s.code) as codes
FROM batch_subjects bs
JOIN subjects s ON s.id = bs.subject_id
JOIN batches b ON b.id = bs.batch_id
JOIN departments bd ON bd.id = b.department_id
JOIN departments sd ON sd.id = s.department_id
WHERE b.college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  AND s.department_id != b.department_id
GROUP BY b.name, bd.code, sd.code
ORDER BY b.name;
*/

-- STEP 2: Preview which batches will be EMPTY after deletion
/*
SELECT b.name, COUNT(*) as total_subjects
FROM batch_subjects bs
JOIN batches b ON b.id = bs.batch_id
JOIN subjects s ON s.id = bs.subject_id
WHERE b.college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  AND (s.department_id IS NULL OR s.department_id = b.department_id)  -- only correct subjects
GROUP BY b.name
ORDER BY b.name;
-- Any batch not in these results would become EMPTY after deletion
*/

-- STEP 3: THE DELETE (run after confirming with steps 1 and 2)
DELETE FROM batch_subjects bs
USING subjects s, batches b
WHERE bs.subject_id = s.id
  AND bs.batch_id = b.id
  AND b.college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  AND s.department_id IS NOT NULL
  AND b.department_id IS NOT NULL
  AND s.department_id != b.department_id;
-- Expected: 114 rows deleted


-- PROBLEM: credits_per_week=3 but required_hours_per_week=1
-- EFFECT: Only 1 hour/week scheduled instead of 3
-- This is the ONLY theory subject with this mismatch.

UPDATE batch_subjects bs
SET required_hours_per_week = 3
FROM subjects s
WHERE bs.subject_id = s.id
  AND s.code = '25CE431M'
  AND bs.required_hours_per_week = 1;

-- Verify:
-- SELECT s.code, s.name, bs.required_hours_per_week, s.credits_per_week
-- FROM batch_subjects bs JOIN subjects s ON s.id = bs.subject_id
-- WHERE s.code = '25CE431M';


-- ============================================================================
-- FIX 2: Lab subject data integrity (COSMETIC - doesn't break scheduling)
-- ============================================================================
-- PROBLEM: Many 25CE-prefix LAB subjects have:
--   requires_lab = false, lab_hours = 0, preferred_duration = 60
-- These still schedule correctly because subject_type='LAB' triggers detection,
-- but fixing them improves data consistency.

-- Fix LAB subjects: set requires_lab=true, lab_hours=2, preferred_duration=120
UPDATE subjects
SET requires_lab = true,
    lab_hours = 2,
    preferred_duration = 120
WHERE subject_type = 'LAB'
  AND college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  AND (requires_lab = false OR lab_hours = 0 OR preferred_duration = 60);

-- Fix PRACTICAL subjects: set requires_lab=true, preferred_duration=120
-- (lab_hours varies by credit - set to cpw*2 for practicals)
UPDATE subjects
SET requires_lab = true,
    preferred_duration = 120
WHERE subject_type = 'PRACTICAL'
  AND college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  AND (requires_lab = false OR preferred_duration = 60);


-- ============================================================================
-- FIX 3A: Assign department_id to cross-department subjects
-- ============================================================================
-- PROBLEM: 24DS-prefix subjects belong to CSE-DS dept but some are in CSE batches
--          24ES-prefix subjects are Engineering Sciences (shared between both depts)
--
-- These subjects already have correct department_id in the subjects table.
-- The issue is that batch_subjects links them to batches of a DIFFERENT department.
-- This means the extractor can't find faculty (it scopes by batch's department).
--
-- SOLUTION OPTIONS (choose one):
--
-- Option A: Make faculty department-agnostic for shared subjects
--   → Modify extractor.py to not filter faculty by department
--   → Risky: could assign unqualified faculty
--
-- Option B: Create faculty records in BOTH departments for shared faculty
--   → Faculty who teach in both CSE and CSE-DS get entries in both
--
-- Option C (RECOMMENDED): Update the extractor to also include faculty
--   qualified for the SUBJECT regardless of their department.
--   This is the most targeted fix.
--
-- For now, the SQL below focuses on what CAN be fixed in the DB:


-- ============================================================================
-- FIX 3B: FACULTY ASSIGNMENT - THE BIGGEST BLOCKER
-- ============================================================================
-- STATUS: 175 out of 248 batch_subjects have NO assigned_faculty_id (70%)
--         ALL CSE-DS (24DS*) batch_subjects: 0 faculty assigned
--         CSE (25CE*) batch_subjects: mostly assigned (73/73)
--
-- This MUST be done through the admin UI or bulk SQL based on your faculty roster.
-- Below are helper queries to identify what needs assignment.

-- View all unassigned batch_subjects grouped by batch:
/*
SELECT 
  b.name as batch_name,
  b.semester,
  s.code,
  s.name as subject_name,
  s.subject_type,
  s.credits_per_week,
  bs.required_hours_per_week,
  bs.assigned_faculty_id
FROM batch_subjects bs
JOIN subjects s ON s.id = bs.subject_id
JOIN batches b ON b.id = bs.batch_id
WHERE b.college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  AND bs.assigned_faculty_id IS NULL
ORDER BY b.semester, b.name, s.code;
*/

-- View available faculty and their qualifications:
/*
SELECT 
  u.first_name || ' ' || u.last_name as faculty_name,
  u.id as faculty_id,
  d.short_name as department,
  COUNT(fqs.subject_id) as qualified_subjects
FROM users u
JOIN departments d ON d.id = u.department_id
LEFT JOIN faculty_qualified_subjects fqs ON fqs.faculty_id = u.id
WHERE u.college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  AND u.role IN ('faculty', 'hod')
GROUP BY u.id, u.first_name, u.last_name, d.short_name
ORDER BY d.short_name, faculty_name;
*/

-- Auto-assign faculty based on qualifications (USE WITH CAUTION):
-- This assigns the FIRST qualified faculty to each unassigned batch_subject.
-- You should review and adjust assignments afterward.
/*
WITH qualified_matches AS (
  SELECT DISTINCT ON (bs.id)
    bs.id as batch_subject_id,
    fqs.faculty_id
  FROM batch_subjects bs
  JOIN subjects s ON s.id = bs.subject_id
  JOIN batches b ON b.id = bs.batch_id
  JOIN faculty_qualified_subjects fqs ON fqs.subject_id = s.id
  WHERE b.college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
    AND bs.assigned_faculty_id IS NULL
  ORDER BY bs.id, fqs.faculty_id
)
UPDATE batch_subjects bs
SET assigned_faculty_id = qm.faculty_id
FROM qualified_matches qm
WHERE bs.id = qm.batch_subject_id;
*/


-- ============================================================================
-- FIX 4: Industry/Research Internship (25CE803P) - rhpw=12
-- ============================================================================
-- PROBLEM: This practical has rhpw=12, cpw=12. The transformer would create
--          12 × 2 = 24 time slots (twelve 2-hr blocks per week!).
--          This is a full-time internship and should NOT be in the timetable.
--
-- SOLUTION: Either remove it from batch_subjects, or set rhpw=0 to skip it.

UPDATE batch_subjects bs
SET required_hours_per_week = 0
FROM subjects s
WHERE bs.subject_id = s.id
  AND s.code = '25CE803P';

-- Or to completely remove it from scheduling:
-- DELETE FROM batch_subjects bs
-- USING subjects s
-- WHERE bs.subject_id = s.id AND s.code = '25CE803P';


-- ============================================================================
-- FIX 5: Set proper credit_value for NEP display
-- ============================================================================
-- PROBLEM: All subjects have credit_value = 1.0 (default/placeholder)
-- This doesn't affect scheduling but is needed for correct transcript display.

-- Theory subjects: credit_value = credits_per_week (e.g., 3 cpw = 3 credits)
UPDATE subjects
SET credit_value = credits_per_week
WHERE college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  AND subject_type = 'THEORY'
  AND (credit_value IS NULL OR credit_value = 1.0);

-- Lab subjects: credit_value = credits_per_week (typically 1)
UPDATE subjects
SET credit_value = credits_per_week
WHERE college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  AND subject_type IN ('LAB', 'PRACTICAL')
  AND (credit_value IS NULL OR credit_value = 1.0);


-- ============================================================================
-- VERIFICATION QUERIES (run after applying fixes)
-- ============================================================================

-- 1. Check no theory subjects have rhpw mismatch:
/*
SELECT s.code, s.name, bs.required_hours_per_week, s.credits_per_week
FROM batch_subjects bs
JOIN subjects s ON s.id = bs.subject_id
JOIN batches b ON b.id = bs.batch_id
WHERE b.college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  AND s.subject_type = 'THEORY'
  AND bs.required_hours_per_week != s.credits_per_week;
-- Should return 0 rows
*/

-- 2. Check all labs have proper flags:
/*
SELECT code, name, subject_type, requires_lab, lab_hours, preferred_duration
FROM subjects
WHERE college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  AND subject_type IN ('LAB', 'PRACTICAL')
  AND (requires_lab = false OR lab_hours = 0)
ORDER BY code;
-- Should return 0 rows
*/

-- 3. Check faculty assignment coverage:
/*
SELECT 
  b.name,
  COUNT(*) as total,
  COUNT(bs.assigned_faculty_id) as with_faculty,
  COUNT(*) - COUNT(bs.assigned_faculty_id) as missing
FROM batch_subjects bs
JOIN batches b ON b.id = bs.batch_id
WHERE b.college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
GROUP BY b.name
ORDER BY b.name;
*/
