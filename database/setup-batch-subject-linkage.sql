-- ============================================================================
-- SETUP BATCHES AND BATCH-SUBJECT LINKAGE FOR MANUAL SCHEDULING
-- This script creates batches for each semester and links subjects properly
-- ============================================================================

-- Ensure we have the basic setup first
DO $$
DECLARE
    cse_dept_id UUID;
    college_id_val UUID;
    bramhe_id UUID;
BEGIN
    -- Get required IDs
    SELECT id INTO cse_dept_id FROM departments WHERE code = 'CSE' LIMIT 1;
    SELECT college_id INTO college_id_val FROM departments WHERE code = 'CSE' LIMIT 1;
    SELECT id INTO bramhe_id FROM users WHERE email = 'bramhe@svpce.edu.in' LIMIT 1;
    
    IF cse_dept_id IS NULL THEN
        RAISE EXCEPTION 'CSE department not found!';
    END IF;
    
    IF college_id_val IS NULL THEN
        RAISE EXCEPTION 'College not found!';
    END IF;

    -- Create batches for each semester (2025-26 academic year)
    INSERT INTO batches (name, college_id, department_id, semester, academic_year, expected_strength, section, class_coordinator) VALUES
    ('CSE Semester 1 A', college_id_val, cse_dept_id, 1, '2025-26', 60, 'A', bramhe_id),
    ('CSE Semester 2 A', college_id_val, cse_dept_id, 2, '2025-26', 60, 'A', bramhe_id),
    ('CSE Semester 3 A', college_id_val, cse_dept_id, 3, '2025-26', 60, 'A', bramhe_id),
    ('CSE Semester 4 A', college_id_val, cse_dept_id, 4, '2025-26', 60, 'A', bramhe_id),
    ('CSE Semester 5 A', college_id_val, cse_dept_id, 5, '2025-26', 60, 'A', bramhe_id),
    ('CSE Semester 6 A', college_id_val, cse_dept_id, 6, '2025-26', 60, 'A', bramhe_id),
    ('CSE Semester 7 A', college_id_val, cse_dept_id, 7, '2025-26', 60, 'A', bramhe_id),
    ('CSE Semester 8 A', college_id_val, cse_dept_id, 8, '2025-26', 60, 'A', bramhe_id)
    ON CONFLICT (college_id, department_id, semester, academic_year, name, section) 
    DO UPDATE SET class_coordinator = EXCLUDED.class_coordinator;

    RAISE NOTICE 'Created batches for semesters 1-8';

    -- Link subjects to their respective batches through batch_subjects
    -- This creates the proper semester-subject relationship through batches
    
    -- For each semester, link appropriate subjects
    FOR sem IN 1..8 LOOP
        INSERT INTO batch_subjects (batch_id, subject_id, required_hours_per_week, assigned_faculty_id)
        SELECT 
            b.id as batch_id,
            s.id as subject_id,
            s.credits_per_week as required_hours_per_week,
            bramhe_id as assigned_faculty_id
        FROM batches b
        JOIN subjects s ON s.semester = b.semester AND s.department_id = b.department_id
        WHERE b.semester = sem 
          AND b.department_id = cse_dept_id
          AND b.academic_year = '2025-26'
          AND s.is_active = TRUE
        ON CONFLICT (batch_id, subject_id) DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Linked subjects to batches for all semesters';

END $$;

-- Create an updated view that properly shows semester-wise data for manual scheduling
CREATE OR REPLACE VIEW manual_scheduling_semester_data AS
SELECT 
    s.semester,
    s.id as subject_id,
    s.name as subject_name,
    s.code as subject_code,
    s.subject_type,
    s.credits_per_week,
    s.requires_lab,
    bs.required_hours_per_week,
    bs.assigned_faculty_id,
    b.id as batch_id,
    b.name as batch_name,
    u.first_name || ' ' || u.last_name as assigned_faculty_name,
    u.email as faculty_email
FROM subjects s
JOIN batch_subjects bs ON s.id = bs.subject_id
JOIN batches b ON bs.batch_id = b.id
LEFT JOIN users u ON bs.assigned_faculty_id = u.id
WHERE s.is_active = TRUE 
  AND b.is_active = TRUE
  AND b.academic_year = '2025-26'
ORDER BY s.semester, s.name;

-- Create improved API view for the manual scheduling component
CREATE OR REPLACE VIEW api_manual_scheduling_subjects AS
SELECT 
    s.id,
    s.name,
    s.code,
    s.semester,
    s.subject_type,
    s.credits_per_week as credits,
    s.requires_lab,
    s.department_id,
    COUNT(bs.id) as batch_count
FROM subjects s
LEFT JOIN batch_subjects bs ON s.id = bs.subject_id
LEFT JOIN batches b ON bs.batch_id = b.id AND b.academic_year = '2025-26'
WHERE s.is_active = TRUE 
  AND s.semester IS NOT NULL
GROUP BY s.id, s.name, s.code, s.semester, s.subject_type, s.credits_per_week, s.requires_lab, s.department_id
ORDER BY s.semester, s.name;

-- Create improved API view for faculty with semester-specific qualifications
CREATE OR REPLACE VIEW api_manual_scheduling_faculty AS
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.department_id,
    JSON_AGG(
        DISTINCT JSON_BUILD_OBJECT(
            'id', s.id,
            'name', s.name,
            'code', s.code,
            'semester', s.semester,
            'proficiency_level', fqs.proficiency_level
        )
    ) FILTER (WHERE s.id IS NOT NULL) as qualified_subjects,
    ARRAY_AGG(DISTINCT s.semester) FILTER (WHERE s.semester IS NOT NULL) as qualified_semesters
FROM users u
LEFT JOIN faculty_qualified_subjects fqs ON u.id = fqs.faculty_id
LEFT JOIN subjects s ON fqs.subject_id = s.id AND s.is_active = TRUE
WHERE u.role = 'faculty' 
  AND u.is_active = TRUE
GROUP BY u.id, u.first_name, u.last_name, u.email, u.department_id
ORDER BY u.first_name, u.last_name;

-- Verification and summary
SELECT 
    'Setup Summary' as info,
    (SELECT COUNT(*) FROM batches WHERE academic_year = '2025-26') as batches_created,
    (SELECT COUNT(*) FROM batch_subjects) as subject_batch_links,
    (SELECT COUNT(*) FROM subjects WHERE semester IS NOT NULL) as subjects_with_semester,
    (SELECT COUNT(*) FROM faculty_qualified_subjects) as faculty_qualifications;

SELECT 
    'Semester Distribution' as category,
    semester,
    COUNT(*) as subjects_count
FROM subjects 
WHERE is_active = TRUE AND semester IS NOT NULL
GROUP BY semester 
ORDER BY semester;

SELECT 
    'Batch-Subject Links by Semester' as category,
    b.semester,
    COUNT(bs.id) as linked_subjects
FROM batch_subjects bs
JOIN batches b ON bs.batch_id = b.id
WHERE b.academic_year = '2025-26'
GROUP BY b.semester 
ORDER BY b.semester;

RAISE NOTICE '✅ Semester-subject-batch linkage setup completed!';
RAISE NOTICE 'Manual scheduling should now work with proper semester filtering.';