-- ============================================================================
-- URGENT: Manual Scheduling Fix - Simple Version
-- Copy and paste this ENTIRE script into Supabase SQL Editor and run it
-- ============================================================================

-- Step 1: Add semester column to subjects table (this is the missing piece!)
ALTER TABLE subjects ADD COLUMN semester INT CHECK (semester BETWEEN 1 AND 8);

-- Step 2: Update existing subjects with semester information
UPDATE subjects SET semester = 3 WHERE code IN ('DS', 'DS lab');
UPDATE subjects SET semester = 5 WHERE code IN ('CAO', 'OS', 'OS lab', 'SEPM', 'SEPM lab', 'Capstone lab');
UPDATE subjects SET semester = 6 WHERE code IN ('TOC', 'TOC lab', 'CC', 'CC lab', 'DCFM', 'DCFM lab');
UPDATE subjects SET semester = 7 WHERE code IN ('CNS', 'CNS lab', 'DL', 'MDM-1', 'OE-3');
UPDATE subjects SET semester = 8 WHERE code IN ('MDM-3', 'Project-2', 'Micro Project');

-- Step 3: Add complete SVPCET CSE curriculum (Semesters 1-8)
-- ============================================================================

-- SEMESTER 1 SUBJECTS
INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Engineering Chemistry', '25CE101T', d.college_id, d.id, 2, 'THEORY', 1, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 1, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Engineering Chemistry Lab', '25CE101P', d.college_id, d.id, 1, 'LAB', 1, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 1, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Linear Algebra and Calculus', '25CE102T', d.college_id, d.id, 3, 'THEORY', 1, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 1, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Linear Algebra and Calculus Lab', '25CE102P', d.college_id, d.id, 1, 'LAB', 1, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 1, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Logic building with C', '25CE103T', d.college_id, d.id, 3, 'THEORY', 1, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 1, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Logic building with C Lab', '25CE103P', d.college_id, d.id, 1, 'LAB', 1, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 1, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Competitive Programming - I', '25CE104T', d.college_id, d.id, 2, 'THEORY', 1, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 1, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Concept in Computer Engineering-I', '25CE105T', d.college_id, d.id, 2, 'THEORY', 1, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 1, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Business Communication Skills I Lab', '25CE106P', d.college_id, d.id, 1, 'LAB', 1, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 1, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Indian Knowledge Systems', '25CE107T', d.college_id, d.id, 2, 'THEORY', 1, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 1, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Co-curricular Courses - I', '25CE108T', d.college_id, d.id, 2, 'THEORY', 1, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 1, credits_per_week = 2;

-- SEMESTER 2 SUBJECTS
INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Engineering Physics and Materials Science', '25CE201T', d.college_id, d.id, 2, 'THEORY', 2, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 2, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Engineering Physics and Materials Science Lab', '25CE201P', d.college_id, d.id, 1, 'LAB', 2, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 2, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Statistics and Probability', '25CE202T', d.college_id, d.id, 3, 'THEORY', 2, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 2, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Statistics and Probability Lab', '25CE202P', d.college_id, d.id, 1, 'LAB', 2, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 2, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Problem Solving with Python', '25CE203T', d.college_id, d.id, 3, 'THEORY', 2, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 2, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Problem Solving with Python Lab', '25CE203P', d.college_id, d.id, 1, 'LAB', 2, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 2, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Competitive Programming - II', '25CE204T', d.college_id, d.id, 2, 'THEORY', 2, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 2, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Modern Web Technologies', '25CE205T', d.college_id, d.id, 2, 'THEORY', 2, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 2, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Business Communication Skills - II Lab', '25CE206P', d.college_id, d.id, 1, 'LAB', 2, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 2, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Design Thinking', '25CE207T', d.college_id, d.id, 2, 'THEORY', 2, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 2, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Co-curricular Courses - II', '25CE208T', d.college_id, d.id, 2, 'THEORY', 2, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 2, credits_per_week = 2;

