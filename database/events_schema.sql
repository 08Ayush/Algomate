-- ============================================================================
-- EVENTS MANAGEMENT SYSTEM SCHEMA
-- Complete event management with conflict resolution and queue system
-- ============================================================================

-- Create event_type enum if not exists
DO $$ BEGIN
    CREATE TYPE event_type AS ENUM (
        'workshop',
        'seminar',
        'conference',
        'cultural',
        'sports',
        'technical',
        'orientation',
        'examination',
        'meeting',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create event_status enum if not exists
DO $$ BEGIN
    CREATE TYPE event_status AS ENUM (
        'pending',
        'approved',
        'rejected',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type event_type NOT NULL,
    
    -- Organizational
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Date & Time
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Location
    venue VARCHAR(255) NOT NULL,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    
    -- Participants
    expected_participants INTEGER DEFAULT 0,
    max_registrations INTEGER DEFAULT 0,
    current_participants INTEGER DEFAULT 0,
    registration_required BOOLEAN DEFAULT FALSE,
    registration_deadline TIMESTAMP,
    
    -- Budget & Resources
    budget_allocated DECIMAL(15,2) DEFAULT 0,
    
    -- Contact Information
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    
    -- Status & Priority
    status event_status DEFAULT 'pending',
    priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),
    
    -- Visibility & Permissions
    is_public BOOLEAN DEFAULT TRUE,
    
    -- Conflict Management
    has_conflict BOOLEAN DEFAULT FALSE,
    conflicting_events UUID[],
    queue_position INTEGER,
    
    -- Approval Workflow
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (start_date <= end_date),
    CONSTRAINT valid_times CHECK (start_time < end_time),
    CONSTRAINT valid_priority CHECK (priority_level >= 1 AND priority_level <= 5),
    CONSTRAINT valid_participants CHECK (current_participants <= max_registrations)
);

-- Event Registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registration_date TIMESTAMP DEFAULT NOW(),
    attendance_status VARCHAR(50) DEFAULT 'registered',
    feedback TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(event_id, user_id)
);

