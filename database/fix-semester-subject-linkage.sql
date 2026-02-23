-- ============================================================================
-- FIX SEMESTER-SUBJECT LINKAGE FOR MANUAL SCHEDULING
-- This script adds semester field to subjects table and sets up proper linkage
-- ============================================================================

-- Add semester field to subjects table
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS semester INT CHECK (semester BETWEEN 1 AND 8);

-- Update existing CSE subjects with semester information
-- Based on standard CSE curriculum structure

UPDATE subjects SET semester = 1 WHERE code IN (
    'Mathematics-1', 'Physics-1', 'Chemistry', 'Basic Electronics', 
    'Engineering Graphics', 'Workshop Practice', 'Communication Skills'
);

UPDATE subjects SET semester = 2 WHERE code IN (
    'Mathematics-2', 'Physics-2', 'Biology', 'Advanced Electronics',
    'Computer Programming', 'Engineering Mechanics', 'Environmental Science'
);

UPDATE subjects SET semester = 3 WHERE code IN (
    'Mathematics-3', 'DS', 'DS lab', 'Digital Logic Design', 'Object Oriented Programming',
    'Computer Organization', 'Discrete Mathematics'
);

UPDATE subjects SET semester = 4 WHERE code IN (
    'Mathematics-4', 'Database Management Systems', 'DBMS Lab', 'Computer Networks',
    'Operating Systems', 'Software Engineering', 'Web Technologies'
);

UPDATE subjects SET semester = 5 WHERE code IN (
    'CAO', 'OS', 'OS lab', 'SEPM', 'SEPM lab', 'Capstone lab',
    'Computer Graphics', 'Artificial Intelligence'
);

UPDATE subjects SET semester = 6 WHERE code IN (
    'TOC', 'TOC lab', 'CC', 'CC lab', 'DCFM', 'DCFM lab',
    'Mobile Application Development', 'Machine Learning'
);

UPDATE subjects SET semester = 7 WHERE code IN (
    'CNS', 'CNS lab', 'DL', 'MDM-1', 'OE-3',
    'Project-1', 'Advanced Database Systems', 'Cloud Computing'
);

UPDATE subjects SET semester = 8 WHERE code IN (
    'MDM-3', 'Project-2', 'Micro Project', 'Industry Internship',
    'Advanced Software Engineering', 'Research Methodology'
);

-- Insert additional subjects for missing semesters if they don't exist
DO $$
DECLARE
    cse_dept_id UUID;
    college_id_val UUID;
BEGIN
    -- Get CSE department ID
    SELECT id INTO cse_dept_id FROM departments WHERE code = 'CSE' LIMIT 1;
    SELECT college_id INTO college_id_val FROM departments WHERE code = 'CSE' LIMIT 1;
    
    IF cse_dept_id IS NULL THEN
        RAISE EXCEPTION 'CSE department not found!';
    END IF;

    -- Semester 1 subjects
    INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester) VALUES
    ('Mathematics-I', 'MATH-1', college_id_val, cse_dept_id, 4, 'THEORY', 1),
    ('Physics-I', 'PHY-1', college_id_val, cse_dept_id, 3, 'THEORY', 1),
    ('Chemistry', 'CHEM', college_id_val, cse_dept_id, 3, 'THEORY', 1),
    ('Basic Electronics', 'BE', college_id_val, cse_dept_id, 3, 'THEORY', 1),
    ('Engineering Graphics', 'EG', college_id_val, cse_dept_id, 2, 'PRACTICAL', 1),
    ('Workshop Practice', 'WP', college_id_val, cse_dept_id, 2, 'PRACTICAL', 1)
    ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = EXCLUDED.semester;

    -- Semester 2 subjects
    INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester) VALUES
    ('Mathematics-II', 'MATH-2', college_id_val, cse_dept_id, 4, 'THEORY', 2),
    ('Physics-II', 'PHY-2', college_id_val, cse_dept_id, 3, 'THEORY', 2),
    ('Programming in C', 'PROG-C', college_id_val, cse_dept_id, 3, 'THEORY', 2),
    ('Programming in C Lab', 'PROG-C-LAB', college_id_val, cse_dept_id, 1, 'LAB', 2),
    ('Digital Electronics', 'DE', college_id_val, cse_dept_id, 3, 'THEORY', 2),
    ('Environmental Science', 'ES', college_id_val, cse_dept_id, 2, 'THEORY', 2)
    ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = EXCLUDED.semester;

    -- Semester 3 subjects  
    INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester) VALUES
    ('Mathematics-III', 'MATH-3', college_id_val, cse_dept_id, 4, 'THEORY', 3),
    ('Object Oriented Programming', 'OOP', college_id_val, cse_dept_id, 3, 'THEORY', 3),
    ('OOP Lab', 'OOP-LAB', college_id_val, cse_dept_id, 1, 'LAB', 3),
    ('Digital Logic Design', 'DLD', college_id_val, cse_dept_id, 3, 'THEORY', 3),
    ('Discrete Mathematics', 'DM', college_id_val, cse_dept_id, 3, 'THEORY', 3)
    ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = EXCLUDED.semester;

    -- Semester 4 subjects
    INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester) VALUES
    ('Database Management Systems', 'DBMS', college_id_val, cse_dept_id, 3, 'THEORY', 4),
    ('DBMS Lab', 'DBMS-LAB', college_id_val, cse_dept_id, 1, 'LAB', 4),
    ('Computer Networks', 'CN', college_id_val, cse_dept_id, 3, 'THEORY', 4),
    ('Web Technologies', 'WT', college_id_val, cse_dept_id, 3, 'THEORY', 4),
    ('Web Technologies Lab', 'WT-LAB', college_id_val, cse_dept_id, 1, 'LAB', 4)
    ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = EXCLUDED.semester;

