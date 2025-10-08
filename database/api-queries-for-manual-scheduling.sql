-- ============================================================================
-- API ENDPOINTS FIX FOR MANUAL SCHEDULING COMPONENT
-- Updated queries that match the component's expectations
-- ============================================================================

-- This file contains the correct SQL queries that should be used in the API endpoints
-- for the manual scheduling component to work properly with semester filtering

-- 1. QUERY FOR LOADING SUBJECTS (by department and with semester info)
-- Use this in: /api/subjects/route.ts or similar
/*
SELECT 
    s.id,
    s.name,
    s.code,
    s.semester,
    s.subject_type,
    s.credits_per_week as credits,
    s.requires_lab
FROM subjects s
WHERE s.department_id = $1 
  AND s.is_active = true 
  AND s.semester IS NOT NULL
ORDER BY s.semester, s.name;
*/

-- 2. QUERY FOR LOADING FACULTY (by department with qualified subjects)
-- Use this in: /api/faculty/route.ts or similar
/*
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
  AND u.department_id = $1
GROUP BY u.id, u.first_name, u.last_name, u.email, u.department_id
ORDER BY u.first_name, u.last_name;
*/

-- 3. QUERY FOR GETTING FACULTY QUALIFICATIONS 
-- Use this in: /api/faculty/qualifications/route.ts or similar
/*
SELECT 
    fqs.faculty_id,
    fqs.subject_id,
    s.name as subject_name,
    s.code as subject_code,
    s.semester,
    fqs.proficiency_level,
    fqs.preference_score
FROM faculty_qualified_subjects fqs
JOIN subjects s ON fqs.subject_id = s.id
WHERE fqs.faculty_id = ANY($1::uuid[])
  AND s.is_active = true
ORDER BY s.semester, s.name;
*/

-- 4. TEST QUERIES TO VERIFY DATA
-- Run these to check if data is properly set up:

-- Check subjects by semester
SELECT 
    'Subjects by Semester' as check_type,
    semester,
    COUNT(*) as count
FROM subjects 
WHERE is_active = true AND semester IS NOT NULL
GROUP BY semester 
ORDER BY semester;

-- Check faculty with qualifications
SELECT 
    'Faculty Qualifications' as check_type,
    u.first_name || ' ' || u.last_name as faculty_name,
    COUNT(fqs.subject_id) as qualified_subjects_count
FROM users u
LEFT JOIN faculty_qualified_subjects fqs ON u.id = fqs.faculty_id
WHERE u.role = 'faculty' AND u.is_active = true
GROUP BY u.id, u.first_name, u.last_name
ORDER BY qualified_subjects_count DESC;

-- Check specific faculty (bramhe) qualifications by semester
SELECT 
    'Bramhe Qualifications by Semester' as check_type,
    s.semester,
    COUNT(*) as subjects_count,
    STRING_AGG(s.code, ', ') as subject_codes
FROM users u
JOIN faculty_qualified_subjects fqs ON u.id = fqs.faculty_id
JOIN subjects s ON fqs.subject_id = s.id
WHERE u.email = 'bramhe@svpce.edu.in'
  AND s.is_active = true
GROUP BY s.semester
ORDER BY s.semester;

-- 5. SAMPLE API RESPONSE FORMAT
-- This is what the manual scheduling component expects:

-- SUBJECTS RESPONSE FORMAT:
/*
[
  {
    "id": "uuid",
    "name": "Data Structures",
    "code": "DS",
    "semester": 3,
    "subjectType": "THEORY",
    "credits": 3,
    "requiresLab": false
  }
]
*/

-- FACULTY RESPONSE FORMAT:
/*
[
  {
    "id": "uuid",
    "firstName": "Bramhe",
    "lastName": "Gawande",
    "email": "bramhe@svpce.edu.in",
    "departmentId": "uuid",
    "qualifiedSubjects": [
      {
        "id": "uuid",
        "name": "Data Structures",
        "code": "DS", 
        "semester": 3
      }
    ]
  }
]
*/

RAISE NOTICE '📋 API query templates ready for manual scheduling component!';
RAISE NOTICE 'Use these queries in your API endpoints to fix the data loading issues.';