-- ============================================================================
-- INSERT COMPLETE CSE CURRICULUM INTO SUPABASE DATABASE
-- This query inserts the full 8-semester Computer Science & Engineering curriculum
-- ============================================================================

-- This query inserts the full curriculum into the CSE department.
-- It automatically determines if a course is a 'LAB' or 'THEORY' based on its title.
WITH cse_dept AS (
  SELECT id FROM departments WHERE code = 'CSE'
)
INSERT INTO subjects (department_id, name, code, credits_per_week, subject_type)
VALUES
    -- Semester 1
    ((SELECT id FROM cse_dept), 'Engineering Chemistry', '25CE101T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Engineering Chemistry Lab', '25CE101P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Linear Algebra and Calculus', '25CE102T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Linear Algebra and Calculus Lab', '25CE102P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Logic building with C', '25CE103T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Logic building with C Lab', '25CE103P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Competitive Programming - I', '25CE104T', 2, 'PRACTICAL'),
    ((SELECT id FROM cse_dept), 'Concept in Computer Engineering-I', '25CE105T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Business Communication Skills I Lab', '25CE106P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Indian Knowledge Systems', '25CE107T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Co-curricular Courses - I', '25CE108T', 2, 'THEORY'),
    
    -- Semester 2
    ((SELECT id FROM cse_dept), 'Engineering Physics and Materials Science', '25CE201T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Engineering Physics and Materials Science Lab', '25CE201P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Statistics and Probability', '25CE202T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Statistics and Probability Lab', '25CE202P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Problem Solving with Python', '25CE203T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Problem Solving with Python Lab', '25CE203P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Competitive Programming - II', '25CE204T', 2, 'PRACTICAL'),
    ((SELECT id FROM cse_dept), 'Modern Web Technologies', '25CE205T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Business Communication Skills - II Lab', '25CE206P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Design Thinking', '25CE207T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Co-curricular Courses - II', '25CE208T', 2, 'THEORY'),
    
    -- Semester 3
    ((SELECT id FROM cse_dept), 'Mathematics for Computer Engineering', '25CE301T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Data Structure', '25CE302T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Data Structure Lab', '25CE302P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Digital Circuits', '25CE303T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Digital Circuits Lab', '25CE303P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Computer Architecture', '25CE304T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Computer Lab-I', '25CE305P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Constitution of India', '25ES301T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Fundamentals of Entrepreneurship', '25ES302T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Career Development - I', '25CE341P', 1, 'PRACTICAL'),
    ((SELECT id FROM cse_dept), 'MDM-I (Essentials of computing Systems)', '25CE331M', 2, 'THEORY'),
    
    -- Semester 4
    ((SELECT id FROM cse_dept), 'Data Communication', '25CE401T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Database Management System', '25CE402T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Database Management System Lab', '25CE402P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Object Oriented Programming', '25CE403T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Object Oriented Programming Lab', '25CE403P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Environmental Science', '25ES401T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Fundamentals of Economics and Management', '25ES402T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Career Development - II', '25CE441P', 1, 'PRACTICAL'),
    ((SELECT id FROM cse_dept), 'Mini Project II', '25CE405P', 1, 'PRACTICAL'),
    ((SELECT id FROM cse_dept), 'MDM-II (Indian Cyber Law)', '25CE431M', 3, 'THEORY'),
    
    -- Semester 5
    ((SELECT id FROM cse_dept), 'Theory of Computation', '25CE501T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Operating System', '25CE502T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Operating System Lab', '25CE502P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Professional Elective - I', '25CE503T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Professional Elective - II', '25CE504T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Technical Skill Development - I', '25CE505P', 2, 'PRACTICAL'),
    ((SELECT id FROM cse_dept), 'English for Engineers', '25CE541P', 2, 'PRACTICAL'),
    ((SELECT id FROM cse_dept), 'MDM-III (Introduction to Business Management)', '25CE531M', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Open Elective - I', '25CE5610', 2, 'THEORY'),
    
    -- Semester 6
    ((SELECT id FROM cse_dept), 'Design and Analysis of Algorithms', '25CE601T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Design and Analysis of Algorithms Lab', '25CE601P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Professional Elective -III', '25CE602T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Professional Elective -IV', '25CE603T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Technical Skill Development - II', '25CE604P', 2, 'PRACTICAL'),
    ((SELECT id FROM cse_dept), 'Project - 1', '25CE605P', 2, 'PRACTICAL'),
    ((SELECT id FROM cse_dept), 'MDM-IV (Financial Accounting and Analysis)', '25CE631M', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Open Elective -II', '25CE6610', 3, 'THEORY'),
    
    -- Semester 7
    ((SELECT id FROM cse_dept), 'Compiler Construction', '25CE701T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Cryptography and Network Security', '25CE702T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Cryptography and Network Security Lab', '25CE702P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Professional Elective-V', '25CE703T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Professional Elective-VI', '25CE704T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Project - II', '25CE705P', 2, 'PRACTICAL'),
    ((SELECT id FROM cse_dept), 'MDM-V (Economics and Innovation)', '25CE731M', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Open Elective- III', '25CE7610', 3, 'THEORY'),
    
    -- Semester 8
    ((SELECT id FROM cse_dept), 'Research Methodology', '25ES801T', 2, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Research Methodology Lab', '25ES801P', 2, 'LAB'),
    ((SELECT id FROM cse_dept), 'Professional Elective-VII', '25CE802T', 3, 'THEORY'),
    ((SELECT id FROM cse_dept), 'Professional Elective-VII Lab', '25CE802P', 1, 'LAB'),
    ((SELECT id FROM cse_dept), 'Industry/Research Internship', '25CE803P(i)', 12, 'PRACTICAL'),
    ((SELECT id FROM cse_dept), 'Institutional Internships & Project III', '25CE804P(i)', 12, 'PRACTICAL')
ON CONFLICT (department_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    credits_per_week = EXCLUDED.credits_per_week,
    subject_type = EXCLUDED.subject_type;

-- Display curriculum summary for verification
SELECT 
    CASE 
        WHEN code LIKE '%101%' OR code LIKE '%10%' THEN 'Semester 1'
        WHEN code LIKE '%201%' OR code LIKE '%20%' THEN 'Semester 2'
        WHEN code LIKE '%301%' OR code LIKE '%30%' THEN 'Semester 3'
        WHEN code LIKE '%401%' OR code LIKE '%40%' THEN 'Semester 4'
        WHEN code LIKE '%501%' OR code LIKE '%50%' THEN 'Semester 5'
        WHEN code LIKE '%601%' OR code LIKE '%60%' THEN 'Semester 6'
        WHEN code LIKE '%701%' OR code LIKE '%70%' THEN 'Semester 7'
        WHEN code LIKE '%801%' OR code LIKE '%80%' THEN 'Semester 8'
        ELSE 'Other'
    END as semester,
    subject_type,
    COUNT(*) as subject_count,
    SUM(credits_per_week) as total_credits
FROM subjects s
JOIN departments d ON s.department_id = d.id
WHERE d.code = 'CSE'
GROUP BY 
    CASE 
        WHEN code LIKE '%101%' OR code LIKE '%10%' THEN 'Semester 1'
        WHEN code LIKE '%201%' OR code LIKE '%20%' THEN 'Semester 2'
        WHEN code LIKE '%301%' OR code LIKE '%30%' THEN 'Semester 3'
        WHEN code LIKE '%401%' OR code LIKE '%40%' THEN 'Semester 4'
        WHEN code LIKE '%501%' OR code LIKE '%50%' THEN 'Semester 5'
        WHEN code LIKE '%601%' OR code LIKE '%60%' THEN 'Semester 6'
        WHEN code LIKE '%701%' OR code LIKE '%70%' THEN 'Semester 7'
        WHEN code LIKE '%801%' OR code LIKE '%80%' THEN 'Semester 8'
        ELSE 'Other'
    END,
    subject_type
ORDER BY semester, subject_type;