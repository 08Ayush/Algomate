-- ============================================================================
-- SUPABASE PERMISSIONS FIX - Run this after deploying new_schema.sql
-- This grants proper permissions for service role and application access
-- ============================================================================

-- Grant usage on the public schema to all roles
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant ALL permissions to service_role (needed for admin operations)
GRANT ALL PRIVILEGES ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant SELECT (read) permissions to anon and authenticated
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant INSERT, UPDATE, DELETE permissions to authenticated users
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant usage on sequences to authenticated (needed for auto-increment)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO authenticated;

-- Grant permissions on custom types (ENUMS)
GRANT USAGE ON TYPE user_role TO anon, authenticated, service_role;
GRANT USAGE ON TYPE faculty_role TO anon, authenticated, service_role;
GRANT USAGE ON TYPE content_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE timetable_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE day_of_week TO anon, authenticated, service_role;
GRANT USAGE ON TYPE subject_type TO anon, authenticated, service_role;
GRANT USAGE ON TYPE algorithm_phase TO anon, authenticated, service_role;
GRANT USAGE ON TYPE generation_task_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE access_level TO anon, authenticated, service_role;
GRANT USAGE ON TYPE notification_type TO anon, authenticated, service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Set default privileges for future functions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- Verify permissions by attempting to access key tables
SELECT 'Colleges table accessible' as status, COUNT(*) as record_count FROM colleges;
SELECT 'Departments table accessible' as status, COUNT(*) as record_count FROM departments;
SELECT 'Users table accessible' as status, COUNT(*) as record_count FROM users;

-- Show successful permission grant
SELECT 'Permissions successfully granted for PyGram Multi-College System' as result;