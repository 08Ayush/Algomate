-- ============================================================================
-- DIAGNOSTIC: Understand Your Subject Structure
-- Run this to see what your subjects actually look like
-- ============================================================================

-- Check if program column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'subjects' 
AND column_name IN ('program', 'semester', 'code', 'name');

-- Sample of your actual subjects (first 20)
SELECT 
    id, 
    code, 
    name, 
    semester,
    program,
    department_id,
    is_active
FROM subjects 
WHERE is_active = true
LIMIT 20;

-- Count subjects by department
SELECT 
    d.name as department_name,
    d.code as dept_code,
    COUNT(s.id) as subject_count
FROM subjects s
JOIN departments d ON s.department_id = d.id
WHERE s.is_active = true
GROUP BY d.name, d.code
ORDER BY subject_count DESC;

-- Check naming patterns in your subjects
SELECT 
    substring(code from 1 for 3) as code_prefix,
    COUNT(*) as count,
    (array_agg(DISTINCT code ORDER BY code))[1:5] as sample_codes
FROM subjects 
WHERE is_active = true AND code IS NOT NULL
GROUP BY substring(code from 1 for 3)
ORDER BY count DESC;

-- Check if subjects have semester data
SELECT 
    semester,
    COUNT(*) as subject_count
FROM subjects 
WHERE is_active = true
GROUP BY semester
ORDER BY semester;

-- Show all subjects for analysis
SELECT 
    s.code,
    s.name,
    s.semester,
    s.program,
    d.name as department_name
FROM subjects s
LEFT JOIN departments d ON s.department_id = d.id
WHERE s.is_active = true
ORDER BY d.name, s.semester, s.code;
