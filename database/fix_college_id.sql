-- ============================================================================
-- Fix Missing college_id in Subjects
-- ============================================================================

-- STEP 1: Check current state
SELECT 
    'Subjects with college_id' as status,
    COUNT(*) as count
FROM subjects 
WHERE college_id IS NOT NULL AND is_active = true

UNION ALL

SELECT 
    'Subjects WITHOUT college_id',
    COUNT(*)
FROM subjects 
WHERE college_id IS NULL AND is_active = true;

-- STEP 2: Get your college ID
SELECT id, name FROM colleges;

-- STEP 3: Update all subjects to have the correct college_id
-- OPTION A: If you only have ONE college (most common)
UPDATE subjects 
SET college_id = (SELECT id FROM colleges LIMIT 1)
WHERE is_active = true;

-- OPTION B: If subjects should be assigned based on their department's college
-- UPDATE subjects 
-- SET college_id = (
--     SELECT college_id FROM departments 
--     WHERE departments.id = subjects.department_id
-- )
-- WHERE is_active = true;

-- STEP 4: Verify the update
SELECT 
    college_id,
    program,
    COUNT(*) as subject_count
FROM subjects 
WHERE is_active = true
GROUP BY college_id, program
ORDER BY program;

-- STEP 5: Test a sample query (what frontend will fetch)
-- Get college_id from your logged-in user
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.college_id,
    c.name as college_name
FROM users u
JOIN colleges c ON u.college_id = c.id
WHERE u.role = 'college_admin';

-- STEP 6: Test actual frontend query for B.Tech CSE Semester 1
-- Replace with your actual college_id
SELECT 
    id, code, name, semester, program
FROM subjects 
WHERE college_id = (SELECT id FROM colleges LIMIT 1)
AND semester = 1
AND program = 'B.Tech CSE'
AND is_active = true
AND course_group_id IS NULL
ORDER BY code;
