-- ============================================================================
-- SUPABASE SETUP INSTRUCTIONS
-- Instructions for setting up the Academic Compass database on Supabase
-- ============================================================================

-- 1. CREATE A NEW SUPABASE PROJECT
--    - Go to https://supabase.com/dashboard
--    - Click "New Project"
--    - Choose your organization
--    - Fill in project details:
--      * Name: Academic Compass
--      * Database Password: [Choose a strong password]
--      * Region: [Choose closest to your users]

-- 2. EXECUTE THE SCHEMA
--    - Go to SQL Editor in your Supabase dashboard
--    - Copy and paste the contents of schema.sql
--    - Click "Run" to execute the entire schema

-- 3. CONFIGURE AUTHENTICATION
--    - Go to Authentication > Settings
--    - Configure your preferred auth providers (Email, Google, etc.)
--    - Set up email templates if needed

-- 4. SET UP ROW LEVEL SECURITY
--    The schema includes basic RLS policies, but you may need to customize them
--    based on your specific authentication setup.

-- 5. ENVIRONMENT VARIABLES
--    Add these to your .env.local file:

-- NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
-- NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
-- SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

-- 6. API ENDPOINTS
--    Your Supabase project will provide:
--    - REST API: https://your-project.supabase.co/rest/v1/
--    - GraphQL API: https://your-project.supabase.co/graphql/v1/
--    - Auth API: https://your-project.supabase.co/auth/v1/

-- ============================================================================
-- DATABASE SEEDING QUERIES
-- Use these queries to populate your database with initial data
-- ============================================================================

-- Create admin user (run after setting up authentication)
-- Replace the email and other details with your admin credentials
/*
INSERT INTO users (
    first_name, 
    last_name, 
    college_uid, 
    email, 
    password_hash, 
    role, 
    department_id,
    is_active,
    email_verified
) VALUES (
    'System',
    'Administrator',
    'ADMIN001',
    'admin@academiccompass.edu',
    '$2b$10$hash_generated_by_your_auth_system', -- This should be handled by Supabase Auth
    'admin',
    (SELECT id FROM departments WHERE code = 'CSE' LIMIT 1),
    true,
    true
);
*/

-- Add more sample subjects for Computer Science
INSERT INTO subjects (name, code, credits, department_id, description) VALUES
    ('Data Structures and Algorithms', 'CS201', 4, (SELECT id FROM departments WHERE code = 'CSE'), 'Fundamental data structures and algorithmic techniques'),
    ('Database Management Systems', 'CS301', 3, (SELECT id FROM departments WHERE code = 'CSE'), 'Design and implementation of database systems'),
    ('Computer Networks', 'CS302', 3, (SELECT id FROM departments WHERE code = 'CSE'), 'Principles of computer networking and protocols'),
    ('Software Engineering', 'CS401', 4, (SELECT id FROM departments WHERE code = 'CSE'), 'Software development methodologies and practices'),
    ('Operating Systems', 'CS303', 3, (SELECT id FROM departments WHERE code = 'CSE'), 'Operating system concepts and implementation'),
    ('Web Technologies', 'CS304', 3, (SELECT id FROM departments WHERE code = 'CSE'), 'Modern web development technologies and frameworks'),
    ('Machine Learning', 'CS501', 4, (SELECT id FROM departments WHERE code = 'CSE'), 'Introduction to machine learning algorithms and applications'),
    ('Artificial Intelligence', 'CS502', 4, (SELECT id FROM departments WHERE code = 'CSE'), 'AI concepts, search algorithms, and knowledge representation');

