-- ============================================================================
-- DIAGNOSTIC: Check Current Database State
-- Run this BEFORE creating batches to understand your setup
-- ============================================================================

-- 1. Check if colleges exist
SELECT '========== COLLEGES ==========' as info;
SELECT id, name, code, is_active FROM colleges ORDER BY code;

-- 2. Check if departments exist
SELECT '========== DEPARTMENTS ==========' as info;
SELECT 
    d.id,
    c.code as college_code,
    d.name as department_name,
    d.code as department_code,
    d.is_active
FROM departments d
JOIN colleges c ON d.college_id = c.id
ORDER BY c.code, d.code;

-- 3. Check if batches exist
SELECT '========== BATCHES ==========' as info;
SELECT COUNT(*) as total_batches FROM batches;
SELECT COUNT(*) as active_batches FROM batches WHERE is_active = TRUE;

-- 4. If batches exist, show them
SELECT 
    c.code as college,
    d.code as dept,
    b.semester,
    b.name,
    b.is_current_semester
FROM batches b
JOIN colleges c ON b.college_id = c.id
JOIN departments d ON b.department_id = d.id
WHERE b.is_active = TRUE
ORDER BY c.code, d.code, b.semester
LIMIT 20;

-- 5. Check your user account
SELECT '========== YOUR USER ==========' as info;
-- REPLACE 'your@email.com' with your actual email
SELECT 
    id,
    email,
    role,
    department_id,
    college_id,
    is_active
FROM users 
WHERE email = 'your@email.com' -- CHANGE THIS
LIMIT 1;

-- 6. Check if your department has batches
SELECT '========== YOUR DEPARTMENT BATCHES ==========' as info;
SELECT 
    b.semester,
    b.name,
    b.is_active
FROM batches b
WHERE b.department_id = (
    SELECT department_id FROM users WHERE email = 'your@email.com' LIMIT 1 -- CHANGE THIS
)
AND b.is_active = TRUE
ORDER BY b.semester;

-- 7. Summary
SELECT '========== SUMMARY ==========' as info;
SELECT 
    (SELECT COUNT(*) FROM colleges WHERE is_active = TRUE) as active_colleges,
    (SELECT COUNT(*) FROM departments WHERE is_active = TRUE) as active_departments,
    (SELECT COUNT(*) FROM batches WHERE is_active = TRUE) as active_batches,
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as active_users;
