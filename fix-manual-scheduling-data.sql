-- SQL queries to diagnose and fix Manual Scheduling data issues

-- 1. Check current user data for bramhe@svpce.edu.in
SELECT 
    id, 
    first_name, 
    last_name, 
    email, 
    department_id, 
    college_id, 
    role, 
    is_active
FROM users 
WHERE email = 'bramhe@svpce.edu.in';

-- 2. Check available departments
SELECT 
    id, 
    name, 
    code, 
    college_id, 
    is_active
FROM departments 
WHERE is_active = true;

-- 3. Fix user department_id if missing (update bramhe to CSE department)
UPDATE users 
SET department_id = (
    SELECT id 
    FROM departments 
    WHERE code = 'CSE' 
    AND is_active = true 
    LIMIT 1
) 
WHERE email = 'bramhe@svpce.edu.in' 
AND department_id IS NULL;

-- 4. Update ALL faculty to have CSE department_id if they don't have one
UPDATE users 
SET department_id = (
    SELECT id 
    FROM departments 
    WHERE code = 'CSE' 
    AND is_active = true 
    LIMIT 1
) 
WHERE role = 'faculty' 
AND is_active = true 
AND department_id IS NULL;

-- 5. Check faculty after update
SELECT 
    id, 
    first_name, 
    last_name, 
    email, 
    department_id, 
    role
FROM users 
WHERE role = 'faculty' 
AND is_active = true
ORDER BY first_name;

-- 6. Check subjects and ensure they have department_id
SELECT 
    id, 
    name, 
    code, 
    semester, 
    department_id, 
    is_active
FROM subjects 
WHERE is_active = true
ORDER BY semester, code;

-- 7. Update subjects to have CSE department_id if missing
UPDATE subjects 
SET department_id = (
    SELECT id 
    FROM departments 
    WHERE code = 'CSE' 
    AND is_active = true 
    LIMIT 1
) 
WHERE department_id IS NULL 
AND is_active = true;

-- 8. Verify faculty qualifications exist
SELECT 
    fqs.id,
    u.first_name,
    u.last_name,
    s.name as subject_name,
    s.code as subject_code,
    s.semester,
    fqs.proficiency_level
FROM faculty_qualified_subjects fqs
JOIN users u ON fqs.faculty_id = u.id
JOIN subjects s ON fqs.subject_id = s.id
WHERE u.role = 'faculty' 
AND u.is_active = true
ORDER BY u.first_name, s.semester;

-- 9. Count data for verification
SELECT 
    'Users (Faculty)' as table_name,
    COUNT(*) as count
FROM users 
WHERE role = 'faculty' AND is_active = true
UNION ALL
SELECT 
    'Subjects' as table_name,
    COUNT(*) as count
FROM subjects 
WHERE is_active = true
UNION ALL
SELECT 
    'Faculty Qualifications' as table_name,
    COUNT(*) as count
FROM faculty_qualified_subjects fqs
JOIN users u ON fqs.faculty_id = u.id
WHERE u.role = 'faculty' AND u.is_active = true
UNION ALL
SELECT 
    'Departments' as table_name,
    COUNT(*) as count
FROM departments 
WHERE is_active = true;