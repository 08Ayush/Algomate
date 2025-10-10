-- ================================================================
-- CHECK CSE DEPARTMENT QUALIFICATIONS
-- ================================================================
-- Run this in Supabase SQL Editor to view all qualifications
-- for Computer Science & Engineering department
-- ================================================================

-- First, find the CSE department ID
SELECT 
    id as department_id,
    name as department_name,
    code as department_code
FROM departments
WHERE code ILIKE '%CSE%' OR name ILIKE '%Computer Science%'
ORDER BY name;

-- ================================================================
-- VIEW ALL CSE QUALIFICATIONS WITH DETAILS
-- ================================================================

SELECT 
    fqs.id,
    fqs.created_at,
    -- Faculty Details
    u.first_name || ' ' || u.last_name as faculty_name,
    u.email as faculty_email,
    u.department_id as faculty_dept_id,
    dept_faculty.name as faculty_department,
    -- Subject Details
    s.name as subject_name,
    s.code as subject_code,
    s.semester as subject_semester,
    s.subject_type,
    s.department_id as subject_dept_id,
    dept_subject.name as subject_department,
    -- Qualification Details
    fqs.proficiency_level,
    fqs.preference_score,
    fqs.is_primary_teacher,
    fqs.can_handle_lab,
    fqs.can_handle_tutorial
FROM faculty_qualified_subjects fqs
-- Join faculty
JOIN users u ON u.id = fqs.faculty_id
JOIN departments dept_faculty ON dept_faculty.id = u.department_id
-- Join subjects
JOIN subjects s ON s.id = fqs.subject_id
JOIN departments dept_subject ON dept_subject.id = s.department_id
-- Filter for CSE department (both faculty and subject must be CSE)
WHERE dept_faculty.code ILIKE '%CSE%' 
  AND dept_subject.code ILIKE '%CSE%'
ORDER BY 
    s.semester,
    s.name,
    u.last_name,
    u.first_name;

-- ================================================================
-- COUNT QUALIFICATIONS BY SEMESTER (CSE ONLY)
-- ================================================================

SELECT 
    s.semester,
    COUNT(*) as total_qualifications,
    COUNT(DISTINCT fqs.faculty_id) as unique_faculty,
    COUNT(DISTINCT fqs.subject_id) as unique_subjects
FROM faculty_qualified_subjects fqs
JOIN users u ON u.id = fqs.faculty_id
JOIN subjects s ON s.id = fqs.subject_id
JOIN departments dept_faculty ON dept_faculty.id = u.department_id
JOIN departments dept_subject ON dept_subject.id = s.department_id
WHERE dept_faculty.code ILIKE '%CSE%' 
  AND dept_subject.code ILIKE '%CSE%'
GROUP BY s.semester
ORDER BY s.semester;

-- ================================================================
-- VIEW QUALIFICATIONS BY FACULTY (CSE ONLY)
-- ================================================================

SELECT 
    u.first_name || ' ' || u.last_name as faculty_name,
    u.email,
    COUNT(*) as total_subjects_qualified,
    STRING_AGG(s.code || ' (' || s.name || ')', ', ' ORDER BY s.semester, s.code) as qualified_subjects
FROM faculty_qualified_subjects fqs
JOIN users u ON u.id = fqs.faculty_id
JOIN subjects s ON s.id = fqs.subject_id
JOIN departments dept_faculty ON dept_faculty.id = u.department_id
JOIN departments dept_subject ON dept_subject.id = s.department_id
WHERE dept_faculty.code ILIKE '%CSE%' 
  AND dept_subject.code ILIKE '%CSE%'
GROUP BY u.id, u.first_name, u.last_name, u.email
ORDER BY total_subjects_qualified DESC, u.last_name;

-- ================================================================
-- VIEW QUALIFICATIONS BY SUBJECT (CSE ONLY)
-- ================================================================

SELECT 
    s.semester,
    s.code as subject_code,
    s.name as subject_name,
    s.subject_type,
    COUNT(*) as qualified_faculty_count,
    STRING_AGG(
        u.first_name || ' ' || u.last_name || 
        ' (Prof: ' || fqs.proficiency_level || '/10)', 
        ', ' 
        ORDER BY fqs.proficiency_level DESC, u.last_name
    ) as qualified_faculty
