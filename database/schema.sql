-- ============================================================================
-- ACADEMIC COMPASS DATABASE SCHEMA
-- Supabase PostgreSQL Database Schema
-- 
-- This schema supports a comprehensive academic timetabling system with:
-- - Multi-role user management (Admin, Faculty, Students)
-- - Department and subject management
-- - Timetable creation and approval workflow
-- - Faculty preferences and constraints
-- - Audit logging for accountability
-- ============================================================================

-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================================
-- 1. ENUM TYPE DEFINITIONS
-- These custom types ensure data consistency across the application.
-- ============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'faculty', 'student');
CREATE TYPE faculty_role AS ENUM ('creator', 'publisher', 'general');
CREATE TYPE timetable_status AS ENUM ('draft', 'pending_approval', 'published', 'rejected');
CREATE TYPE day_of_week AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');

-- ============================================================================
-- 2. CORE & ACADEMIC MASTER TABLES
-- These tables store the foundational data for the college.
-- ============================================================================

-- Stores all departments in the college
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    head_of_department UUID, -- Will be linked after users table is created
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- The central table for all users, regardless of role
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    college_uid VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Stored as a secure hash, never plain text
    phone VARCHAR(20),
    profile_image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    department_id UUID REFERENCES departments(id) ON DELETE RESTRICT, -- Connects user to a department
    role user_role NOT NULL,
    faculty_type faculty_role, -- Specific role for faculty, NULL for others
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    CONSTRAINT faculty_type_for_faculty_only CHECK (
        (role = 'faculty' AND faculty_type IS NOT NULL) OR 
        (role != 'faculty' AND faculty_type IS NULL)
    )
);

-- Add foreign key constraint for department head after users table is created
ALTER TABLE departments 
ADD CONSTRAINT fk_head_of_department 
FOREIGN KEY (head_of_department) REFERENCES users(id) ON DELETE SET NULL;

-- Stores all available subjects, linked to departments
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    credits INT NOT NULL CHECK (credits > 0),
    description TEXT,
    is_elective BOOLEAN NOT NULL DEFAULT FALSE,
    prerequisites TEXT[], -- Array of prerequisite subject codes
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(department_id, code)
);

-- Stores all available classrooms and labs
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    building VARCHAR(100),
    floor_number INT,
    capacity INT NOT NULL CHECK (capacity > 0),
    type VARCHAR(50) NOT NULL CHECK (type IN ('Lecture Hall', 'Lab', 'Seminar Room', 'Tutorial Room', 'Auditorium')),
    facilities TEXT[], -- Array of facilities like 'Projector', 'AC', 'Whiteboard'
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores student groups, like '3rd Sem Section A'
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    academic_year VARCHAR(10) NOT NULL, -- e.g., '2025-26'
    student_count INT DEFAULT 0 CHECK (student_count >= 0),
    class_coordinator UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(department_id, semester, academic_year, name)
);

-- ============================================================================
-- 3. LINKING & PREFERENCE TABLES
-- These tables create many-to-many relationships and store complex data.
-- ============================================================================

-- Defines which subjects a faculty member is qualified to teach
CREATE TABLE faculty_teaching_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(20) DEFAULT 'intermediate' CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    is_preferred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(faculty_id, subject_id)
);

-- Defines the curriculum (subjects and workload) for a specific batch
CREATE TABLE batch_curriculum (
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    lectures_per_week INT NOT NULL DEFAULT 3 CHECK (lectures_per_week > 0),
    tutorial_hours_per_week INT DEFAULT 0 CHECK (tutorial_hours_per_week >= 0),
    lab_hours_per_week INT DEFAULT 0 CHECK (lab_hours_per_week >= 0),
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (batch_id, subject_id)
);

-- Stores faculty preferences, a key input for the optimization algorithm
CREATE TABLE faculty_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_days day_of_week[], -- An array of preferred days, e.g., ARRAY['Monday', 'Tuesday']
    avoid_days day_of_week[], -- Days faculty wants to avoid
    preferred_time_start TIME DEFAULT '09:00:00',
    preferred_time_end TIME DEFAULT '17:00:00',
    max_hours_per_day INT DEFAULT 6 CHECK (max_hours_per_day > 0),
    max_continuous_hours INT DEFAULT 3 CHECK (max_continuous_hours > 0),
    avoid_time_start TIME, -- Start time to avoid (single range for simplicity)
    avoid_time_end TIME,   -- End time to avoid
    preferred_classrooms UUID[], -- Array of classroom IDs faculty prefers
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(faculty_id)
);

