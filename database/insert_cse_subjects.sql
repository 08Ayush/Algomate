-- Insert/update CSE subjects (safe script)
-- Run this in Supabase SQL editor or with psql using your DATABASE_URL

-- Abort if department CSE does not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM departments WHERE code = 'CSE') THEN
    RAISE EXCEPTION 'Department CSE not found. Please create the department first.';
  END IF;
END$$;

BEGIN;

WITH cse_dept AS (
  SELECT id FROM departments WHERE code = 'CSE'
)
INSERT INTO subjects (name, code, department_id, credits_per_week, subject_type)
VALUES
    ('Cryptography and Network Security', 'CNS', (SELECT id FROM cse_dept), 3, 'THEORY'),
    ('Cryptography and Network Security Lab', 'CNS lab', (SELECT id FROM cse_dept), 1, 'LAB'),
    ('Deep Learning', 'DL', (SELECT id FROM cse_dept), 3, 'THEORY'),
    ('Theory of Computation', 'TOC', (SELECT id FROM cse_dept), 3, 'THEORY'),
    ('Theory of Computation Lab', 'TOC lab', (SELECT id FROM cse_dept), 1, 'LAB'),
    ('Data Communication and computer networks', 'DCFM', (SELECT id FROM cse_dept), 3, 'THEORY'),
    ('Data Communication and computer networks Lab', 'DCFM lab', (SELECT id FROM cse_dept), 1, 'LAB'),
    ('Operating System', 'OS', (SELECT id FROM cse_dept), 3, 'THEORY'),
    ('Operating System Lab', 'OS lab', (SELECT id FROM cse_dept), 1, 'LAB'),
    ('Software Engineering and Project Management', 'SEPM', (SELECT id FROM cse_dept), 3, 'THEORY'),
    ('Software Engineering and Project Management Lab', 'SEPM lab', (SELECT id FROM cse_dept), 1, 'LAB'),
    ('Computer Architecture and Organization', 'CAO', (SELECT id FROM cse_dept), 3, 'THEORY'),
    ('Capstone Lab', 'Capstone lab', (SELECT id FROM cse_dept), 1, 'LAB'),
    ('Compiler Construction', 'CC', (SELECT id FROM cse_dept), 3, 'THEORY'),
    ('Compiler Construction Lab', 'CC lab', (SELECT id FROM cse_dept), 1, 'LAB'),
    ('MDM-I', 'MDM-1', (SELECT id FROM cse_dept), 2, 'THEORY'),
    ('Data Structure', 'DS', (SELECT id FROM cse_dept), 3, 'THEORY'),
    ('Data Structure Lab', 'DS lab', (SELECT id FROM cse_dept), 1, 'LAB'),
    ('Open Elective - III', 'OE-3', (SELECT id FROM cse_dept), 3, 'THEORY'),
    ('MDM-III', 'MDM-3', (SELECT id FROM cse_dept), 3, 'THEORY'),
    ('Project - II', 'Project-2', (SELECT id FROM cse_dept), 2, 'PRACTICAL'),
    ('Micro Project', 'Micro Project', (SELECT id FROM cse_dept), 1, 'PRACTICAL')
ON CONFLICT (department_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    credits_per_week = EXCLUDED.credits_per_week,
    subject_type = EXCLUDED.subject_type;

COMMIT;

-- Helpful select to verify insertion
SELECT id, name, code, credits_per_week, subject_type
FROM subjects
WHERE department_id = (SELECT id FROM departments WHERE code = 'CSE')
ORDER BY code;
