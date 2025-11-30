-- ============================================================================
-- Tag Subjects with Program Values for NEP Curriculum Builder
-- Run this script to populate the 'program' column in subjects table
-- ============================================================================

-- IMPORTANT: First run 'diagnose_subjects.sql' to see your actual subject structure!

-- STEP 0: Check if program column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'program'
    ) THEN
        ALTER TABLE subjects ADD COLUMN program VARCHAR(50);
        RAISE NOTICE 'Added program column to subjects table';
    ELSE
        RAISE NOTICE 'Program column already exists';
    END IF;
END $$;

-- STEP 1: Check which subjects need tagging (EXPANDED PATTERNS)
SELECT 
    id, code, name, semester, program,
    d.name as department_name,
    CASE 
        -- ITEP patterns
        WHEN code ILIKE 'ITEP%' OR code ILIKE 'ITE%' OR name ILIKE '%ITEP%' OR name ILIKE '%Integrated Teacher%' THEN 'ITEP'
        -- B.Ed patterns (very flexible)
        WHEN code ILIKE 'BED%' OR code ILIKE 'B.ED%' OR code ILIKE 'B_ED%' 
            OR name ILIKE '%B.Ed%' OR name ILIKE '%B Ed%' OR name ILIKE '%Bachelor of Education%'
            OR d.name ILIKE '%B.Ed%' OR d.name ILIKE '%Bachelor of Education%' THEN 'B.Ed'
        -- M.Ed patterns
        WHEN code ILIKE 'MED%' OR code ILIKE 'M.ED%' OR code ILIKE 'M_ED%'
            OR name ILIKE '%M.Ed%' OR name ILIKE '%M Ed%' OR name ILIKE '%Master of Education%'
            OR d.name ILIKE '%M.Ed%' OR d.name ILIKE '%Master of Education%' THEN 'M.Ed'
        ELSE 'UNKNOWN - NEEDS MANUAL TAGGING'
    END as suggested_program
FROM subjects s
LEFT JOIN departments d ON s.department_id = d.id
WHERE is_active = true
ORDER BY d.name, semester, code;

-- STEP 2: Update subjects with ITEP program (EXPANDED PATTERNS)
UPDATE subjects 
SET program = 'ITEP'
WHERE (
    code ILIKE 'ITEP%' OR 
    code ILIKE 'ITE%' OR
    name ILIKE '%ITEP%' OR 
    name ILIKE '%Integrated Teacher Education%'
) AND is_active = true;

-- STEP 3: Update subjects with B.Ed program (EXPANDED PATTERNS)
UPDATE subjects 
SET program = 'B.Ed'
WHERE (
    code ILIKE 'BED%' OR 
    code ILIKE 'B.ED%' OR 
    code ILIKE 'B_ED%' OR
    name ILIKE '%B.Ed%' OR 
    name ILIKE '%B Ed%' OR
    name ILIKE '%Bachelor of Education%' OR
    department_id IN (
        SELECT id FROM departments 
        WHERE name ILIKE '%B.Ed%' OR name ILIKE '%Bachelor of Education%'
    )
) AND is_active = true;

-- STEP 4: Update subjects with M.Ed program (EXPANDED PATTERNS)
UPDATE subjects 
SET program = 'M.Ed'
WHERE (
    code ILIKE 'MED%' OR 
    code ILIKE 'M.ED%' OR 
    code ILIKE 'M_ED%' OR
    name ILIKE '%M.Ed%' OR 
    name ILIKE '%M Ed%' OR
    name ILIKE '%Master of Education%' OR
    department_id IN (
        SELECT id FROM departments 
        WHERE name ILIKE '%M.Ed%' OR name ILIKE '%Master of Education%'
    )
) AND is_active = true;

-- STEP 5: Verify the updates
SELECT 
    program,
    COUNT(*) as subject_count,
    COUNT(DISTINCT semester) as semester_count
FROM subjects 
WHERE is_active = true AND program IS NOT NULL
GROUP BY program
ORDER BY program;

-- STEP 6: Check subjects that still need manual tagging
SELECT id, code, name, semester, department_id
FROM subjects 
WHERE is_active = true 
AND program IS NULL
ORDER BY semester, code;

-- ============================================================================
-- MANUAL TAGGING (Required if automatic tagging didn't work)
-- ============================================================================

-- OPTION A: Tag by Department Name
-- First, see your departments:
-- SELECT id, name, code FROM departments ORDER BY name;

-- Then tag subjects based on department:
/*
UPDATE subjects 
SET program = 'B.Ed'
WHERE department_id IN (
    SELECT id FROM departments WHERE name ILIKE '%B.Ed%' OR name ILIKE '%Bachelor%'
);

UPDATE subjects 
SET program = 'M.Ed'
WHERE department_id IN (
    SELECT id FROM departments WHERE name ILIKE '%M.Ed%' OR name ILIKE '%Master%'
);

UPDATE subjects 
SET program = 'ITEP'
WHERE department_id IN (
    SELECT id FROM departments WHERE name ILIKE '%ITEP%' OR name ILIKE '%Integrated%'
);
*/

-- OPTION B: Tag by Semester Range (if your college has clear semester structure)
/*
-- B.Ed: Semesters 1-4
UPDATE subjects 
SET program = 'B.Ed'
WHERE semester BETWEEN 1 AND 4 
AND college_id = 'your-college-uuid';

-- ITEP: Semesters 1-8 (or 5-8 if first 4 are B.Ed)
UPDATE subjects 
SET program = 'ITEP'
WHERE semester BETWEEN 5 AND 8 
AND college_id = 'your-college-uuid';
*/

-- OPTION C: Tag ALL subjects in your college to B.Ed (if that's your only program)
/*
UPDATE subjects 
SET program = 'B.Ed'
WHERE college_id = (SELECT id FROM colleges WHERE name = 'Your College Name')
AND is_active = true;
*/

-- OPTION D: Tag by specific subject codes
/*
UPDATE subjects 
SET program = 'B.Ed'
WHERE code IN ('CS101', 'MATH101', 'ENG101') -- Replace with your actual codes
AND is_active = true;
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check subjects by program and semester
SELECT 
    program,
    semester,
    COUNT(*) as count,
    string_agg(code, ', ' ORDER BY code) as subject_codes
FROM subjects 
WHERE is_active = true AND program IS NOT NULL
GROUP BY program, semester
ORDER BY program, semester;

-- Check if all active subjects have program assigned
SELECT 
    COUNT(*) FILTER (WHERE program IS NOT NULL) as tagged_subjects,
    COUNT(*) FILTER (WHERE program IS NULL) as untagged_subjects,
    COUNT(*) as total_active_subjects
FROM subjects 
WHERE is_active = true;
