-- ============================================================================
-- COMPLETE PERMISSIONS FIX FOR EVENTS SYSTEM
-- This grants all necessary permissions for the events system to work
-- ============================================================================

-- Step 1: Disable RLS on all event tables
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_notifications DISABLE ROW LEVEL SECURITY;

-- Step 2: Grant ALL permissions to anon and authenticated roles
GRANT ALL ON events TO anon;
GRANT ALL ON events TO authenticated;
GRANT ALL ON event_registrations TO anon;
GRANT ALL ON event_registrations TO authenticated;
GRANT ALL ON event_notifications TO anon;
GRANT ALL ON event_notifications TO authenticated;

-- Step 3: Grant sequence permissions (for auto-incrementing IDs if any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 4: Verify the grants
SELECT 
    schemaname, 
    tablename, 
    tableowner,
    rowsecurity as rls_enabled,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename IN ('events', 'event_registrations', 'event_notifications');

-- Step 5: Check current privileges
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.table_privileges 
WHERE table_name IN ('events', 'event_registrations', 'event_notifications')
ORDER BY table_name, grantee, privilege_type;

-- Step 6: Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS events_select_policy ON events;
DROP POLICY IF EXISTS events_insert_policy ON events;
DROP POLICY IF EXISTS events_update_policy ON events;
DROP POLICY IF EXISTS events_delete_policy ON events;
DROP POLICY IF EXISTS events_all_policy ON events;
DROP POLICY IF EXISTS registrations_insert_policy ON event_registrations;
DROP POLICY IF EXISTS registrations_select_policy ON event_registrations;
DROP POLICY IF EXISTS registrations_all_policy ON event_registrations;
DROP POLICY IF EXISTS notifications_select_policy ON event_notifications;
DROP POLICY IF EXISTS notifications_all_policy ON event_notifications;

-- Confirmation message
SELECT 'Permissions fixed! All CRUD operations should now work from UI' as status;