-- ============================================================================
-- 4. TIMETABLING & AUDIT SYSTEM
-- These tables manage the creation, structure, and history of timetables.
-- ============================================================================

-- Represents a complete timetable for a specific batch and academic year
CREATE TABLE timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    academic_year VARCHAR(10) NOT NULL,
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    status timetable_status NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    version INT NOT NULL DEFAULT 1,
    comments TEXT,
    effective_from DATE,
    effective_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    
    -- Ensures only one timetable can be published for a batch in a given year
    CONSTRAINT unique_published_timetable 
        EXCLUDE USING gist (batch_id WITH =, academic_year WITH =) 
        WHERE (status = 'published')
);

-- Represents a single class/slot within a timetable
CREATE TABLE timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id),
    faculty_id UUID NOT NULL REFERENCES users(id),
    classroom_id UUID NOT NULL REFERENCES classrooms(id),
    day day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_type VARCHAR(20) DEFAULT 'lecture' CHECK (slot_type IN ('lecture', 'tutorial', 'lab', 'exam')),
    is_recurring BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT end_time_after_start_time CHECK (end_time > start_time),
    CONSTRAINT valid_time_duration CHECK (EXTRACT(EPOCH FROM (end_time - start_time))/3600 <= 4), -- Max 4 hours
    
    -- Prevent double booking of classrooms using time as minutes from midnight
    CONSTRAINT no_classroom_conflict 
        EXCLUDE USING gist (
            classroom_id WITH =, 
            day WITH =, 
            int4range(
                EXTRACT(HOUR FROM start_time)::int * 60 + EXTRACT(MINUTE FROM start_time)::int,
                EXTRACT(HOUR FROM end_time)::int * 60 + EXTRACT(MINUTE FROM end_time)::int,
                '[)'
            ) WITH &&
        ),
    
    -- Prevent faculty double booking using time as minutes from midnight
    CONSTRAINT no_faculty_conflict 
        EXCLUDE USING gist (
            faculty_id WITH =, 
            day WITH =, 
            int4range(
                EXTRACT(HOUR FROM start_time)::int * 60 + EXTRACT(MINUTE FROM start_time)::int,
                EXTRACT(HOUR FROM end_time)::int * 60 + EXTRACT(MINUTE FROM end_time)::int,
                '[)'
            ) WITH &&
        )
);

-- ============================================================================
-- 5. STUDENT ENROLLMENT & ATTENDANCE (Optional - for future features)
-- ============================================================================

-- Links students to batches (many-to-many for flexibility)
CREATE TABLE student_batch_enrollment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, batch_id)
    -- Note: Student role validation will be handled at application level
    -- as CHECK constraints cannot use subqueries in PostgreSQL
);

-- ============================================================================
-- 6. AUDIT & LOGGING SYSTEM
-- ============================================================================