-- SEMESTER 3 SUBJECTS
INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Mathematics for Computer Engineering', '25CE301T', d.college_id, d.id, 3, 'THEORY', 3, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 3, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Data Structure', '25CE302T', d.college_id, d.id, 3, 'THEORY', 3, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 3, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Data Structure Lab', '25CE302P', d.college_id, d.id, 1, 'LAB', 3, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 3, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Digital Circuits', '25CE303T', d.college_id, d.id, 2, 'THEORY', 3, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 3, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Digital Circuits Lab', '25CE303P', d.college_id, d.id, 1, 'LAB', 3, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 3, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Computer Architecture', '25CE304T', d.college_id, d.id, 2, 'THEORY', 3, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 3, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Computer Lab-I', '25CE305P', d.college_id, d.id, 1, 'LAB', 3, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 3, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Constitution of India', '25ES301T', d.college_id, d.id, 2, 'THEORY', 3, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 3, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Fundamentals of Entrepreneurship', '25ES302T', d.college_id, d.id, 2, 'THEORY', 3, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 3, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Career Development - I', '25CE341P', d.college_id, d.id, 1, 'PRACTICAL', 3, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 3, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'MDM-I (Essentials of computing Systems)', '25CE331M', d.college_id, d.id, 2, 'THEORY', 3, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 3, credits_per_week = 2;

-- SEMESTER 4 SUBJECTS
INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Data Communication', '25CE401T', d.college_id, d.id, 3, 'THEORY', 4, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 4, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Database Management System', '25CE402T', d.college_id, d.id, 3, 'THEORY', 4, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 4, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Database Management System Lab', '25CE402P', d.college_id, d.id, 1, 'LAB', 4, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 4, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Object Oriented Programming', '25CE403T', d.college_id, d.id, 3, 'THEORY', 4, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 4, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Object Oriented Programming Lab', '25CE403P', d.college_id, d.id, 1, 'LAB', 4, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 4, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Environmental Science', '25ES401T', d.college_id, d.id, 2, 'THEORY', 4, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 4, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Fundamentals of Economics and Management', '25ES402T', d.college_id, d.id, 2, 'THEORY', 4, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 4, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Career Development - II', '25CE441P', d.college_id, d.id, 1, 'PRACTICAL', 4, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 4, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Mini Project II', '25CE405P', d.college_id, d.id, 1, 'PRACTICAL', 4, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 4, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'MDM-II (Indian Cyber Law)', '25CE431M', d.college_id, d.id, 3, 'THEORY', 4, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 4, credits_per_week = 3;

-- SEMESTER 5 SUBJECTS
INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Theory of Computation', '25CE501T', d.college_id, d.id, 3, 'THEORY', 5, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 5, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Operating System', '25CE502T', d.college_id, d.id, 3, 'THEORY', 5, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 5, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Operating System Lab', '25CE502P', d.college_id, d.id, 1, 'LAB', 5, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 5, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Professional Elective - I', '25CE503T', d.college_id, d.id, 2, 'THEORY', 5, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 5, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Professional Elective - II', '25CE504T', d.college_id, d.id, 2, 'THEORY', 5, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 5, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Technical Skill Development - I', '25CE505P', d.college_id, d.id, 2, 'PRACTICAL', 5, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 5, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'English for Engineers', '25CE541P', d.college_id, d.id, 2, 'PRACTICAL', 5, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 5, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'MDM-III (Introduction to Business Management)', '25CE531M', d.college_id, d.id, 3, 'THEORY', 5, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 5, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Open Elective - I', '25CE5610', d.college_id, d.id, 2, 'THEORY', 5, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 5, credits_per_week = 2;

-- SEMESTER 6 SUBJECTS
INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Design and Analysis of Algorithms', '25CE601T', d.college_id, d.id, 3, 'THEORY', 6, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 6, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Design and Analysis of Algorithms Lab', '25CE601P', d.college_id, d.id, 1, 'LAB', 6, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 6, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Professional Elective -III', '25CE602T', d.college_id, d.id, 3, 'THEORY', 6, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 6, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Professional Elective -IV', '25CE603T', d.college_id, d.id, 3, 'THEORY', 6, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 6, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Technical Skill Development - II', '25CE604P', d.college_id, d.id, 2, 'PRACTICAL', 6, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 6, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Project - 1', '25CE605P', d.college_id, d.id, 2, 'PRACTICAL', 6, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 6, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'MDM-IV (Financial Accounting and Analysis)', '25CE631M', d.college_id, d.id, 3, 'THEORY', 6, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 6, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Open Elective -II', '25CE6610', d.college_id, d.id, 3, 'THEORY', 6, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 6, credits_per_week = 3;

