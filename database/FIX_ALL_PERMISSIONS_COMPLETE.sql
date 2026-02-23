-- COMPREHENSIVE PERMISSIONS FIX FOR ALL TABLES
-- Run this in Supabase SQL Editor to fix all permission issues
-- Date: October 10, 2025

-- =====================================================
-- PART 1: Grant Table Permissions
-- =====================================================

-- Grant permissions on all main tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE colleges TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE departments TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE batches TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE subjects TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE classrooms TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE time_slots TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE generated_timetables TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE scheduled_classes TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE faculty_qualifications TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE batch_subject_linkage TO authenticated, anon;

-- Grant permissions on workflow and audit tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE workflow_approvals TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE audit_logs TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE notifications TO authenticated, anon;

-- Grant permissions on conflict and constraint tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE conflict_resolution TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE faculty_unavailability TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE room_unavailability TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE scheduling_constraints TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE generation_tasks TO authenticated, anon;

-- Grant permissions on additional tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE events TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE student_enrollments TO authenticated, anon;

-- =====================================================
-- PART 2: Grant Sequence Permissions
-- =====================================================

-- Grant usage on all sequences (for auto-incrementing IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- =====================================================
-- PART 3: Enable Row Level Security
-- =====================================================

-- Enable RLS on critical tables
ALTER TABLE workflow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 4: Create RLS Policies for workflow_approvals
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated to insert workflow" ON workflow_approvals;
DROP POLICY IF EXISTS "Allow authenticated to select workflow" ON workflow_approvals;
DROP POLICY IF EXISTS "Allow anon to insert workflow" ON workflow_approvals;
DROP POLICY IF EXISTS "Allow anon to select workflow" ON workflow_approvals;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated to insert workflow"
ON workflow_approvals
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated to select workflow"
ON workflow_approvals
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated to update workflow"
ON workflow_approvals
FOR UPDATE
TO authenticated
USING (true);

-- Create policies for anon users (for API access)
CREATE POLICY "Allow anon to insert workflow"
ON workflow_approvals
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anon to select workflow"
ON workflow_approvals
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon to update workflow"
ON workflow_approvals
FOR UPDATE
TO anon
USING (true);

-- =====================================================
-- PART 5: Create RLS Policies for audit_logs
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated to insert audit" ON audit_logs;
DROP POLICY IF EXISTS "Allow authenticated to select audit" ON audit_logs;
DROP POLICY IF EXISTS "Allow anon to insert audit" ON audit_logs;
DROP POLICY IF EXISTS "Allow anon to select audit" ON audit_logs;

CREATE POLICY "Allow authenticated to insert audit"
ON audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated to select audit"
ON audit_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow anon to insert audit"
ON audit_logs
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anon to select audit"
ON audit_logs
FOR SELECT
TO anon
USING (true);

-- =====================================================
-- PART 6: Create RLS Policies for generated_timetables
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated timetable access" ON generated_timetables;
DROP POLICY IF EXISTS "Allow anon timetable access" ON generated_timetables;

CREATE POLICY "Allow authenticated timetable access"
ON generated_timetables
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon timetable access"
ON generated_timetables
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- =====================================================
-- PART 7: Create RLS Policies for scheduled_classes
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated classes access" ON scheduled_classes;
DROP POLICY IF EXISTS "Allow anon classes access" ON scheduled_classes;

CREATE POLICY "Allow authenticated classes access"
ON scheduled_classes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon classes access"
ON scheduled_classes
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- =====================================================
-- PART 8: Create RLS Policies for notifications
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated notifications access" ON notifications;
DROP POLICY IF EXISTS "Allow anon notifications access" ON notifications;

CREATE POLICY "Allow authenticated notifications access"
ON notifications
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon notifications access"
ON notifications
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- =====================================================
-- PART 9: Disable RLS on tables that don't need it
-- =====================================================

-- These tables can be accessed without RLS for simplicity
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE colleges DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_qualifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE batch_subject_linkage DISABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_resolution DISABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_unavailability DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_unavailability DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_constraints DISABLE ROW LEVEL SECURITY;
ALTER TABLE generation_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 10: Verification Queries
-- =====================================================

-- Check table permissions
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check granted permissions
SELECT 
    table_name,
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public'
AND grantee IN ('authenticated', 'anon')
ORDER BY table_name, grantee;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- Success Message
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ ALL PERMISSIONS FIXED!';
    RAISE NOTICE '✅ Table permissions granted to authenticated and anon roles';
    RAISE NOTICE '✅ RLS policies created for critical tables';
    RAISE NOTICE '✅ Sequence permissions granted';
    RAISE NOTICE '✅ Your application should work now!';
END $$;