FROM faculty_qualified_subjects fqs
JOIN users u ON u.id = fqs.faculty_id
JOIN subjects s ON s.id = fqs.subject_id
JOIN departments dept_faculty ON dept_faculty.id = u.department_id
JOIN departments dept_subject ON dept_subject.id = s.department_id
WHERE dept_faculty.code ILIKE '%CSE%' 
  AND dept_subject.code ILIKE '%CSE%'
GROUP BY s.id, s.semester, s.code, s.name, s.subject_type
ORDER BY s.semester, s.code;

-- ================================================================
-- RECENTLY ADDED QUALIFICATIONS (LAST 10)
-- ================================================================

SELECT 
    fqs.created_at,
    u.first_name || ' ' || u.last_name as faculty_name,
    s.code as subject_code,
    s.name as subject_name,
    s.semester,
    fqs.proficiency_level,
    fqs.is_primary_teacher
FROM faculty_qualified_subjects fqs
JOIN users u ON u.id = fqs.faculty_id
JOIN subjects s ON s.id = fqs.subject_id
JOIN departments dept_faculty ON dept_faculty.id = u.department_id
JOIN departments dept_subject ON dept_subject.id = s.department_id
WHERE dept_faculty.code ILIKE '%CSE%' 
  AND dept_subject.code ILIKE '%CSE%'
ORDER BY fqs.created_at DESC
LIMIT 10;

-- ================================================================
-- CHECK IF SPECIFIC FACULTY HAS QUALIFICATIONS
-- ================================================================
-- Replace the email with the faculty member you want to check

SELECT 
    u.first_name || ' ' || u.last_name as faculty_name,
    u.email,
    dept.name as department,
    COUNT(fqs.id) as total_qualifications,
    STRING_AGG(s.code || ' - ' || s.name, ', ' ORDER BY s.semester) as qualified_for
FROM users u
LEFT JOIN faculty_qualified_subjects fqs ON fqs.faculty_id = u.id
LEFT JOIN subjects s ON s.id = fqs.subject_id
JOIN departments dept ON dept.id = u.department_id
WHERE u.email ILIKE '%@svpcet.edu.in%'  -- Change this email
  AND u.role = 'faculty'
  AND dept.code ILIKE '%CSE%'
GROUP BY u.id, u.first_name, u.last_name, u.email, dept.name
ORDER BY u.last_name;

-- ================================================================
-- SUMMARY STATISTICS FOR CSE DEPARTMENT
-- ================================================================

SELECT 
    'Total Qualifications' as metric,
    COUNT(*)::text as value
FROM faculty_qualified_subjects fqs
JOIN users u ON u.id = fqs.faculty_id
JOIN subjects s ON s.id = fqs.subject_id
JOIN departments dept_faculty ON dept_faculty.id = u.department_id
JOIN departments dept_subject ON dept_subject.id = s.department_id
WHERE dept_faculty.code ILIKE '%CSE%' 
  AND dept_subject.code ILIKE '%CSE%'

UNION ALL

SELECT 
    'Total Faculty with Qualifications' as metric,
    COUNT(DISTINCT fqs.faculty_id)::text as value
FROM faculty_qualified_subjects fqs
JOIN users u ON u.id = fqs.faculty_id
JOIN departments dept ON dept.id = u.department_id
WHERE dept.code ILIKE '%CSE%'

UNION ALL

SELECT 
    'Total Subjects Covered' as metric,
    COUNT(DISTINCT fqs.subject_id)::text as value
FROM faculty_qualified_subjects fqs
JOIN subjects s ON s.id = fqs.subject_id
JOIN departments dept ON dept.id = s.department_id
WHERE dept.code ILIKE '%CSE%'

UNION ALL

SELECT 
    'Primary Teacher Assignments' as metric,
    COUNT(*)::text as value
FROM faculty_qualified_subjects fqs
JOIN users u ON u.id = fqs.faculty_id
JOIN subjects s ON s.id = fqs.subject_id
JOIN departments dept_faculty ON dept_faculty.id = u.department_id
JOIN departments dept_subject ON dept_subject.id = s.department_id
WHERE dept_faculty.code ILIKE '%CSE%' 
  AND dept_subject.code ILIKE '%CSE%'
  AND fqs.is_primary_teacher = true;
