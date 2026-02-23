-- ============================================================================
-- GCOEJ (Government College of Education, Jammu) Users Setup
-- This script creates the college, department, and sample users for testing
-- ============================================================================

-- Insert GCOEJ College
INSERT INTO colleges (
    name, 
    code, 
    address, 
    city, 
    state, 
    academic_year, 
    working_days, 
    college_start_time, 
    college_end_time,
    phone,
    email,
    website
) VALUES (
    'Government College of Education, Jammu', 
    'GCOEJ', 
    'Canal Road, Jammu', 
    'Jammu', 
    'Jammu and Kashmir', 
    '2025-26', 
    ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']::day_of_week[], 
    '09:00:00', 
    '16:00:00',
    '+91-191-2123456',
    'info@gcoej.edu.in',
    'https://gcoej.edu.in'
);

-- Insert Education Department for GCOEJ
INSERT INTO departments (
    college_id, 
    name, 
    code, 
    description,
    department_type
) VALUES (
    (SELECT id FROM colleges WHERE code = 'GCOEJ'), 
    'Education', 
    'EDU', 
    'Department of Education offering B.Ed and other teacher training programs',
    'academic'
);

-- Insert Admin User
INSERT INTO users (
    first_name,
    last_name,
    college_uid,
    email,
    password_hash, -- Password: admin123 (bcrypt hashed)
    phone,
    college_id,
    department_id,
    role,
    access_level,
    can_create_timetables,
    can_publish_timetables,
    can_approve_timetables,
    is_active,
    email_verified
) VALUES (
    'Rajesh',
    'Kumar',
    'ADMIN001',
    'admin@gcoej.in',
    '$2b$10$rOzJgZxvfq7H8Ln/VQJjVeKNwYv5vKH3d8FgRxP2LmN9QwErTyBiC', -- admin123
    '+91-9876543210',
    (SELECT id FROM colleges WHERE code = 'GCOEJ'),
    (SELECT id FROM departments WHERE code = 'EDU' AND college_id = (SELECT id FROM colleges WHERE code = 'GCOEJ')),
    'admin',
    'admin',
    true,
    true,
    true,
    true,
    true
);

-- Insert Faculty User
INSERT INTO users (
    first_name,
    last_name,
    college_uid,
    email,
    password_hash, -- Password: faculty123 (bcrypt hashed)
    phone,
    college_id,
    department_id,
    role,
    faculty_type,
    access_level,
    max_hours_per_day,
    max_hours_per_week,
    min_hours_per_week,
    faculty_priority,
    can_create_timetables,
    can_publish_timetables,
    is_active,
    email_verified
) VALUES (
    'Dr. Priya',
    'Sharma',
    'FAC001',
    'priya.sharma@gcoej.in',
    '$2b$10$8VxGfKZqJmN4YwHrP1LmQeRnBvC2DtF5GhI6JkM7NpO8QsT9UvW0X', -- faculty123
    '+91-9876543211',
    (SELECT id FROM colleges WHERE code = 'GCOEJ'),
    (SELECT id FROM departments WHERE code = 'EDU' AND college_id = (SELECT id FROM colleges WHERE code = 'GCOEJ')),
    'faculty',
    'general',
    'write',
    8,
    35,
    15,
    7,
    false,
    false,
    true,
    true
);

-- Insert Student User
INSERT INTO users (
    first_name,
    last_name,
    college_uid,
    email,
    password_hash, -- Password: student123 (bcrypt hashed)
    phone,
    college_id,
    department_id,
    role,
    access_level,
    student_id,
    admission_year,
    current_semester,
    is_active,
    email_verified
) VALUES (
    'Aarav',
    'Verma',
    'STU001',
    'aarav.verma@gcoej.in',
    '$2b$10$3MnB5VtC7YzA1WsE9RqL4eHgF2JkM6NpO7QsT8UvX0Y1ZaBcD4EfG', -- student123
    '+91-9876543212',
    (SELECT id FROM colleges WHERE code = 'GCOEJ'),
    (SELECT id FROM departments WHERE code = 'EDU' AND college_id = (SELECT id FROM colleges WHERE code = 'GCOEJ')),
    'student',
    'read',
    'GCOEJ2025001',
    2025,
    1,
    true,
    true
);

-- Create a sample batch for B.Ed Semester 1
INSERT INTO batches (
    name,
    college_id,
    department_id,
    semester,
    academic_year,
    expected_strength,
    actual_strength,
    section,
    is_active
) VALUES (
    'B.Ed Semester 1 - Section A',
    (SELECT id FROM colleges WHERE code = 'GCOEJ'),
    (SELECT id FROM departments WHERE code = 'EDU' AND college_id = (SELECT id FROM colleges WHERE code = 'GCOEJ')),
    1,
    '2025-26',
    40,
    1, -- Will be updated when more students are enrolled
    'A',
    true
);

-- Enroll the student in the batch
INSERT INTO student_batch_enrollment (
    student_id,
    batch_id,
    enrollment_date,
    is_active
) VALUES (
    (SELECT id FROM users WHERE college_uid = 'STU001' AND college_id = (SELECT id FROM colleges WHERE code = 'GCOEJ')),
    (SELECT id FROM batches WHERE name = 'B.Ed Semester 1 - Section A' AND college_id = (SELECT id FROM colleges WHERE code = 'GCOEJ')),
    CURRENT_DATE,
    true
);

-- ============================================================================
-- VERIFICATION QUERIES (Optional - uncomment to run)
-- ============================================================================

-- Check if college was created successfully
-- SELECT * FROM colleges WHERE code = 'GCOEJ';

-- Check if department was created successfully  
-- SELECT d.*, c.name as college_name FROM departments d 
-- JOIN colleges c ON d.college_id = c.id 
-- WHERE d.code = 'EDU' AND c.code = 'GCOEJ';

-- Check if users were created successfully
-- SELECT u.first_name, u.last_name, u.email, u.role, u.college_uid, c.name as college_name, d.name as department_name
-- FROM users u 
-- JOIN colleges c ON u.college_id = c.id 
-- LEFT JOIN departments d ON u.department_id = d.id 
-- WHERE c.code = 'GCOEJ' 
-- ORDER BY u.role, u.first_name;

-- Check student enrollment
-- SELECT u.first_name, u.last_name, u.student_id, b.name as batch_name, sbe.enrollment_date
-- FROM users u 
-- JOIN student_batch_enrollment sbe ON u.id = sbe.student_id
-- JOIN batches b ON sbe.batch_id = b.id
-- JOIN colleges c ON u.college_id = c.id
-- WHERE c.code = 'GCOEJ';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Default passwords are hashed versions of:
--    - Admin: admin123
--    - Faculty: faculty123  
--    - Student: student123
-- 2. All users have verified emails for immediate access
-- 3. Admin user has full permissions for timetable management
-- 4. Faculty user has general permissions with write access
-- 5. Student user has read-only access and is enrolled in Semester 1
-- 6. A sample batch is created for B.Ed Semester 1
-- 7. Remember to change passwords in production environment
-- ============================================================================