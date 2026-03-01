-- ============================================================================
-- Migration: Complete Notification System for Production
-- Date: 2026-02-01
-- Version: 1.0.0
-- Description: Comprehensive notification system supporting all platform events
--              including timetables, assignments, announcements, events, and system alerts
-- ============================================================================

-- ============================================================================
-- PART 1: EXTEND notification_type ENUM
-- ============================================================================

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

-- ============================================================================
-- PART 2: ADD COLUMNS TO notifications TABLE
-- ============================================================================

-- Content type and ID for linking to specific content
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT NULL;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS content_id UUID DEFAULT NULL;

-- Priority system for urgent notifications
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';

-- Add check constraint for priority (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notifications_priority_check'
    ) THEN
        ALTER TABLE notifications ADD CONSTRAINT notifications_priority_check
        CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
    END IF;
END $$;

-- Action URL for direct navigation
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS action_url TEXT DEFAULT NULL;

-- Expiration for time-sensitive notifications
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================================
-- PART 3: CREATE ANNOUNCEMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    
    -- Content
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    
    -- Targeting
    target_type VARCHAR(20) NOT NULL DEFAULT 'college' 
        CHECK (target_type IN ('batch', 'department', 'college')),
    target_id UUID NOT NULL,
    
    -- Settings
    priority VARCHAR(20) DEFAULT 'normal' 
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    
    -- Attachments (JSON array of file URLs)
    attachments JSONB DEFAULT NULL,
    
    -- Timestamps
    expires_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 4: CREATE SUBMISSION QUESTION GRADES TABLE
-- (For detailed assignment grading)
-- ============================================================================

CREATE TABLE IF NOT EXISTS submission_question_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
    obtained_marks DECIMAL(5,2) DEFAULT 0,
    feedback TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique grade per question per submission
    CONSTRAINT unique_submission_question UNIQUE (submission_id, question_id)
);

-- ============================================================================
-- PART 5: CREATE PERFORMANCE INDEXES
-- ============================================================================

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
    ON notifications(recipient_id, is_read) WHERE is_read = FALSE;
    
CREATE INDEX IF NOT EXISTS idx_notifications_content 
    ON notifications(content_type, content_id) WHERE content_type IS NOT NULL;
    
CREATE INDEX IF NOT EXISTS idx_notifications_priority 
    ON notifications(priority, is_read) WHERE priority IN ('high', 'urgent');
    
CREATE INDEX IF NOT EXISTS idx_notifications_expiry 
    ON notifications(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
    ON notifications(recipient_id, created_at DESC);

-- Announcements indexes
CREATE INDEX IF NOT EXISTS idx_announcements_college 
    ON announcements(college_id, is_published, created_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_announcements_target 
    ON announcements(target_type, target_id, is_published);
    
CREATE INDEX IF NOT EXISTS idx_announcements_pinned 
    ON announcements(college_id, is_pinned DESC, created_at DESC) 
    WHERE is_published = TRUE;

CREATE INDEX IF NOT EXISTS idx_announcements_expiry 
    ON announcements(expires_at) WHERE expires_at IS NOT NULL;

-- Submission grades index
CREATE INDEX IF NOT EXISTS idx_submission_grades_submission 
    ON submission_question_grades(submission_id);

-- ============================================================================
-- PART 6: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_question_grades ENABLE ROW LEVEL SECURITY;

-- Announcements policies (using DO blocks since PostgreSQL doesn't support IF NOT EXISTS for policies)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Users can view announcements from their college'
    ) THEN
        CREATE POLICY "Users can view announcements from their college" 
        ON announcements FOR SELECT 
        USING (
            college_id IN (
                SELECT college_id FROM users WHERE id = auth.uid()
            ) AND is_published = TRUE
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Admins and faculty can create announcements'
    ) THEN
        CREATE POLICY "Admins and faculty can create announcements" 
        ON announcements FOR INSERT 
        WITH CHECK (
            created_by = auth.uid() AND
            college_id IN (
                SELECT college_id FROM users WHERE id = auth.uid()
            )
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Creators and admins can update announcements'
    ) THEN
        CREATE POLICY "Creators and admins can update announcements" 
        ON announcements FOR UPDATE 
        USING (
            created_by = auth.uid() OR
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND college_id = announcements.college_id 
                AND role IN ('super_admin', 'college_admin', 'admin')
            )
        );
    END IF;
END $$;

-- Submission grades policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'submission_question_grades' AND policyname = 'Faculty can view and create grades'
    ) THEN
        CREATE POLICY "Faculty can view and create grades" 
        ON submission_question_grades FOR ALL 
        USING (
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role IN ('super_admin', 'college_admin', 'admin', 'faculty')
            )
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'submission_question_grades' AND policyname = 'Students can view their own grades'
    ) THEN
        CREATE POLICY "Students can view their own grades" 
        ON submission_question_grades FOR SELECT 
        USING (
            EXISTS (
                SELECT 1 FROM assignment_submissions s
                WHERE s.id = submission_question_grades.submission_id
                AND s.student_id = auth.uid()
            )
        );
    END IF;
END $$;

-- ============================================================================
-- PART 7: DOCUMENTATION COMMENTS
-- ============================================================================

COMMENT ON COLUMN notifications.content_type IS 'Type of content: timetable, assignment, announcement, event';
COMMENT ON COLUMN notifications.content_id IS 'UUID of the related content item';
COMMENT ON COLUMN notifications.priority IS 'Priority level: low, normal, high, urgent';
COMMENT ON COLUMN notifications.action_url IS 'URL to navigate to when notification is clicked';
COMMENT ON COLUMN notifications.expires_at IS 'When the notification should auto-expire';

COMMENT ON TABLE announcements IS 'College-wide, department, or batch-specific announcements';
COMMENT ON COLUMN announcements.target_type IS 'Scope of announcement: batch, department, or college';
COMMENT ON COLUMN announcements.target_id IS 'ID of the target (batch_id, department_id, or college_id)';

COMMENT ON TABLE submission_question_grades IS 'Individual question grades for assignment submissions';

-- ============================================================================
-- PART 8: HELPER FUNCTION FOR NOTIFICATION CLEANUP
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_notifications IS 'Deletes notifications that have passed their expiration date';

-- ============================================================================
-- PART 9: SCHEDULED JOB FOR NOTIFICATION CLEANUP (Optional)
-- Uncomment if using pg_cron extension
-- ============================================================================

-- SELECT cron.schedule('cleanup-expired-notifications', '0 2 * * *', 
--     'SELECT cleanup_expired_notifications();');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verification queries (for testing)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'notifications' ORDER BY ordinal_position;

-- SELECT unnest(enum_range(NULL::notification_type)) as notification_types;
