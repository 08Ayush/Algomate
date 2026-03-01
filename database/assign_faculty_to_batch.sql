-- ============================================================================
-- ASSIGN FACULTY TO BATCH SUBJECTS
-- For batch: 15b7a264-e228-4ef0-8234-26235c4416d8
-- ============================================================================

-- First, list all faculty available for this college/department
SELECT 
    u.id,
    u.first_name || ' ' || u.last_name AS full_name,
    u.department_id,
    u.designation,
    u.max_hours_per_week,
    d.name AS department
FROM users u
LEFT JOIN departments d ON u.department_id = d.department_id
WHERE u.college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  AND u.role = 'faculty'
  AND u.is_active = TRUE
ORDER BY u.department_id, u.first_name;

-- Then, list all subjects in the batch that need faculty
SELECT 
    bs.id AS batch_subject_id,
    bs.subject_id,
    s.name AS subject_name,
    s.code AS subject_code,
    s.subject_type,
    s.department_id,
    bs.required_hours_per_week,
    bs.assigned_faculty_id,
    CASE 
        WHEN bs.assigned_faculty_id IS NULL THEN '❌ NO FACULTY'
        ELSE '✅ ASSIGNED'
    END AS status
FROM batch_subjects bs
JOIN subjects s ON bs.subject_id = s.id
WHERE bs.batch_id = '15b7a264-e228-4ef0-8234-26235c4416d8'
ORDER BY s.subject_type, s.name;

-- ============================================================================
-- OPTION 1: Auto-assign faculty based on department matching
-- ============================================================================
-- This assigns the first available faculty from the same department

WITH faculty_pool AS (
    SELECT 
        u.id AS faculty_id,
        u.department_id,
        u.designation,
        ROW_NUMBER() OVER (PARTITION BY u.department_id ORDER BY u.max_hours_per_week DESC) AS rank
    FROM users u
    WHERE u.college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
      AND u.role = 'faculty'
      AND u.is_active = TRUE
)
UPDATE batch_subjects bs
SET 
    assigned_faculty_id = fp.faculty_id,
    updated_at = NOW()
FROM subjects s
LEFT JOIN faculty_pool fp ON s.department_id = fp.department_id AND fp.rank = 1
WHERE bs.subject_id = s.id
  AND bs.batch_id = '15b7a264-e228-4ef0-8234-26235c4416d8'
  AND bs.assigned_faculty_id IS NULL
  AND fp.faculty_id IS NOT NULL;

-- ============================================================================
-- OPTION 2: Manual assignment (more accurate)
-- ============================================================================
-- Replace with actual faculty IDs from your database

-- Example: Assign Dr. Smith to Data Modeling
/*
UPDATE batch_subjects
SET assigned_faculty_id = '<faculty-id-here>', updated_at = NOW()
WHERE batch_id = '15b7a264-e228-4ef0-8234-26235c4416d8'
  AND subject_id = (
    SELECT id FROM subjects 
    WHERE code = 'DM101' AND college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  );
*/

-- ============================================================================
-- VERIFY ASSIGNMENT
-- ============================================================================
SELECT 
    s.name AS subject_name,
    s.code,
    s.subject_type,
    COALESCE(u.first_name || ' ' || u.last_name, 'NOT ASSIGNED') AS faculty_name,
    u.designation,
    bs.required_hours_per_week
FROM batch_subjects bs
JOIN subjects s ON bs.subject_id = s.id
LEFT JOIN users u ON bs.assigned_faculty_id = u.id
WHERE bs.batch_id = '15b7a264-e228-4ef0-8234-26235c4416d8'
ORDER BY s.subject_type, s.name;

-- ============================================================================
-- ALTERNATIVE: Populate faculty_qualified_subjects table instead
-- ============================================================================
-- This creates qualifications for all faculty to teach all subjects
-- (Use cautiously - better to assign specific faculty to specific subjects)

INSERT INTO faculty_qualified_subjects (faculty_id, subject_id, proficiency_level, is_primary_teacher)
SELECT DISTINCT
    u.id AS faculty_id,
    s.id AS subject_id,
    7 AS proficiency_level,  -- Default proficiency
    TRUE AS is_primary_teacher
FROM users u
CROSS JOIN subjects s
JOIN batch_subjects bs ON s.id = bs.subject_id
WHERE u.college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  AND u.role = 'faculty'
  AND u.is_active = TRUE
  AND bs.batch_id = '15b7a264-e228-4ef0-8234-26235c4416d8'
  AND s.department_id = u.department_id  -- Match department
ON CONFLICT (faculty_id, subject_id) DO NOTHING;