END $$;

-- Update indexes to include semester field for better performance
DROP INDEX IF EXISTS idx_subjects_college_department;
CREATE INDEX idx_subjects_college_department_semester ON subjects(college_id, department_id, semester, is_active);

-- Create view for manual scheduling that properly links subjects with semesters
CREATE OR REPLACE VIEW manual_scheduling_subjects AS
SELECT 
    s.id,
    s.name,
    s.code,
    s.college_id,
    s.department_id,
    s.semester,
    s.credits_per_week as credits,
    s.subject_type,
    s.requires_lab,
    s.is_active,
    d.name as department_name,
    d.code as department_code
FROM subjects s
JOIN departments d ON s.department_id = d.id
WHERE s.is_active = TRUE 
  AND s.semester IS NOT NULL
ORDER BY s.semester, s.name;

-- Create view for faculty with their qualified subjects per semester
CREATE OR REPLACE VIEW manual_scheduling_faculty AS
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.department_id,
    d.name as department_name,
    d.code as department_code,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'subject_id', s.id,
                'subject_name', s.name,
                'subject_code', s.code,
                'semester', s.semester,
                'proficiency_level', fqs.proficiency_level,
                'preference_score', fqs.preference_score
            )
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'::json
    ) as qualified_subjects
FROM users u
JOIN departments d ON u.department_id = d.id
LEFT JOIN faculty_qualified_subjects fqs ON u.id = fqs.faculty_id
LEFT JOIN subjects s ON fqs.subject_id = s.id AND s.is_active = TRUE
WHERE u.role = 'faculty' 
  AND u.is_active = TRUE
GROUP BY u.id, d.id
ORDER BY u.first_name, u.last_name;

-- Insert sample faculty qualifications for testing
DO $$
DECLARE
    bramhe_id UUID;
    subject_rec RECORD;
BEGIN
    -- Find bramhe user
    SELECT id INTO bramhe_id FROM users WHERE email = 'bramhe@svpce.edu.in' LIMIT 1;
    
    IF bramhe_id IS NOT NULL THEN
        -- Qualify bramhe for all CSE subjects (for testing purposes)
        FOR subject_rec IN 
            SELECT id FROM subjects 
            WHERE department_id = (SELECT id FROM departments WHERE code = 'CSE')
            AND is_active = TRUE
        LOOP
            INSERT INTO faculty_qualified_subjects (faculty_id, subject_id, proficiency_level, preference_score)
            VALUES (bramhe_id, subject_rec.id, 8, 7)
            ON CONFLICT (faculty_id, subject_id) 
            DO UPDATE SET 
                proficiency_level = EXCLUDED.proficiency_level,
                preference_score = EXCLUDED.preference_score;
        END LOOP;
        
        RAISE NOTICE 'Added qualifications for bramhe user: %', bramhe_id;
    ELSE
        RAISE NOTICE 'bramhe user not found, skipping qualification setup';
    END IF;
END $$;

-- Verification queries
SELECT 
    'Subjects by semester' as info,
    semester,
    COUNT(*) as subject_count
FROM subjects 
WHERE is_active = TRUE AND semester IS NOT NULL
GROUP BY semester 
ORDER BY semester;

SELECT 
    'Faculty qualification summary' as info,
    COUNT(DISTINCT faculty_id) as qualified_faculty_count,
    COUNT(*) as total_qualifications
FROM faculty_qualified_subjects;

RAISE NOTICE '✅ Semester-subject linkage setup completed successfully!';
RAISE NOTICE 'Subjects now have semester field and faculty qualifications are properly linked.';