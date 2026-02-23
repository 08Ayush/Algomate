-- ============================================================================
-- GOVERNMENT COLLEGE OF EDUCATION, JAMMU - COMPLETE SETUP
-- This script creates college, departments, admin user, and essential data
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 1: Insert College
WITH new_college AS (
    INSERT INTO colleges (
        id,
        name, 
        code, 
        address, 
        city, 
        state, 
        pincode, 
        phone, 
        email, 
        website, 
        academic_year, 
        semester_system, 
        working_days, 
        college_start_time, 
        college_end_time
    ) VALUES (
        gen_random_uuid(),                        -- Explicitly generate UUID
        'Government College of Education, Jammu', 
        'GCOEJ',                                  
        'Canal Road, Near IIIM',                  
        'Jammu', 
        'Jammu and Kashmir', 
        '180001',                                 
        '0191-2580401',                           
        'prplgcoe-jammu@jk.gov.in',               
        'https://www.gcoedu.in',                  
        '2025-26', 
        'semester',
        ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']::day_of_week[],
        '10:00:00',                               
        '16:00:00'
    ) 
    RETURNING id, code
),

-- Step 2: Insert Departments
new_departments AS (
    INSERT INTO departments (id, college_id, name, code, description)
    SELECT 
        gen_random_uuid(),
        nc.id,
        dept.name,
        dept.code,
        dept.description
    FROM new_college nc,
    (VALUES
        ('Education', 'EDU', 'Department of Education'),
        ('Mathematics', 'MATH', 'Department of Mathematics'),
        ('Science', 'SCI', 'Department of Science'),
        ('English', 'ENG', 'Department of English'),
        ('Hindi', 'HIN', 'Department of Hindi'),
        ('Social Studies', 'SS', 'Department of Social Studies')
    ) AS dept(name, code, description)
    RETURNING id, college_id, name, code
),

-- Step 3: Create Admin User (password: admin123)
new_admin AS (
    INSERT INTO users (
        id,
        first_name,
        last_name,
        college_uid,
        email,
        password_hash,
        phone,
        college_id,
        department_id,
        role,
        faculty_type,
        is_active,
        can_create_timetables,
        can_publish_timetables,
        can_approve_timetables
    )
    SELECT 
        gen_random_uuid(),
        'College',
        'Admin',
        'ADMIN001',
        'admin@gcoejammu.edu.in',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaqdHuuXuHCin1hmi2mHi3GKi', -- bcrypt hash for 'admin123'
        '0191-2580401',
        nc.id,
        nd.id,
        'admin',
        'general',
        true,
        true,
        true,
        true
    FROM new_college nc, new_departments nd 
    WHERE nd.code = 'EDU'
    RETURNING id, college_id
),

