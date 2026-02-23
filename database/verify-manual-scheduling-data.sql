-- ============================================================================
-- MANUAL SCHEDULING DATA VERIFICATION AND TESTING SCRIPT
-- Run this to check if all semester-subject-faculty linkages are working
-- ============================================================================

-- Check 1: Verify basic data exists
SELECT '=== BASIC DATA VERIFICATION ===' as section;

SELECT 
    'Colleges' as entity,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as names
FROM colleges 
WHERE is_active = true;

SELECT 
    'Departments' as entity,
    COUNT(*) as count,
    STRING_AGG(name || ' (' || code || ')', ', ') as departments
FROM departments 
WHERE is_active = true;

SELECT 
    'Users by Role' as entity,
    role,
    COUNT(*) as count
FROM users 
WHERE is_active = true
GROUP BY role
ORDER BY role;

-- Check 2: Verify subjects have semester information
SELECT '=== SUBJECTS WITH SEMESTER INFO ===' as section;

SELECT 
    'Subjects by Semester' as check_type,
    COALESCE(semester::text, 'NULL') as semester,
    COUNT(*) as subject_count,
    STRING_AGG(code, ', ' ORDER BY code) as subject_codes
FROM subjects 
WHERE is_active = true
GROUP BY semester 
ORDER BY semester NULLS LAST;

-- Check 3: Verify faculty qualifications exist
SELECT '=== FACULTY QUALIFICATIONS ===' as section;

SELECT 
    'Faculty Qualification Summary' as check_type,
    COUNT(DISTINCT faculty_id) as qualified_faculty,
    COUNT(DISTINCT subject_id) as subjects_covered,
    COUNT(*) as total_qualifications
FROM faculty_qualified_subjects;

-- Check 4: Specific check for bramhe user
SELECT '=== BRAMHE USER VERIFICATION ===' as section;

SELECT 
    'Bramhe User Info' as check_type,
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    u.department_id,
    d.name as department_name,
    d.code as department_code
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.email = 'bramhe@svpce.edu.in';

-- Check bramhe's qualifications by semester
SELECT 
    'Bramhe Qualifications by Semester' as check_type,
    COALESCE(s.semester, 0) as semester,
    COUNT(*) as qualified_subjects,
    STRING_AGG(s.code, ', ' ORDER BY s.code) as subject_codes
FROM users u
JOIN faculty_qualified_subjects fqs ON u.id = fqs.faculty_id
JOIN subjects s ON fqs.subject_id = s.id
WHERE u.email = 'bramhe@svpce.edu.in'
  AND s.is_active = true
GROUP BY s.semester
ORDER BY semester;

-- Check 5: Test the exact query the component will use for subjects
SELECT '=== COMPONENT QUERY SIMULATION - SUBJECTS ===' as section;

SELECT 
    'Simulated API Query - Subjects' as query_type,
    s.id,
    s.name,
    s.code,
    s.semester,
    s.subject_type,
    s.credits_per_week as credits,
    s.requires_lab
FROM subjects s
WHERE s.department_id = (SELECT id FROM departments WHERE code = 'CSE' LIMIT 1)
  AND s.is_active = true 
  AND s.semester IS NOT NULL
ORDER BY s.semester, s.name
LIMIT 10;

-- Check 6: Test the exact query the component will use for faculty
SELECT '=== COMPONENT QUERY SIMULATION - FACULTY ===' as section;

WITH faculty_with_qualifications AS (
    SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.department_id,
        COALESCE(
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'id', s.id,
                    'name', s.name,
                    'code', s.code,
                    'semester', s.semester
                )
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'::json
        ) as qualified_subjects
    FROM users u
    LEFT JOIN faculty_qualified_subjects fqs ON u.id = fqs.faculty_id
    LEFT JOIN subjects s ON fqs.subject_id = s.id AND s.is_active = true
    WHERE u.role = 'faculty' 
      AND u.is_active = true 
      AND u.department_id = (SELECT id FROM departments WHERE code = 'CSE' LIMIT 1)
    GROUP BY u.id, u.first_name, u.last_name, u.email, u.department_id
)
SELECT 
    'Simulated API Query - Faculty' as query_type,
    id,
    first_name,
    last_name,
    email,
    JSON_ARRAY_LENGTH(qualified_subjects) as qualification_count
FROM faculty_with_qualifications
ORDER BY first_name, last_name;

-- Check 7: Verify semester filtering will work
SELECT '=== SEMESTER FILTERING TEST ===' as section;

-- Test for each semester 1-8
DO $$
DECLARE
    sem INT;
    subject_count INT;
    faculty_count INT;
BEGIN
    FOR sem IN 1..8 LOOP
        -- Count subjects for this semester
        SELECT COUNT(*) INTO subject_count
        FROM subjects s
        WHERE s.department_id = (SELECT id FROM departments WHERE code = 'CSE' LIMIT 1)
          AND s.is_active = true 
          AND s.semester = sem;
        
        -- Count faculty who can teach subjects in this semester
        SELECT COUNT(DISTINCT u.id) INTO faculty_count
        FROM users u
        JOIN faculty_qualified_subjects fqs ON u.id = fqs.faculty_id
        JOIN subjects s ON fqs.subject_id = s.id
        WHERE u.role = 'faculty' 
          AND u.is_active = true
          AND u.department_id = (SELECT id FROM departments WHERE code = 'CSE' LIMIT 1)
          AND s.semester = sem
          AND s.is_active = true;
        
        RAISE NOTICE 'Semester %: % subjects, % qualified faculty', sem, subject_count, faculty_count;
    END LOOP;
END $$;

-- Check 8: Identify any issues
SELECT '=== POTENTIAL ISSUES ===' as section;

-- Subjects without semester
SELECT 
    'Subjects Missing Semester' as issue_type,
    COUNT(*) as count,
    STRING_AGG(code, ', ') as affected_subjects
FROM subjects 
WHERE is_active = true AND semester IS NULL;

-- Faculty without qualifications
SELECT 
    'Faculty Without Qualifications' as issue_type,
    COUNT(*) as count
FROM users u
LEFT JOIN faculty_qualified_subjects fqs ON u.id = fqs.faculty_id
WHERE u.role = 'faculty' 
  AND u.is_active = true
  AND fqs.faculty_id IS NULL;

-- Users without department
SELECT 
    'Users Without Department' as issue_type,
    COUNT(*) as count,
    STRING_AGG(email, ', ') as affected_users
FROM users 
WHERE is_active = true AND department_id IS NULL;

-- Final summary
SELECT '=== SUMMARY FOR MANUAL SCHEDULING ===' as section;

SELECT 
    'READY FOR TESTING' as status,
    'All data structures are in place for manual scheduling with semester filtering' as message
WHERE EXISTS (
    SELECT 1 FROM subjects WHERE semester IS NOT NULL AND is_active = true
) AND EXISTS (
    SELECT 1 FROM faculty_qualified_subjects
) AND EXISTS (
    SELECT 1 FROM users WHERE email = 'bramhe@svpce.edu.in' AND department_id IS NOT NULL
);

RAISE NOTICE '🔍 Data verification completed!';
RAISE NOTICE 'Check the results above to ensure manual scheduling will work properly.';
RAISE NOTICE 'If you see data for all sections, the semester filtering should work!';