-- SEMESTER 7 SUBJECTS
INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Compiler Construction', '25CE701T', d.college_id, d.id, 3, 'THEORY', 7, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 7, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Cryptography and Network Security', '25CE702T', d.college_id, d.id, 2, 'THEORY', 7, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 7, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Cryptography and Network Security Lab', '25CE702P', d.college_id, d.id, 1, 'LAB', 7, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 7, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Professional Elective-V', '25CE703T', d.college_id, d.id, 3, 'THEORY', 7, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 7, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Professional Elective-VI', '25CE704T', d.college_id, d.id, 3, 'THEORY', 7, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 7, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Project - II', '25CE705P', d.college_id, d.id, 2, 'PRACTICAL', 7, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 7, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'MDM-V (Economics and Innovation)', '25CE731M', d.college_id, d.id, 3, 'THEORY', 7, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 7, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Open Elective- III', '25CE7610', d.college_id, d.id, 3, 'THEORY', 7, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 7, credits_per_week = 3;

-- SEMESTER 8 SUBJECTS (Option A - Research Track)
INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Research Methodology', '25ES801T', d.college_id, d.id, 2, 'THEORY', 8, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 8, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Research Methodology Lab', '25ES801P', d.college_id, d.id, 2, 'LAB', 8, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 8, credits_per_week = 2;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Professional Elective-VII', '25CE802T', d.college_id, d.id, 3, 'THEORY', 8, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 8, credits_per_week = 3;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Professional Elective-VII Lab', '25CE802P', d.college_id, d.id, 1, 'LAB', 8, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 8, credits_per_week = 1;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Industry/Research Internship', '25CE803P', d.college_id, d.id, 12, 'PRACTICAL', 8, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 8, credits_per_week = 12;

INSERT INTO subjects (name, code, college_id, department_id, credits_per_week, subject_type, semester, is_active) 
SELECT 'Institutional Internships & Project III', '25CE804P', d.college_id, d.id, 12, 'PRACTICAL', 8, true FROM departments d WHERE d.code = 'CSE'
ON CONFLICT (college_id, department_id, code) DO UPDATE SET semester = 8, credits_per_week = 12;

-- Step 4: Create faculty qualifications for bramhe user
INSERT INTO faculty_qualified_subjects (faculty_id, subject_id, proficiency_level, preference_score)
SELECT 
    u.id, s.id, 8, 7
FROM users u, subjects s, departments d
WHERE u.email = 'bramhe@svpce.edu.in' 
  AND s.department_id = d.id 
  AND d.code = 'CSE'
  AND u.role = 'faculty'
  AND s.is_active = true
ON CONFLICT (faculty_id, subject_id) DO NOTHING;

-- Step 5: Verify the complete SVPCET CSE curriculum fix
SELECT 
    'SVPCET CSE Subjects by Semester' as info,
    semester,
    COUNT(*) as subject_count,
    STRING_AGG(code, ', ' ORDER BY code) as subject_codes
FROM subjects 
WHERE is_active = true AND semester IS NOT NULL
GROUP BY semester 
ORDER BY semester;

SELECT 
    'Total SVPCET CSE Curriculum' as info,
    COUNT(*) as total_subjects,
    SUM(credits_per_week) as total_credits
FROM subjects 
WHERE is_active = true AND semester IS NOT NULL;

SELECT 
    'Faculty Qualifications for SVPCET CSE' as info,
    COUNT(*) as total_qualifications
FROM faculty_qualified_subjects fqs
JOIN users u ON fqs.faculty_id = u.id
WHERE u.email = 'bramhe@svpce.edu.in';

-- Success message for SVPCET CSE curriculum
SELECT '✅ SVPCET CSE Manual Scheduling Fix Applied Successfully!' as status;


