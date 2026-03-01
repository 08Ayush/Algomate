-- ============================================================================
-- Migration: Add Extended Notification Types
-- Date: 2026-02-01
-- Description: Adds new notification types for content workflow and other events
-- STATUS: ✅ APPLIED TO SUPABASE (2026-02-01)
-- ============================================================================

-- Step 1: Add new values to the notification_type ENUM
-- PostgreSQL allows adding values to existing ENUMs

-- Content workflow notifications
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'content_pending_review';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'content_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'content_rejected';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'revision_requested';

-- Timetable specific notifications
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'timetable_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'timetable_rejected';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'conflict_detected';

-- Resource and assignment notifications
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'resource_updated';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'assignment_created';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'assignment_due';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'assignment_submitted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'assignment_graded';

-- Announcement and event notifications
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'announcement';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_created';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_reminder';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_cancelled';

-- Administrative notifications
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'maintenance_alert';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'policy_update';

-- Step 2: Add additional columns to notifications table for better tracking
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT NULL;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS content_id UUID DEFAULT NULL;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' 
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS action_url TEXT DEFAULT NULL;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;

-- Step 3: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_content ON notifications(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_expiry ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN notifications.content_type IS 'Type of content: timetable, assignment, announcement, event, etc.';
COMMENT ON COLUMN notifications.content_id IS 'ID of the related content item';
COMMENT ON COLUMN notifications.priority IS 'Notification priority: low, normal, high, urgent';
COMMENT ON COLUMN notifications.action_url IS 'URL to navigate to when notification is clicked';
COMMENT ON COLUMN notifications.expires_at IS 'When the notification should auto-expire (for time-sensitive alerts)';
