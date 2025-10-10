-- ============================================================================
-- FACULTY SUBJECT QUALIFICATIONS SETUP
-- Purpose: Properly assign faculty to subjects they can teach
-- This resolves the AI timetable generation conflicts
-- ============================================================================

-- Step 1: Clear existing qualifications (optional - be careful!)
-- TRUNCATE TABLE faculty_qualified_subjects CASCADE;

-- Step 2: View current subjects that need faculty assignment
SELECT 
    s.id,
    s.code,
    s.name,
    s.semester,
    s.subject_type,
    s.credits_per_week,
    s.requires_lab,
    d.name as department_name,
    d.code as department_code
FROM subjects s
JOIN departments d ON s.department_id = d.id
WHERE s.is_active = TRUE
ORDER BY s.semester, s.name;

-- Step 3: View available faculty members
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    d.name as department_name,
    d.code as department_code
FROM users u
JOIN departments d ON u.department_id = d.id
WHERE u.role = 'faculty' 
  AND u.is_active = TRUE
ORDER BY d.code, u.first_name;

-- Step 4: Check current qualifications
SELECT 
    fq.id,
    u.first_name || ' ' || u.last_name as faculty_name,
    s.code as subject_code,
    s.name as subject_name,
    s.semester,
    fq.proficiency_level,
    fq.is_primary_teacher,
    fq.can_handle_lab
FROM faculty_qualified_subjects fq
JOIN users u ON fq.faculty_id = u.id
JOIN subjects s ON fq.subject_id = s.id
ORDER BY s.semester, s.name, u.first_name;

-- ============================================================================
-- EXAMPLE: Assign Faculty to Subjects
-- Replace UUIDs with actual IDs from your database
-- ============================================================================

-- Template for adding qualifications:
/*
INSERT INTO faculty_qualified_subjects (
    faculty_id,
    subject_id,
    proficiency_level,
    preference_score,
    teaching_load_weight,
    is_primary_teacher,
    can_handle_lab,
    can_handle_tutorial
) VALUES
    ('faculty-uuid-1', 'subject-uuid-1', 8, 7, 1.0, TRUE, TRUE, TRUE),
    ('faculty-uuid-2', 'subject-uuid-2', 9, 8, 1.0, TRUE, FALSE, TRUE);
*/

-- ============================================================================
-- AUTOMATED ASSIGNMENT (Use with caution!)
-- This assigns each subject to the first available faculty in the same department
-- ============================================================================

-- DO $$
-- DECLARE
--     subject_rec RECORD;
--     faculty_rec RECORD;
-- BEGIN
--     -- Loop through each active subject
--     FOR subject_rec IN 
--         SELECT id, name, department_id, subject_type, requires_lab 
--         FROM subjects 
--         WHERE is_active = TRUE
--     LOOP
--         -- Find first available faculty in same department
--         SELECT id INTO faculty_rec
--         FROM users
--         WHERE role = 'faculty' 
--           AND department_id = subject_rec.department_id
--           AND is_active = TRUE
--         LIMIT 1;
        
--         IF FOUND THEN
--             -- Insert qualification if not exists
--             INSERT INTO faculty_qualified_subjects (
--                 faculty_id,
--                 subject_id,
--                 proficiency_level,
--                 preference_score,
--                 can_handle_lab,
--                 is_primary_teacher
--             ) VALUES (
--                 faculty_rec.id,
--                 subject_rec.id,
--                 7, -- Default proficiency
--                 5, -- Default preference
--                 subject_rec.subject_type = 'LAB' OR subject_rec.requires_lab,
--                 TRUE
--             )
--             ON CONFLICT (faculty_id, subject_id) DO NOTHING;
            
--             RAISE NOTICE 'Assigned subject % to faculty %', subject_rec.name, faculty_rec.id;
--         ELSE
--             RAISE NOTICE 'No faculty found for subject %', subject_rec.name;
--         END IF;
--     END LOOP;
-- END $$;

-- ============================================================================
-- BETTER APPROACH: Round-robin assignment to distribute load
-- ============================================================================

DO $$
DECLARE
    subject_rec RECORD;
    faculty_list UUID[];
    faculty_count INTEGER;
    faculty_index INTEGER := 0;
    dept_id UUID;