-- A table to log important actions for accountability and history
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL, -- e.g., 'TIMETABLE_APPROVED', 'USER_ROLE_CHANGED'
    entity_type VARCHAR(100), -- e.g., 'timetable', 'user', 'subject'
    entity_id UUID, -- ID of the affected entity
    old_values JSONB, -- Previous state (for updates)
    new_values JSONB, -- New state (for creates/updates)
    details JSONB, -- Store contextual information
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_college_uid ON users(college_uid);
CREATE INDEX idx_users_department_role ON users(department_id, role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Subjects table indexes
CREATE INDEX idx_subjects_department ON subjects(department_id);
CREATE INDEX idx_subjects_code ON subjects(code);
CREATE INDEX idx_subjects_is_active ON subjects(is_active);

-- Timetables table indexes
CREATE INDEX idx_timetables_batch_year ON timetables(batch_id, academic_year);
CREATE INDEX idx_timetables_status ON timetables(status);
CREATE INDEX idx_timetables_created_by ON timetables(created_by);

-- Timetable slots indexes
CREATE INDEX idx_timetable_slots_timetable ON timetable_slots(timetable_id);
CREATE INDEX idx_timetable_slots_faculty ON timetable_slots(faculty_id);
CREATE INDEX idx_timetable_slots_classroom ON timetable_slots(classroom_id);
CREATE INDEX idx_timetable_slots_day_time ON timetable_slots(day, start_time, end_time);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS for sensitive tables when using Supabase Auth
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (to be customized based on your authentication setup)
-- Example policies - adjust based on your specific requirements

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Users can update their own basic info
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Admins can manage all users
CREATE POLICY "Admins can manage users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Faculty can view their own preferences
CREATE POLICY "Faculty can manage own preferences" ON faculty_preferences
    FOR ALL USING (auth.uid()::text = faculty_id::text);

-- ============================================================================
-- 9. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batch_curriculum_updated_at BEFORE UPDATE ON batch_curriculum
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faculty_preferences_updated_at BEFORE UPDATE ON faculty_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timetables_updated_at BEFORE UPDATE ON timetables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timetable_slots_updated_at BEFORE UPDATE ON timetable_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log important changes
CREATE OR REPLACE FUNCTION log_audit_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log for important tables and operations
    IF TG_TABLE_NAME IN ('users', 'timetables', 'timetable_slots') THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            entity_type,
            entity_id,
            old_values,
            new_values,
            created_at
        ) VALUES (
            COALESCE(auth.uid(), NULL),
            TG_OP || '_' || TG_TABLE_NAME,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) 
                 WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW)
                 ELSE NULL END,
            NOW()
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Apply audit triggers
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_timetables AFTER INSERT OR UPDATE OR DELETE ON timetables
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ============================================================================
-- 10. SAMPLE DATA INSERTION (Optional - for development/testing)
-- ============================================================================

-- Insert sample departments
INSERT INTO departments (name, code, description) VALUES
    ('Computer Science & Engineering', 'CSE', 'Department of Computer Science and Engineering'),
    ('Information Technology', 'IT', 'Department of Information Technology'),
    ('Electronics & Communication Engineering', 'ECE', 'Department of Electronics and Communication Engineering'),
    ('Mechanical Engineering', 'ME', 'Department of Mechanical Engineering'),
    ('Civil Engineering', 'CE', 'Department of Civil Engineering'),
    ('Electrical Engineering', 'EE', 'Department of Electrical Engineering'),
    ('Mathematics', 'MATH', 'Department of Mathematics'),
    ('Physics', 'PHY', 'Department of Physics'),
    ('Chemistry', 'CHEM', 'Department of Chemistry'),
    ('Management Studies', 'MS', 'Department of Management Studies');

-- Insert sample classrooms
INSERT INTO classrooms (name, building, floor_number, capacity, type, facilities) VALUES
    ('Room 101', 'Academic Block A', 1, 60, 'Lecture Hall', ARRAY['Projector', 'AC', 'Whiteboard']),
    ('Room 102', 'Academic Block A', 1, 40, 'Tutorial Room', ARRAY['Whiteboard', 'AC']),
    ('Lab 201', 'Academic Block B', 2, 30, 'Lab', ARRAY['Computers', 'Projector', 'AC']),
    ('Room 301', 'Academic Block C', 3, 80, 'Lecture Hall', ARRAY['Projector', 'AC', 'Audio System']),
    ('Seminar Hall', 'Academic Block A', 2, 100, 'Seminar Room', ARRAY['Projector', 'AC', 'Audio System', 'Microphone']);

-- Note: Sample users, subjects, and other data should be inserted carefully
-- considering the constraints and relationships defined above.

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Summary of tables created:
-- 1. departments (10 rows - sample data)
-- 2. users (with RLS enabled)
-- 3. subjects
-- 4. classrooms (5 rows - sample data)
-- 5. batches
-- 6. faculty_teaching_subjects
-- 7. batch_curriculum
-- 8. faculty_preferences (with RLS enabled)
-- 9. timetables (with RLS enabled)
-- 10. timetable_slots
-- 11. student_batch_enrollment
-- 12. audit_logs (with RLS enabled)
--
-- Features included:
-- - Comprehensive constraints and validation
-- - Optimized indexes for performance
-- - Row Level Security policies
-- - Automated triggers for timestamps and audit logging
-- - Conflict prevention for timetable scheduling
-- - Sample data for development/testing