-- Add sample subjects for Information Technology
INSERT INTO subjects (name, code, credits, department_id, description) VALUES
    ('Programming Fundamentals', 'IT101', 4, (SELECT id FROM departments WHERE code = 'IT'), 'Introduction to programming concepts and logic'),
    ('Object Oriented Programming', 'IT201', 4, (SELECT id FROM departments WHERE code = 'IT'), 'OOP concepts using Java/C++'),
    ('System Analysis and Design', 'IT301', 3, (SELECT id FROM departments WHERE code = 'IT'), 'Software system analysis and design methodologies'),
    ('Network Security', 'IT401', 3, (SELECT id FROM departments WHERE code = 'IT'), 'Network security protocols and cybersecurity'),
    ('Mobile Application Development', 'IT402', 3, (SELECT id FROM departments WHERE code = 'IT'), 'Android and iOS app development');

-- Create sample batches
INSERT INTO batches (name, department_id, semester, academic_year, student_count) VALUES
    ('Section A', (SELECT id FROM departments WHERE code = 'CSE'), 3, '2024-25', 45),
    ('Section B', (SELECT id FROM departments WHERE code = 'CSE'), 3, '2024-25', 42),
    ('Section A', (SELECT id FROM departments WHERE code = 'CSE'), 5, '2024-25', 38),
    ('Section A', (SELECT id FROM departments WHERE code = 'IT'), 3, '2024-25', 40),
    ('Section B', (SELECT id FROM departments WHERE code = 'IT'), 3, '2024-25', 35),
    ('Section A', (SELECT id FROM departments WHERE code = 'ECE'), 3, '2024-25', 50);

-- ============================================================================
-- HELPFUL QUERIES FOR DEVELOPMENT
-- ============================================================================

-- Check all tables and their row counts
/*
SELECT 
    schemaname,
    tablename,
    attname,
    typename,
    has_default
FROM (
    SELECT 
        schemaname,
        tablename,
        attname,
        typename,
        has_default
    FROM pg_tables t
    JOIN pg_attribute a ON a.attrelid = (schemaname||'.'||tablename)::regclass
    JOIN pg_type ty ON ty.oid = a.atttypid
    WHERE schemaname = 'public'
    AND attnum > 0
    AND NOT attisdropped
    ORDER BY tablename, attnum
) sub;
*/

-- View all departments with their head information
/*
SELECT 
    d.name as department_name,
    d.code,
    u.first_name || ' ' || u.last_name as head_name,
    u.email as head_email
FROM departments d
LEFT JOIN users u ON d.head_of_department = u.id
ORDER BY d.name;
*/

-- View all users by role
/*
SELECT 
    role,
    COUNT(*) as user_count,
    string_agg(first_name || ' ' || last_name, ', ') as users
FROM users
GROUP BY role
ORDER BY role;
*/

-- View timetable conflicts (should return empty if no conflicts)
/*
SELECT 
    t1.id as slot1_id,
    t2.id as slot2_id,
    c.name as classroom,
    t1.day,
    t1.start_time,
    t1.end_time,
    'Classroom conflict' as conflict_type
FROM timetable_slots t1
JOIN timetable_slots t2 ON t1.id < t2.id
JOIN classrooms c ON t1.classroom_id = c.id
WHERE t1.classroom_id = t2.classroom_id
AND t1.day = t2.day
AND t1.start_time < t2.end_time
AND t1.end_time > t2.start_time
AND t1.timetable_id IN (SELECT id FROM timetables WHERE status = 'published')
AND t2.timetable_id IN (SELECT id FROM timetables WHERE status = 'published');
*/

-- ============================================================================
-- BACKUP AND MAINTENANCE
-- ============================================================================

-- Regular maintenance queries to run periodically:

-- Clean up old audit logs (older than 1 year)
/*
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
*/

-- Update user statistics
/*
UPDATE batches SET student_count = (
    SELECT COUNT(*) 
    FROM student_batch_enrollment sbe 
    WHERE sbe.batch_id = batches.id 
    AND sbe.is_active = true
);
*/

-- Find unused classrooms
/*
SELECT c.name, c.type, c.capacity
FROM classrooms c
LEFT JOIN timetable_slots ts ON c.id = ts.classroom_id
WHERE ts.id IS NULL
AND c.is_available = true;
*/