BEGIN
    -- Get unique departments
    FOR dept_id IN 
        SELECT DISTINCT department_id 
        FROM subjects 
        WHERE is_active = TRUE
    LOOP
        -- Get all faculty in this department
        SELECT ARRAY_AGG(id ORDER BY first_name) INTO faculty_list
        FROM users
        WHERE role = 'faculty' 
          AND department_id = dept_id
          AND is_active = TRUE;
        
        faculty_count := ARRAY_LENGTH(faculty_list, 1);
        
        IF faculty_count IS NULL OR faculty_count = 0 THEN
            RAISE NOTICE 'No faculty found for department %', dept_id;
            CONTINUE;
        END IF;
        
        RAISE NOTICE 'Department % has % faculty members', dept_id, faculty_count;
        
        faculty_index := 0;
        
        -- Assign subjects in this department
        FOR subject_rec IN 
            SELECT * FROM subjects 
            WHERE department_id = dept_id 
              AND is_active = TRUE
            ORDER BY semester, name
        LOOP
            -- Assign to next faculty (round-robin)
            faculty_index := (faculty_index % faculty_count) + 1;
            
            INSERT INTO faculty_qualified_subjects (
                faculty_id,
                subject_id,
                proficiency_level,
                preference_score,
                teaching_load_weight,
                can_handle_lab,
                can_handle_tutorial,
                is_primary_teacher
            ) VALUES (
                faculty_list[faculty_index],
                subject_rec.id,
                7, -- Default proficiency
                6, -- Default preference
                1.0, -- Default weight
                subject_rec.subject_type = 'LAB' OR subject_rec.requires_lab,
                TRUE,
                TRUE -- Make them primary teacher
            )
            ON CONFLICT (faculty_id, subject_id) DO UPDATE SET
                is_primary_teacher = TRUE,
                proficiency_level = 7;
            
            RAISE NOTICE 'Assigned % (Sem %) to faculty % (%/%)', 
                subject_rec.name, 
                subject_rec.semester,
                faculty_list[faculty_index],
                faculty_index,
                faculty_count;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Faculty assignment complete!';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Count qualifications per semester
SELECT 
    s.semester,
    COUNT(*) as total_subject_faculty_mappings,
    COUNT(DISTINCT s.id) as subjects_covered,
    COUNT(DISTINCT fq.faculty_id) as faculty_involved
FROM faculty_qualified_subjects fq
JOIN subjects s ON fq.subject_id = s.id
WHERE s.is_active = TRUE
GROUP BY s.semester
ORDER BY s.semester;

-- 2. Find subjects without any qualified faculty (THESE CAUSE CONFLICTS!)
SELECT 
    s.semester,
    s.code,
    s.name,
    s.subject_type,
    d.name as department
FROM subjects s
JOIN departments d ON s.department_id = d.id
LEFT JOIN faculty_qualified_subjects fq ON s.id = fq.subject_id
WHERE s.is_active = TRUE
  AND fq.id IS NULL
ORDER BY s.semester, s.name;

-- 3. Faculty workload distribution
SELECT 
    u.first_name || ' ' || u.last_name as faculty_name,
    u.email,
    COUNT(*) as subjects_qualified,
    COUNT(*) FILTER (WHERE fq.is_primary_teacher) as primary_subjects,
    STRING_AGG(DISTINCT s.semester::TEXT, ', ' ORDER BY s.semester::TEXT) as semesters
FROM users u
LEFT JOIN faculty_qualified_subjects fq ON u.id = fq.faculty_id
LEFT JOIN subjects s ON fq.subject_id = s.id AND s.is_active = TRUE
WHERE u.role = 'faculty' AND u.is_active = TRUE
GROUP BY u.id, u.first_name, u.last_name, u.email
ORDER BY subjects_qualified DESC;

-- 4. Detailed qualification report
SELECT 
    d.code as dept,
    s.semester as sem,
    s.code as subject_code,
    s.name as subject_name,
    s.subject_type as type,
    COUNT(fq.id) as faculty_count,
    STRING_AGG(
        u.first_name || ' ' || u.last_name || 
        CASE WHEN fq.is_primary_teacher THEN ' (P)' ELSE '' END,
        ', '
    ) as qualified_faculty
FROM subjects s
JOIN departments d ON s.department_id = d.id
LEFT JOIN faculty_qualified_subjects fq ON s.id = fq.subject_id
LEFT JOIN users u ON fq.faculty_id = u.id
WHERE s.is_active = TRUE
GROUP BY d.code, s.semester, s.code, s.name, s.subject_type, s.id
ORDER BY d.code, s.semester, s.code;

-- ============================================================================
-- CLEANUP: Remove duplicate qualifications (if any)
-- ============================================================================

-- DELETE FROM faculty_qualified_subjects
-- WHERE id IN (
--     SELECT id
--     FROM (
--         SELECT id,
--                ROW_NUMBER() OVER (PARTITION BY faculty_id, subject_id ORDER BY created_at DESC) as rn
--         FROM faculty_qualified_subjects
--     ) t
--     WHERE rn > 1
-- );

RAISE NOTICE '✅ Faculty qualification setup complete!';
RAISE NOTICE '📊 Run the verification queries above to check the assignments.';
RAISE NOTICE '🎯 If you see subjects without faculty, use the UI at /faculty/qualifications to assign them.';
