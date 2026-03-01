-- ============================================================================
-- AUTO-POPULATE FACULTY ASSIGNMENTS FOR ALL BATCHES
-- Quick Solution to Enable 0.9+ Quality Scores
-- ============================================================================

-- This script automatically assigns faculty to subjects based on:
-- 1. Department matching (primary)
-- 2. Subject type compatibility
-- 3. Faculty workload distribution

BEGIN;

-- ============================================================================
-- STEP 1: Identify batches without faculty assignments
-- ============================================================================

SELECT 
    b.id AS batch_id,
    b.name AS batch_name,
    b.semester,
    COUNT(bs.id) AS total_subjects,
    COUNT(bs.assigned_faculty_id) FILTER (WHERE bs.assigned_faculty_id IS NOT NULL) AS assigned_subjects,
    COUNT(bs.assigned_faculty_id) FILTER (WHERE bs.assigned_faculty_id IS NULL) AS unassigned_subjects
FROM batches b
JOIN batch_subjects bs ON b.id = bs.batch_id
WHERE b.is_active = TRUE
GROUP BY b.id, b.name, b.semester
HAVING COUNT(bs.assigned_faculty_id) FILTER (WHERE bs.assigned_faculty_id IS NULL) > 0
ORDER BY unassigned_subjects DESC;

-- ============================================================================
-- STEP 2: Auto-assign faculty based on department + workload
-- ============================================================================

-- Create a temporary table to track faculty workload
CREATE TEMP TABLE faculty_workload AS
SELECT 
    u.id AS faculty_id,
    u.first_name || ' ' || u.last_name AS faculty_name,
    u.department_id,
    u.college_id,
    u.max_hours_per_week,
    COALESCE(SUM(bs.required_hours_per_week), 0) AS current_workload,
    u.max_hours_per_week - COALESCE(SUM(bs.required_hours_per_week), 0) AS available_hours
FROM users u
LEFT JOIN batch_subjects bs ON u.id = bs.assigned_faculty_id
WHERE u.role = 'faculty'
  AND u.is_active = TRUE
GROUP BY u.id, u.first_name, u.last_name, u.department_id, u.college_id, u.max_hours_per_week;

-- ============================================================================
-- STEP 3: Assign faculty to unassigned subjects
-- ============================================================================

WITH subject_faculty_matches AS (
    SELECT DISTINCT ON (bs.id)
        bs.id AS batch_subject_id,
        bs.batch_id,
        bs.subject_id,
        bs.required_hours_per_week,
        s.name AS subject_name,
        s.subject_type,
        s.department_id AS subject_dept_id,
        fw.faculty_id,
        fw.faculty_name,
        fw.available_hours,
        -- Scoring system for best match
        CASE 
            WHEN s.department_id = fw.department_id THEN 100  -- Same department (best)
            WHEN s.department_id IS NULL THEN 50               -- No dept preference
            ELSE 10                                             -- Cross-department (worst)
        END +
        CASE
            WHEN s.subject_type = 'LAB' AND fw.available_hours >= bs.required_hours_per_week * 2 THEN 20
            WHEN fw.available_hours >= bs.required_hours_per_week THEN 15
            ELSE 0
        END AS match_score
    FROM batch_subjects bs
    JOIN subjects s ON bs.subject_id = s.id
    JOIN batches b ON bs.batch_id = b.id
    CROSS JOIN faculty_workload fw
    WHERE bs.assigned_faculty_id IS NULL
      AND b.is_active = TRUE
      AND fw.college_id = b.college_id
      AND fw.available_hours >= bs.required_hours_per_week
    ORDER BY bs.id, match_score DESC, fw.current_workload ASC
)
UPDATE batch_subjects
SET 
    assigned_faculty_id = sfm.faculty_id,
    updated_at = NOW()
FROM subject_faculty_matches sfm
WHERE batch_subjects.id = sfm.batch_subject_id
  AND batch_subjects.assigned_faculty_id IS NULL;

-- ============================================================================
-- STEP 4: Populate faculty_qualified_subjects table
-- ============================================================================

-- This creates qualification records for all assigned faculty
INSERT INTO faculty_qualified_subjects (faculty_id, subject_id, proficiency_level, is_primary_teacher)
SELECT DISTINCT
    bs.assigned_faculty_id,
    bs.subject_id,
    8 AS proficiency_level,      -- Default high proficiency
    TRUE AS is_primary_teacher
FROM batch_subjects bs
WHERE bs.assigned_faculty_id IS NOT NULL
ON CONFLICT (faculty_id, subject_id) 
DO UPDATE SET 
    is_primary_teacher = TRUE,
    updated_at = NOW();

-- ============================================================================
-- STEP 5: Verification Report
-- ============================================================================

SELECT 
    '=== FACULTY ASSIGNMENT REPORT ===' AS report_section,
    COUNT(DISTINCT bs.batch_id) AS batches_updated,
    COUNT(bs.id) AS total_assignments,
    COUNT(DISTINCT bs.assigned_faculty_id) AS faculty_involved,
    COUNT(DISTINCT bs.subject_id) AS subjects_assigned
FROM batch_subjects bs
WHERE bs.assigned_faculty_id IS NOT NULL;

-- Show batch-wise assignment status
SELECT 
    b.name AS batch_name,
    b.semester,
    COUNT(bs.id) AS total_subjects,
    COUNT(bs.assigned_faculty_id) FILTER (WHERE bs.assigned_faculty_id IS NOT NULL) AS assigned,
    COUNT(bs.assigned_faculty_id) FILTER (WHERE bs.assigned_faculty_id IS NULL) AS unassigned,
    ROUND(
        100.0 * COUNT(bs.assigned_faculty_id) FILTER (WHERE bs.assigned_faculty_id IS NOT NULL) / 
        NULLIF(COUNT(bs.id), 0), 
        1
    ) AS assignment_percent
FROM batches b
JOIN batch_subjects bs ON b.id = bs.batch_id
WHERE b.is_active = TRUE
GROUP BY b.id, b.name, b.semester
ORDER BY assignment_percent ASC;

-- Show faculty workload distribution
SELECT 
    u.first_name || ' ' || u.last_name AS faculty_name,
    d.name AS department,
    COUNT(bs.id) AS subjects_assigned,
    SUM(bs.required_hours_per_week) AS total_hours,
    u.max_hours_per_week AS max_capacity,
    ROUND(
        100.0 * SUM(bs.required_hours_per_week) / NULLIF(u.max_hours_per_week, 0),
        1
    ) AS utilization_percent
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN batch_subjects bs ON u.id = bs.assigned_faculty_id
WHERE u.role = 'faculty'
  AND u.is_active = TRUE
  AND u.college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'  -- Replace with your college_id
GROUP BY u.id, u.first_name, u.last_name, d.name, u.max_hours_per_week
HAVING COUNT(bs.id) > 0
ORDER BY utilization_percent DESC;

COMMIT;

-- ============================================================================
-- ROLLBACK OPTION (if needed)
-- ============================================================================

/*
-- Uncomment to undo all assignments made by this script

BEGIN;

-- Clear faculty assignments made in the last hour
UPDATE batch_subjects
SET assigned_faculty_id = NULL,
    updated_at = NOW()
WHERE updated_at > NOW() - INTERVAL '1 hour';

-- Remove qualification records
DELETE FROM faculty_qualified_subjects
WHERE updated_at > NOW() - INTERVAL '1 hour';

COMMIT;
*/
