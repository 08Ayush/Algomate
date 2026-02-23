-- ============================================================================
-- Test What the Frontend Will Query
-- This simulates exactly what CurriculumBuilder.tsx does
-- ============================================================================

-- First, find your college_id
SELECT id, name FROM colleges;

-- Then test the query (replace 'your-college-uuid' with actual college ID from above)
-- Example for B.Tech CSE Semester 1:
SELECT 
    id, code, name, semester, program, college_id, course_group_id
FROM subjects 
WHERE college_id = 'your-college-uuid-here'  -- REPLACE THIS
AND semester = 1
AND program = 'B.Tech CSE'
AND is_active = true
AND course_group_id IS NULL
ORDER BY code;

-- Check all subjects regardless of college filter
SELECT 
    id, code, name, semester, program, college_id, course_group_id
FROM subjects 
WHERE semester = 1
AND program = 'B.Tech CSE'
AND is_active = true
AND course_group_id IS NULL
ORDER BY code;

-- Check if subjects have college_id set
SELECT 
    college_id,
    COUNT(*) as subject_count
FROM subjects 
WHERE is_active = true
GROUP BY college_id;

-- Show sample subjects with all relevant fields
SELECT 
    code, name, semester, program, college_id, is_active, course_group_id
FROM subjects 
WHERE program = 'B.Tech CSE' 
AND semester = 1
LIMIT 10;
