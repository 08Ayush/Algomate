-- ============================================================================
-- QUICK FIX: Tag ALL subjects for your college with B.Ed
-- Use this if your college only offers B.Ed program
-- ============================================================================

-- STEP 1: Show what will be tagged
SELECT 
    'Will tag ' || COUNT(*) || ' subjects with program B.Ed' as action_summary
FROM subjects 
WHERE is_active = true;

-- STEP 2: Show sample subjects that will be tagged
SELECT 
    code, 
    name, 
    semester,
    d.name as department_name
FROM subjects s
LEFT JOIN departments d ON s.department_id = d.id
WHERE s.is_active = true
LIMIT 10;

-- STEP 3: Tag ALL active subjects with B.Ed program
UPDATE subjects 
SET program = 'B.Ed'
WHERE is_active = true;

-- STEP 4: Verify the update
SELECT 
    program,
    COUNT(*) as subject_count
FROM subjects 
WHERE is_active = true
GROUP BY program;

-- STEP 5: Show distribution by semester
SELECT 
    semester,
    COUNT(*) as subject_count,
    string_agg(code, ', ' ORDER BY code) as subjects
FROM subjects 
WHERE is_active = true AND program = 'B.Ed'
GROUP BY semester
ORDER BY semester;

-- STEP 6: Final verification
SELECT 
    COUNT(*) FILTER (WHERE program IS NOT NULL) as tagged_subjects,
    COUNT(*) FILTER (WHERE program IS NULL) as untagged_subjects,
    COUNT(*) as total_active_subjects
FROM subjects 
WHERE is_active = true;

-- ============================================================================
-- If you have MULTIPLE programs (ITEP, B.Ed, M.Ed)
-- ============================================================================

-- Option 1: Tag by department
/*
-- First check your departments:
SELECT id, name, code FROM departments ORDER BY name;

-- Then tag based on department names:
UPDATE subjects SET program = 'B.Ed'
WHERE department_id = 'paste-bed-department-uuid-here';

UPDATE subjects SET program = 'M.Ed'
WHERE department_id = 'paste-med-department-uuid-here';

UPDATE subjects SET program = 'ITEP'
WHERE department_id = 'paste-itep-department-uuid-here';
*/

-- Option 2: Tag by semester range
/*
-- If Sem 1-4 = B.Ed, Sem 5-8 = ITEP
UPDATE subjects SET program = 'B.Ed' WHERE semester BETWEEN 1 AND 4 AND is_active = true;
UPDATE subjects SET program = 'ITEP' WHERE semester BETWEEN 5 AND 8 AND is_active = true;
*/

-- Option 3: Tag by subject code patterns
/*
UPDATE subjects SET program = 'B.Ed' WHERE code LIKE 'CS%' OR code LIKE 'MATH%';
UPDATE subjects SET program = 'ITEP' WHERE code LIKE 'ED%' OR code LIKE 'TEACH%';
*/
