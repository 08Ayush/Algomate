-- ============================================================================
-- COMPLETE MANUAL SCHEDULING FIX - EXECUTE ALL STEPS
-- Run this script in Supabase SQL Editor to fix semester-subject-faculty linkage
-- ============================================================================

-- Step 1: Add semester field to subjects and update existing subjects
-- ============================================================================
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS semester INT CHECK (semester BETWEEN 1 AND 8);

-- Step 2: Update existing subjects with semester information
-- ============================================================================
UPDATE subjects SET semester = 1 WHERE code IN ('MATH-1', 'PHY-1', 'CHEM', 'BE', 'EG', 'WP');
UPDATE subjects SET semester = 2 WHERE code IN ('MATH-2', 'PHY-2', 'PROG-C', 'PROG-C-LAB', 'DE', 'ES');
UPDATE subjects SET semester = 3 WHERE code IN ('MATH-3', 'DS', 'DS lab', 'DLD', 'OOP', 'OOP-LAB', 'DM');
UPDATE subjects SET semester = 4 WHERE code IN ('DBMS', 'DBMS-LAB', 'CN', 'WT', 'WT-LAB');
UPDATE subjects SET semester = 5 WHERE code IN ('CAO', 'OS', 'OS lab', 'SEPM', 'SEPM lab', 'Capstone lab');
UPDATE subjects SET semester = 6 WHERE code IN ('TOC', 'TOC lab', 'CC', 'CC lab', 'DCFM', 'DCFM lab');
UPDATE subjects SET semester = 7 WHERE code IN ('CNS', 'CNS lab', 'DL', 'MDM-1', 'OE-3', 'Project-1');
UPDATE subjects SET semester = 8 WHERE code IN ('MDM-3', 'Project-2', 'Micro Project');

-- Step 3: Insert missing subjects for complete curriculum
-- ============================================================================
DO $$
DECLARE
    cse_dept_id UUID;
    college_id_val UUID;
BEGIN
    SELECT id, college_id INTO cse_dept_id, college_id_val 
    FROM departments WHERE code = 'CSE' LIMIT 1;
    
    IF cse_dept_id IS NULL THEN
        RAISE EXCEPTION 'CSE department not found!';
    END IF;

    -- Insert subjects for semesters 1-4 (foundation subjects)
    INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester) VALUES
    ('Mathematics-I', 'MATH-1', college_id_val, cse_dept_id, 4, 'THEORY', 1),
    ('Physics-I', 'PHY-1', college_id_val, cse_dept_id, 3, 'THEORY', 1),
    ('Chemistry', 'CHEM', college_id_val, cse_dept_id, 3, 'THEORY', 1),
    ('Basic Electronics', 'BE', college_id_val, cse_dept_id, 3, 'THEORY', 1),
    ('Engineering Graphics', 'EG', college_id_val, cse_dept_id, 2, 'PRACTICAL', 1),
    ('Mathematics-II', 'MATH-2', college_id_val, cse_dept_id, 4, 'THEORY', 2),
    ('Programming in C', 'PROG-C', college_id_val, cse_dept_id, 3, 'THEORY', 2),
    ('Programming in C Lab', 'PROG-C-LAB', college_id_val, cse_dept_id, 1, 'LAB', 2),
    ('Digital Electronics', 'DE', college_id_val, cse_dept_id, 3, 'THEORY', 2),
    ('Mathematics-III', 'MATH-3', college_id_val, cse_dept_id, 4, 'THEORY', 3),
    ('Object Oriented Programming', 'OOP', college_id_val, cse_dept_id, 3, 'THEORY', 3),
    ('OOP Lab', 'OOP-LAB', college_id_val, cse_dept_id, 1, 'LAB', 3),
    ('Digital Logic Design', 'DLD', college_id_val, cse_dept_id, 3, 'THEORY', 3),
    ('Database Management Systems', 'DBMS', college_id_val, cse_dept_id, 3, 'THEORY', 4),
    ('DBMS Lab', 'DBMS-LAB', college_id_val, cse_dept_id, 1, 'LAB', 4),
    ('Computer Networks', 'CN', college_id_val, cse_dept_id, 3, 'THEORY', 4),
    ('Web Technologies', 'WT', college_id_val, cse_dept_id, 3, 'THEORY', 4),
    ('Web Technologies Lab', 'WT-LAB', college_id_val, cse_dept_id, 1, 'LAB', 4)
    ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = EXCLUDED.semester;

END $$;

-- Step 4: Create faculty qualifications for testing
-- ============================================================================
DO $$
DECLARE
    bramhe_id UUID;
    subject_rec RECORD;
BEGIN
    SELECT id INTO bramhe_id FROM users WHERE email = 'bramhe@svpce.edu.in' LIMIT 1;
    
    IF bramhe_id IS NOT NULL THEN
        -- Qualify bramhe for all CSE subjects
        FOR subject_rec IN 
            SELECT id FROM subjects 
            WHERE department_id = (SELECT id FROM departments WHERE code = 'CSE')
            AND is_active = TRUE
        LOOP
            INSERT INTO faculty_qualified_subjects (faculty_id, subject_id, proficiency_level, preference_score)
            VALUES (bramhe_id, subject_rec.id, 8, 7)
            ON CONFLICT (faculty_id, subject_id) DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- Step 5: Update database indexes for better performance
-- ============================================================================
DROP INDEX IF EXISTS idx_subjects_college_department;
CREATE INDEX idx_subjects_semester_lookup ON subjects(department_id, semester, is_active) WHERE is_active = true;

-- Step 6: Verification queries
-- ============================================================================
SELECT 
    'VERIFICATION: Subjects by Semester' as check_name,
    semester,
    COUNT(*) as subject_count,
    STRING_AGG(code, ', ' ORDER BY code) as sample_codes
FROM subjects 
WHERE is_active = true AND semester IS NOT NULL
GROUP BY semester 
ORDER BY semester;

SELECT 
    'VERIFICATION: Faculty Qualifications' as check_name,
    u.first_name || ' ' || u.last_name as faculty_name,
    COUNT(fqs.subject_id) as qualified_subjects_count
FROM users u
LEFT JOIN faculty_qualified_subjects fqs ON u.id = fqs.faculty_id
WHERE u.role = 'faculty' AND u.is_active = true
GROUP BY u.id, u.first_name, u.last_name
HAVING COUNT(fqs.subject_id) > 0
ORDER BY qualified_subjects_count DESC;

-- Final success message
DO $$
DECLARE
    subject_count INT;
    faculty_count INT;
    qualification_count INT;
BEGIN
    SELECT COUNT(*) INTO subject_count FROM subjects WHERE semester IS NOT NULL AND is_active = true;
    SELECT COUNT(*) INTO faculty_count FROM users WHERE role = 'faculty' AND is_active = true;
    SELECT COUNT(*) INTO qualification_count FROM faculty_qualified_subjects;
    
    RAISE NOTICE '✅ MANUAL SCHEDULING FIX COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   - Subjects with semester info: %', subject_count;
    RAISE NOTICE '   - Active faculty: %', faculty_count;
    RAISE NOTICE '   - Faculty-subject qualifications: %', qualification_count;
    RAISE NOTICE '🎯 Manual scheduling should now work with semester filtering!';
    RAISE NOTICE '🔗 Subjects and faculty are properly linked with semester information.';
END $$;