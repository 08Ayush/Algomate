-- ============================================================================
-- FIX RLS POLICIES FOR EVENTS
-- This script fixes the RLS policies to work with custom authentication
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS events_select_policy ON events;
DROP POLICY IF EXISTS events_insert_policy ON events;
DROP POLICY IF EXISTS events_update_policy ON events;
DROP POLICY IF EXISTS events_delete_policy ON events;
DROP POLICY IF EXISTS registrations_insert_policy ON event_registrations;
DROP POLICY IF EXISTS registrations_select_policy ON event_registrations;
DROP POLICY IF EXISTS notifications_select_policy ON event_notifications;

-- Disable RLS temporarily for development (or use simpler policies)
-- Option 1: Disable RLS (for development only)
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_notifications DISABLE ROW LEVEL SECURITY;

/*
-- Option 2: Enable RLS with permissive policies (if you want RLS enabled)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_notifications ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated requests (you can make this more restrictive later)
CREATE POLICY events_all_policy ON events
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY registrations_all_policy ON event_registrations
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY notifications_all_policy ON event_notifications
    FOR ALL
    USING (true)
    WITH CHECK (true);
*/

-- Verify changes
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('events', 'event_registrations', 'event_notifications');
