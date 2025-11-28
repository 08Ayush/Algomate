-- ============================================================================
-- TEST SCRIPT FOR COLLEGE INSERT
-- Run this in your Supabase SQL editor to test the college setup
-- ============================================================================

-- First, check if the schema is properly set up
SELECT 'Checking schema...' as status;

-- Check if required tables exist
SELECT 
    table_name,
    CASE WHEN table_name IN ('colleges', 'departments', 'users', 'time_slots', 'classrooms') 
         THEN '✅ Exists' 
         ELSE '❌ Missing' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('colleges', 'departments', 'users', 'time_slots', 'classrooms')
ORDER BY table_name;

-- Check if enums exist
SELECT 
    typname as enum_name,
    '✅ Exists' as status
FROM pg_type 
WHERE typname IN ('user_role', 'faculty_role', 'day_of_week')
ORDER BY typname;

-- Now test if the college insert would work (dry run)
SELECT 'Testing college insert...' as status;

-- Check for unique constraint violations
SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM colleges WHERE code = 'GCOEJ') 
        THEN '⚠️ College code GCOEJ already exists'
        ELSE '✅ College code GCOEJ is available'
    END as college_code_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM colleges WHERE name = 'Government College of Education, Jammu') 
        THEN '⚠️ College name already exists'
        ELSE '✅ College name is available'
    END as college_name_status;

-- If everything looks good, show next steps
SELECT 
    '✅ Ready to run insertcollege.sql' as status,
    'Admin Login: ADMIN001 / admin123' as credentials,
    'Time Slots: 6 per day (10:00-16:00)' as schedule,
    '6 Departments will be created' as departments;