-- Step 4: Create Time Slots
new_time_slots AS (
    INSERT INTO time_slots (
        id,
        college_id,
        day,
        start_time,
        end_time,
        slot_name,
        is_break_time,
        is_lunch_time,
        is_active
    )
    SELECT 
        gen_random_uuid(),
        nc.id,
        slot.day::day_of_week,
        slot.start_time::time,
        slot.end_time::time,
        slot.slot_name,
        slot.is_break,
        slot.is_lunch,
        true
    FROM new_college nc,
    (VALUES
        -- Monday to Saturday time slots
        ('Monday', '10:00:00', '11:00:00', '10:00-11:00', false, false),
        ('Monday', '11:00:00', '12:00:00', '11:00-12:00', false, false),
        ('Monday', '12:00:00', '13:00:00', '12:00-13:00', false, false),
        ('Monday', '13:00:00', '14:00:00', 'Lunch Break', false, true), -- Lunch
        ('Monday', '14:00:00', '15:00:00', '14:00-15:00', false, false),
        ('Monday', '15:00:00', '16:00:00', '15:00-16:00', false, false),
        
        ('Tuesday', '10:00:00', '11:00:00', '10:00-11:00', false, false),
        ('Tuesday', '11:00:00', '12:00:00', '11:00-12:00', false, false),
        ('Tuesday', '12:00:00', '13:00:00', '12:00-13:00', false, false),
        ('Tuesday', '13:00:00', '14:00:00', 'Lunch Break', false, true), -- Lunch
        ('Tuesday', '14:00:00', '15:00:00', '14:00-15:00', false, false),
        ('Tuesday', '15:00:00', '16:00:00', '15:00-16:00', false, false),
        
        ('Wednesday', '10:00:00', '11:00:00', '10:00-11:00', false, false),
        ('Wednesday', '11:00:00', '12:00:00', '11:00-12:00', false, false),
        ('Wednesday', '12:00:00', '13:00:00', '12:00-13:00', false, false),
        ('Wednesday', '13:00:00', '14:00:00', 'Lunch Break', false, true), -- Lunch
        ('Wednesday', '14:00:00', '15:00:00', '14:00-15:00', false, false),
        ('Wednesday', '15:00:00', '16:00:00', '15:00-16:00', false, false),
        
        ('Thursday', '10:00:00', '11:00:00', '10:00-11:00', false, false),
        ('Thursday', '11:00:00', '12:00:00', '11:00-12:00', false, false),
        ('Thursday', '12:00:00', '13:00:00', '12:00-13:00', false, false),
        ('Thursday', '13:00:00', '14:00:00', 'Lunch Break', false, true), -- Lunch
        ('Thursday', '14:00:00', '15:00:00', '14:00-15:00', false, false),
        ('Thursday', '15:00:00', '16:00:00', '15:00-16:00', false, false),
        
        ('Friday', '10:00:00', '11:00:00', '10:00-11:00', false, false),
        ('Friday', '11:00:00', '12:00:00', '11:00-12:00', false, false),
        ('Friday', '12:00:00', '13:00:00', '12:00-13:00', false, false),
        ('Friday', '13:00:00', '14:00:00', 'Lunch Break', false, true), -- Lunch
        ('Friday', '14:00:00', '15:00:00', '14:00-15:00', false, false),
        ('Friday', '15:00:00', '16:00:00', '15:00-16:00', false, false),
        
        ('Saturday', '10:00:00', '11:00:00', '10:00-11:00', false, false),
        ('Saturday', '11:00:00', '12:00:00', '11:00-12:00', false, false),
        ('Saturday', '12:00:00', '13:00:00', '12:00-13:00', false, false),
        ('Saturday', '13:00:00', '14:00:00', 'Lunch Break', false, true), -- Lunch
        ('Saturday', '14:00:00', '15:00:00', '14:00-15:00', false, false),
        ('Saturday', '15:00:00', '16:00:00', '15:00-16:00', false, false)
    ) AS slot(day, start_time, end_time, slot_name, is_break, is_lunch)
    RETURNING id, college_id, day, start_time
),

-- Step 5: Create Sample Classrooms
new_classrooms AS (
    INSERT INTO classrooms (
        id,
        college_id,
        department_id,
        name,
        building,
        capacity,
        type,
        has_projector,
        has_ac,
        is_available
    )
    SELECT 
        gen_random_uuid(),
        nc.id,
        nd.id,
        classroom.name,
        classroom.building,
        classroom.capacity,
        classroom.type,
        classroom.has_projector,
        classroom.has_ac,
        true
    FROM new_college nc, new_departments nd,
    (VALUES
        ('Room 101', 'Main Building', 60, 'Lecture Hall', true, false),
        ('Room 102', 'Main Building', 40, 'Lecture Hall', true, false),
        ('Room 103', 'Main Building', 50, 'Lecture Hall', false, false),
        ('Lab 201', 'Science Block', 30, 'Lab', true, true),
        ('Lab 202', 'Science Block', 30, 'Lab', true, true),
        ('Seminar Hall', 'Main Building', 100, 'Seminar Room', true, true)
    ) AS classroom(name, building, capacity, type, has_projector, has_ac)
    WHERE nd.code = 'EDU' -- Assign to Education department
    RETURNING id, college_id, name
)

-- Final SELECT to show what was created
SELECT 
    'SUCCESS: College Setup Complete' as status,
    nc.code as college_code,
    (SELECT COUNT(*) FROM new_departments) as departments_created,
    (SELECT COUNT(*) FROM new_time_slots) as time_slots_created,
    (SELECT COUNT(*) FROM new_classrooms) as classrooms_created,
    'Login with: ADMIN001 / admin123' as admin_credentials
FROM new_college nc;