-- ============================================================================
-- Tag Subjects with Program for Your College Structure
-- Based on your departments: CSE, CSE (Data Science), Education
-- ============================================================================

-- STEP 1: See what we have
SELECT 
    d.name as department_name,
    COUNT(s.id) as subject_count,
    MIN(s.semester) as min_sem,
    MAX(s.semester) as max_sem
FROM subjects s
JOIN departments d ON s.department_id = d.id
WHERE s.is_active = true
GROUP BY d.name;

-- STEP 2: Tag Computer Science & Engineering as "B.Tech CSE"
UPDATE subjects 
SET program = 'B.Tech CSE'
WHERE department_id IN (
    SELECT id FROM departments 
    WHERE name = 'Computer Science & Engineering'
)
AND is_active = true;

-- STEP 3: Tag Computer Science & Engineering (Data Science) as "B.Tech DS"
UPDATE subjects 
SET program = 'B.Tech DS'
WHERE department_id IN (
    SELECT id FROM departments 
    WHERE name = 'Computer Science & Engineering (Data Science)'
)
AND is_active = true;

-- STEP 4: Tag Education department subjects as "B.Ed"
UPDATE subjects 
SET program = 'B.Ed'
WHERE department_id IN (
    SELECT id FROM departments 
    WHERE name = 'Education'
)
AND is_active = true;

-- STEP 5: Verify the tagging
SELECT 
    program,
    COUNT(*) as subject_count,
    MIN(semester) as min_semester,
    MAX(semester) as max_semester
FROM subjects 
WHERE is_active = true
GROUP BY program
ORDER BY program;

-- STEP 6: Final verification
SELECT 
    COUNT(*) FILTER (WHERE program IS NOT NULL) as tagged_subjects,
    COUNT(*) FILTER (WHERE program IS NULL) as untagged_subjects,
    COUNT(*) as total_active_subjects
FROM subjects 
WHERE is_active = true;

-- STEP 7: Show subjects by department and program
SELECT 
    d.name as department_name,
    s.program,
    COUNT(*) as count
FROM subjects s
JOIN departments d ON s.department_id = d.id
WHERE s.is_active = true
GROUP BY d.name, s.program
ORDER BY d.name;
