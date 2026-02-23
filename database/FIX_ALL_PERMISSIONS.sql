-- COMPLETE PERMISSIONS FIX FOR ALL TABLES
-- Run this in Supabase SQL Editor to fix all permission issues

-- 1. Grant permissions on all main tables
GRANT ALL ON timetable_generation_tasks TO anon, authenticated, service_role;
GRANT ALL ON generated_timetables TO anon, authenticated, service_role;
GRANT ALL ON scheduled_classes TO anon, authenticated, service_role;
GRANT ALL ON workflow_approvals TO anon, authenticated, service_role;
GRANT ALL ON audit_logs TO anon, authenticated, service_role;
GRANT ALL ON batches TO anon, authenticated, service_role;
GRANT ALL ON users TO anon, authenticated, service_role;
GRANT ALL ON subjects TO anon, authenticated, service_role;
GRANT ALL ON faculty_qualified_subjects TO anon, authenticated, service_role;
GRANT ALL ON time_slots TO anon, authenticated, service_role;
GRANT ALL ON classrooms TO anon, authenticated, service_role;
GRANT ALL ON departments TO anon, authenticated, service_role;
GRANT ALL ON colleges TO anon, authenticated, service_role;
GRANT ALL ON notifications TO anon, authenticated, service_role;

-- 2. Grant sequence permissions (for auto-increment IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Disable Row Level Security (RLS) for development
ALTER TABLE timetable_generation_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_timetables DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_approvals DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_qualified_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE colleges DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- 4. Verify permissions
SELECT 
  tablename,
  has_table_privilege('anon', tablename, 'SELECT') as anon_select,
  has_table_privilege('anon', tablename, 'INSERT') as anon_insert,
  has_table_privilege('authenticated', tablename, 'SELECT') as auth_select,
  has_table_privilege('authenticated', tablename, 'INSERT') as auth_insert
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