-- Event Notifications table
CREATE TABLE IF NOT EXISTS event_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_events_department ON events(department_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_venue ON events(venue);
CREATE INDEX IF NOT EXISTS idx_events_conflict ON events(has_conflict, status);
CREATE INDEX IF NOT EXISTS idx_events_queue ON events(queue_position) WHERE queue_position IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user ON event_registrations(user_id);

CREATE INDEX IF NOT EXISTS idx_event_notifications_user ON event_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_event_notifications_event ON event_notifications(event_id);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View for event details with department and creator info
CREATE OR REPLACE VIEW event_details AS
SELECT 
    e.*,
    d.name as department_name,
    d.code as department_code,
    u.first_name || ' ' || u.last_name as created_by_name,
    u.email as creator_email,
    c.name as classroom_name,
    c.capacity as classroom_capacity,
    a.first_name || ' ' || a.last_name as approved_by_name
FROM events e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN users u ON e.created_by = u.id
LEFT JOIN classrooms c ON e.classroom_id = c.id
LEFT JOIN users a ON e.approved_by = a.id;

-- View for conflict detection
CREATE OR REPLACE VIEW event_conflicts AS
SELECT 
    e1.id as event_id,
    e1.title as event_title,
    e1.start_date,
    e1.end_date,
    e1.venue,
    e1.status,
    array_agg(
        json_build_object(
            'id', e2.id,
            'title', e2.title,
            'start_date', e2.start_date,
            'end_date', e2.end_date
        )
    ) as conflicting_events
FROM events e1
JOIN events e2 ON (
    e1.id != e2.id AND
    e1.venue = e2.venue AND
    e2.status = 'approved' AND
    (
        (e1.start_date <= e2.end_date AND e1.end_date >= e2.start_date)
    )
)
GROUP BY e1.id, e1.title, e1.start_date, e1.end_date, e1.venue, e1.status;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically check for conflicts when inserting/updating
CREATE OR REPLACE FUNCTION check_event_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    conflict_count INTEGER;
    conflicting_event_ids UUID[];
BEGIN
    -- Check for conflicts with approved events on same venue and overlapping dates
    SELECT COUNT(*), array_agg(id)
    INTO conflict_count, conflicting_event_ids
    FROM events
    WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
        AND venue = NEW.venue
        AND status = 'approved'
        AND (
            (start_date <= NEW.end_date AND end_date >= NEW.start_date)
        );
    
    IF conflict_count > 0 THEN
        NEW.has_conflict := TRUE;
        NEW.conflicting_events := conflicting_event_ids;
        NEW.queue_position := conflict_count + 1;
        NEW.status := 'pending';
    ELSE
        NEW.has_conflict := FALSE;
        NEW.conflicting_events := NULL;
        NEW.queue_position := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update participant count
CREATE OR REPLACE FUNCTION update_event_participants()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events
        SET current_participants = current_participants + 1
        WHERE id = NEW.event_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE events
        SET current_participants = GREATEST(0, current_participants - 1)
        WHERE id = OLD.event_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to send notifications
CREATE OR REPLACE FUNCTION send_event_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_msg TEXT;
    notification_type VARCHAR(50);
BEGIN
    -- Determine notification type and message based on status change
    IF NEW.status != OLD.status THEN
        CASE NEW.status
            WHEN 'approved' THEN
                notification_type := 'event_approved';
                notification_msg := 'Your event "' || NEW.title || '" has been approved for ' || NEW.start_date || '.';
            WHEN 'rejected' THEN
                notification_type := 'event_rejected';
                notification_msg := 'Your event "' || NEW.title || '" has been rejected. Reason: ' || COALESCE(NEW.rejection_reason, 'Not specified');
            WHEN 'cancelled' THEN
                notification_type := 'event_cancelled';
                notification_msg := 'Event "' || NEW.title || '" scheduled for ' || NEW.start_date || ' has been cancelled.';
            ELSE
                RETURN NEW;
        END CASE;
        
        -- Insert notification for event creator
        INSERT INTO event_notifications (event_id, user_id, notification_type, message)
        VALUES (NEW.id, NEW.created_by, notification_type, notification_msg);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger for conflict checking
DROP TRIGGER IF EXISTS trigger_check_event_conflicts ON events;
CREATE TRIGGER trigger_check_event_conflicts
    BEFORE INSERT OR UPDATE OF start_date, end_date, venue, status
    ON events
    FOR EACH ROW
    EXECUTE FUNCTION check_event_conflicts();

-- Trigger for updating timestamps
DROP TRIGGER IF EXISTS trigger_update_events_timestamp ON events;
CREATE TRIGGER trigger_update_events_timestamp
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for participant count
DROP TRIGGER IF EXISTS trigger_update_event_participants_insert ON event_registrations;
CREATE TRIGGER trigger_update_event_participants_insert
    AFTER INSERT ON event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_event_participants();

DROP TRIGGER IF EXISTS trigger_update_event_participants_delete ON event_registrations;
CREATE TRIGGER trigger_update_event_participants_delete
    AFTER DELETE ON event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_event_participants();

-- Trigger for notifications
DROP TRIGGER IF EXISTS trigger_send_event_notification ON events;
CREATE TRIGGER trigger_send_event_notification
    AFTER UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION send_event_notification();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

/*
-- Insert sample events (uncomment to use)
INSERT INTO events (
    title, description, event_type, department_id, created_by,
    start_date, end_date, start_time, end_time, venue,
    expected_participants, status, priority_level, is_public
) VALUES
    ('AI/ML Workshop', 'Hands-on workshop on Machine Learning fundamentals', 'workshop', 
     (SELECT id FROM departments LIMIT 1), (SELECT id FROM users WHERE role = 'faculty' LIMIT 1),
     '2025-10-15', '2025-10-15', '09:00', '17:00', 'Auditorium',
     200, 'approved', 2, TRUE),
    ('Cultural Night', 'Annual cultural festival', 'cultural',
     (SELECT id FROM departments LIMIT 1), (SELECT id FROM users WHERE role = 'faculty' LIMIT 1),
     '2025-10-20', '2025-10-20', '18:00', '22:00', 'Main Ground',
     500, 'pending', 1, TRUE);
*/

-- ============================================================================
-- PERMISSIONS (RLS - Row Level Security)
-- ============================================================================

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view public events or events from their department
CREATE POLICY events_select_policy ON events
    FOR SELECT
    USING (
        is_public = TRUE
        OR department_id IN (
            SELECT department_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Faculty can create events for their department
CREATE POLICY events_insert_policy ON events
    FOR INSERT
    WITH CHECK (
        created_by = auth.uid()
        AND department_id IN (
            SELECT department_id FROM users WHERE id = auth.uid() AND role IN ('faculty', 'hod', 'admin')
        )
    );

-- Policy: Users can update their own events
CREATE POLICY events_update_policy ON events
    FOR UPDATE
    USING (created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'hod')
    ));

-- Policy: Users can delete their own events
CREATE POLICY events_delete_policy ON events
    FOR DELETE
    USING (created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'hod')
    ));

-- Policy: Users can register for events
CREATE POLICY registrations_insert_policy ON event_registrations
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Policy: Users can view their own registrations
CREATE POLICY registrations_select_policy ON event_registrations
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Users can view their own notifications
CREATE POLICY notifications_select_policy ON event_notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON events TO authenticated;
GRANT ALL ON event_registrations TO authenticated;
GRANT ALL ON event_notifications TO authenticated;

COMMENT ON TABLE events IS 'Stores all college events with conflict detection and queue management';
COMMENT ON TABLE event_registrations IS 'Stores user registrations for events';
COMMENT ON TABLE event_notifications IS 'Stores event-related notifications for users';
