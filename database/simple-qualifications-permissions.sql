-- ================================================================
-- SIMPLE PERMISSIONS FOR FACULTY_QUALIFIED_SUBJECTS TABLE
-- ================================================================
-- Quick fix to allow INSERT/UPDATE/DELETE operations
-- Run this in Supabase SQL Editor
-- ================================================================

-- Disable RLS temporarily (or set policies to allow all)
ALTER TABLE faculty_qualified_subjects DISABLE ROW LEVEL SECURITY;

-- Grant all necessary permissions
GRANT ALL ON faculty_qualified_subjects TO anon;
GRANT ALL ON faculty_qualified_subjects TO authenticated;
GRANT ALL ON faculty_qualified_subjects TO service_role;

-- Grant sequence permissions (needed for auto-increment IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Specifically grant the sequence for faculty_qualified_subjects
GRANT USAGE, SELECT ON SEQUENCE faculty_qualified_subjects_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE faculty_qualified_subjects_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE faculty_qualified_subjects_id_seq TO service_role;

-- Verify permissions
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'faculty_qualified_subjects';

-- Check granted permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'faculty_qualified_subjects'
ORDER BY grantee, privilege_type;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Permissions granted successfully for faculty_qualified_subjects table';
    RAISE NOTICE '✅ RLS has been disabled for unrestricted access';
    RAISE NOTICE '✅ You can now INSERT, UPDATE, and DELETE qualifications';
END $$;
