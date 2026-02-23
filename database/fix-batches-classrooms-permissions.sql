-- ============================================================================
-- FIX PERMISSIONS FOR BATCHES AND CLASSROOMS TABLES
-- This script grants necessary permissions for the anon role to perform CRUD operations
-- ============================================================================

-- Grant permissions for batches table
GRANT SELECT, INSERT, UPDATE, DELETE ON batches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON batches TO authenticated;

-- Grant permissions for classrooms table
GRANT SELECT ON classrooms TO anon;
GRANT SELECT ON classrooms TO authenticated;

-- Grant permissions for subjects table (if not already granted)
GRANT SELECT ON subjects TO anon;
GRANT SELECT ON subjects TO authenticated;

-- Grant permissions for departments table
GRANT SELECT ON departments TO anon;
GRANT SELECT ON departments TO authenticated;

-- Grant permissions for users table (for coordinator lookup)
GRANT SELECT ON users TO anon;
GRANT SELECT ON users TO authenticated;

-- Grant permissions for colleges table
GRANT SELECT ON colleges TO anon;
GRANT SELECT ON colleges TO authenticated;

-- Grant permissions for events table (if not already granted)
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO authenticated;

-- Grant permissions for event_registrations table
GRANT SELECT, INSERT, UPDATE, DELETE ON event_registrations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_registrations TO authenticated;

-- Grant permissions for event_notifications table
GRANT SELECT, INSERT, UPDATE, DELETE ON event_notifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_notifications TO authenticated;

-- Grant permissions for faculty_qualified_subjects table
GRANT SELECT ON faculty_qualified_subjects TO anon;
GRANT SELECT ON faculty_qualified_subjects TO authenticated;

-- Grant permissions for batch_subjects table
GRANT SELECT ON batch_subjects TO anon;
GRANT SELECT ON batch_subjects TO authenticated;

-- Verify permissions
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.table_privileges 
WHERE grantee IN ('anon', 'authenticated') 
    AND table_name IN ('batches', 'classrooms', 'subjects', 'departments', 'users', 'colleges', 'events')
ORDER BY table_name, grantee, privilege_type;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Permissions granted successfully!';
    RAISE NOTICE '📋 Tables updated: batches, classrooms, subjects, departments, users, colleges, events';
    RAISE NOTICE '👥 Roles updated: anon, authenticated';
END $$;
