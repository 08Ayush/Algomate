-- ============================================================================
-- Migration: Add Announcements and Submission Grades Tables
-- Date: 2026-02-01
-- Version: 1.0.1
-- Description: Creates announcements table and submission_question_grades table
-- PREREQUISITE: Run add_notification_types.sql first (already applied)
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE ANNOUNCEMENTS TABLE (if not exists)
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
-- PART 2: CREATE SUBMISSION QUESTION GRADES TABLE (if not exists)
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
-- PART 3: CREATE PERFORMANCE INDEXES
-- ============================================================================

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

-- Additional notification indexes (if not already created)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
    ON notifications(recipient_id, is_read) WHERE is_read = FALSE;

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_question_grades ENABLE ROW LEVEL SECURITY;

-- Create policies using DO blocks (PostgreSQL doesn't support IF NOT EXISTS for policies)
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
-- PART 5: HELPER FUNCTION FOR NOTIFICATION CLEANUP
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

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
SELECT 'announcements' as table_name, COUNT(*) as row_count FROM announcements
UNION ALL
SELECT 'submission_question_grades', COUNT(*) FROM submission_question_grades;
