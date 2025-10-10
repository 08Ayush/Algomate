-- ============================================================================
-- PYGRAM 2025 - COMPLETE PRODUCTION SCHEMA WITH PERMISSIONS
-- Complete Database Schema for Hybrid CP-SAT + Genetic Algorithm
-- WITH PROPER PERMISSIONS FOR SUPABASE
-- ============================================================================

-- ============================================================================
-- STEP 1: CLEAN UP EXISTING SCHEMA (IF NEEDED)
-- ============================================================================

-- Drop existing tables if they exist (uncomment if you need to reset)
-- DROP SCHEMA IF EXISTS public CASCADE;
-- CREATE SCHEMA public;

-- Grant basic permissions on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT CREATE ON SCHEMA public TO service_role;

-- ============================================================================
-- STEP 2: ENABLE REQUIRED EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================================
-- STEP 3: ENUM TYPE DEFINITIONS
-- ============================================================================

DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('admin', 'faculty', 'student', 'hod');

DROP TYPE IF EXISTS faculty_role CASCADE;
CREATE TYPE faculty_role AS ENUM ('creator', 'publisher', 'general', 'guest');

DROP TYPE IF EXISTS timetable_status CASCADE;
CREATE TYPE timetable_status AS ENUM ('draft', 'generating', 'optimizing', 'pending_approval', 'published', 'rejected');

DROP TYPE IF EXISTS day_of_week CASCADE;
CREATE TYPE day_of_week AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');

DROP TYPE IF EXISTS subject_type CASCADE;
CREATE TYPE subject_type AS ENUM ('THEORY', 'LAB', 'PRACTICAL', 'TUTORIAL');

DROP TYPE IF EXISTS algorithm_phase CASCADE;
CREATE TYPE algorithm_phase AS ENUM ('INITIALIZING', 'CP_SAT', 'GA', 'FINALIZING', 'COMPLETED', 'FAILED');

DROP TYPE IF EXISTS generation_task_status CASCADE;
CREATE TYPE generation_task_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- ============================================================================
-- STEP 4: CORE ACADEMIC TABLES
-- ============================================================================

-- Departments table
DROP TABLE IF EXISTS departments CASCADE;
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    head_of_department UUID,
    
    -- Algorithm-specific department constraints
    max_hours_per_day INT DEFAULT 8 CHECK (max_hours_per_day BETWEEN 1 AND 12),
    working_days day_of_week[] DEFAULT ARRAY['Monday'::day_of_week, 'Tuesday'::day_of_week, 'Wednesday'::day_of_week, 'Thursday'::day_of_week, 'Friday'::day_of_week],
    default_class_duration INT DEFAULT 60 CHECK (default_class_duration BETWEEN 30 AND 180),
    algorithm_priority INT DEFAULT 5 CHECK (algorithm_priority BETWEEN 1 AND 10),
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    college_uid VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    profile_image_url TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE RESTRICT,
    role user_role NOT NULL,
    faculty_type faculty_role,
    
    -- Algorithm requirements
    max_hours_per_day INT DEFAULT 6 CHECK (max_hours_per_day BETWEEN 1 AND 12),
    max_hours_per_week INT DEFAULT 30 CHECK (max_hours_per_week BETWEEN 1 AND 60),
    min_hours_per_week INT DEFAULT 10 CHECK (min_hours_per_week >= 0),
    faculty_priority INT DEFAULT 5 CHECK (faculty_priority BETWEEN 1 AND 10),
    algorithm_weight DECIMAL(3,2) DEFAULT 1.0 CHECK (algorithm_weight BETWEEN 0.1 AND 3.0),
    
    preferred_days day_of_week[] DEFAULT ARRAY['Monday'::day_of_week, 'Tuesday'::day_of_week, 'Wednesday'::day_of_week, 'Thursday'::day_of_week, 'Friday'::day_of_week],
    avoid_days day_of_week[] DEFAULT ARRAY[]::day_of_week[],
    preferred_time_start TIME DEFAULT '09:00:00',
    preferred_time_end TIME DEFAULT '17:00:00',
    unavailable_slots JSONB DEFAULT '{}'::JSONB,
    
    is_shared_faculty BOOLEAN DEFAULT FALSE,
    is_guest_faculty BOOLEAN DEFAULT FALSE,
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    CONSTRAINT faculty_type_consistency CHECK (
        (role = 'faculty' AND faculty_type IS NOT NULL) OR 
        (role != 'faculty' AND faculty_type IS NULL)
    ),
    CONSTRAINT valid_hour_constraints CHECK (min_hours_per_week <= max_hours_per_week),
    CONSTRAINT valid_time_preferences CHECK (preferred_time_start < preferred_time_end)
);

-- Add foreign key constraint for department head
ALTER TABLE departments 
ADD CONSTRAINT fk_head_of_department 
FOREIGN KEY (head_of_department) REFERENCES users(id) ON DELETE SET NULL;

-- Subjects table
DROP TABLE IF EXISTS subjects CASCADE;
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    
    credits_per_week INT NOT NULL CHECK (credits_per_week BETWEEN 1 AND 10),
    subject_type subject_type NOT NULL DEFAULT 'THEORY',
    preferred_duration INT DEFAULT 60 CHECK (preferred_duration BETWEEN 30 AND 180),
    max_continuous_hours INT DEFAULT 2 CHECK (max_continuous_hours BETWEEN 1 AND 4),
    
    requires_lab BOOLEAN DEFAULT FALSE,
    requires_projector BOOLEAN DEFAULT FALSE,
    requires_special_room BOOLEAN DEFAULT FALSE,
    is_intensive_subject BOOLEAN DEFAULT FALSE,
    min_gap_hours INT DEFAULT 0 CHECK (min_gap_hours BETWEEN 0 AND 8),
    algorithm_complexity INT DEFAULT 5 CHECK (algorithm_complexity BETWEEN 1 AND 10),
    
    is_core_subject BOOLEAN DEFAULT TRUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(department_id, code)
);

-- Classrooms table
DROP TABLE IF EXISTS classrooms CASCADE;
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    building VARCHAR(100),
    floor_number INT,
    capacity INT NOT NULL CHECK (capacity BETWEEN 1 AND 500),
    type VARCHAR(50) NOT NULL CHECK (type IN ('Lecture Hall', 'Lab', 'Seminar Room', 'Tutorial Room', 'Auditorium')),
    
    has_projector BOOLEAN DEFAULT FALSE,
    has_ac BOOLEAN DEFAULT FALSE,
    has_computers BOOLEAN DEFAULT FALSE,
    has_lab_equipment BOOLEAN DEFAULT FALSE,
    is_smart_classroom BOOLEAN DEFAULT FALSE,
    
    classroom_priority INT DEFAULT 5 CHECK (classroom_priority BETWEEN 1 AND 10),
    booking_weight DECIMAL(3,2) DEFAULT 1.0 CHECK (booking_weight BETWEEN 0.1 AND 3.0),
    
    facilities TEXT[] DEFAULT ARRAY[]::TEXT[],
    location_notes TEXT,
    
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batches table
DROP TABLE IF EXISTS batches CASCADE;
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    academic_year VARCHAR(10) NOT NULL,
    
    expected_strength INT DEFAULT 60 CHECK (expected_strength BETWEEN 1 AND 200),
    actual_strength INT DEFAULT 0 CHECK (actual_strength >= 0),
    max_hours_per_day INT DEFAULT 6 CHECK (max_hours_per_day BETWEEN 1 AND 10),
    
    preferred_start_time TIME DEFAULT '09:00:00',
    preferred_end_time TIME DEFAULT '16:00:00',
    batch_priority INT DEFAULT 5 CHECK (batch_priority BETWEEN 1 AND 10),
    scheduling_flexibility INT DEFAULT 5 CHECK (scheduling_flexibility BETWEEN 1 AND 10),
    
    class_coordinator UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(department_id, semester, academic_year, name),
    CONSTRAINT valid_batch_times CHECK (preferred_start_time < preferred_end_time),
    CONSTRAINT valid_strength CHECK (actual_strength <= expected_strength + 10)
);

-- Time slots table
DROP TABLE IF EXISTS time_slots CASCADE;
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    duration_minutes INT GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60
    ) STORED,
    
    slot_name VARCHAR(50),
    is_break_time BOOLEAN DEFAULT FALSE,
    is_lunch_time BOOLEAN DEFAULT FALSE,
    is_exam_slot BOOLEAN DEFAULT FALSE,
    
    preference_score INT DEFAULT 5 CHECK (preference_score BETWEEN 1 AND 10),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_time_slot CHECK (end_time > start_time),
    CONSTRAINT reasonable_duration CHECK (
        CASE 
            WHEN is_break_time = TRUE OR is_lunch_time = TRUE THEN
                EXTRACT(EPOCH FROM (end_time - start_time)) / 60 BETWEEN 5 AND 60
            ELSE
                EXTRACT(EPOCH FROM (end_time - start_time)) / 60 BETWEEN 30 AND 240
        END
    ),
    UNIQUE(day, start_time, end_time)
);

-- Faculty qualified subjects table
DROP TABLE IF EXISTS faculty_qualified_subjects CASCADE;
CREATE TABLE faculty_qualified_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    
    proficiency_level INT DEFAULT 7 CHECK (proficiency_level BETWEEN 1 AND 10),
    preference_score INT DEFAULT 5 CHECK (preference_score BETWEEN 1 AND 10),
    teaching_load_weight DECIMAL(3,2) DEFAULT 1.0 CHECK (teaching_load_weight BETWEEN 0.1 AND 3.0),
    
    is_primary_teacher BOOLEAN DEFAULT FALSE,
    can_handle_lab BOOLEAN DEFAULT TRUE,
    can_handle_tutorial BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(faculty_id, subject_id)
);

-- Faculty availability table
DROP TABLE IF EXISTS faculty_availability CASCADE;
CREATE TABLE faculty_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    availability_type VARCHAR(20) DEFAULT 'available' CHECK (
        availability_type IN ('available', 'unavailable', 'preferred', 'avoid')
    ),
    
    preference_weight DECIMAL(3,2) DEFAULT 1.0 CHECK (preference_weight BETWEEN 0.1 AND 2.0),
    
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(faculty_id, time_slot_id)
);

-- Batch subjects table
DROP TABLE IF EXISTS batch_subjects CASCADE;
CREATE TABLE batch_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    
    required_hours_per_week INT NOT NULL CHECK (required_hours_per_week BETWEEN 1 AND 20),
    assigned_faculty_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    priority_level INT DEFAULT 5 CHECK (priority_level BETWEEN 1 AND 10),
    scheduling_flexibility INT DEFAULT 5 CHECK (scheduling_flexibility BETWEEN 1 AND 10),
    can_split_sessions BOOLEAN DEFAULT TRUE,
    
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(batch_id, subject_id)
);

-- Constraint rules table
DROP TABLE IF EXISTS constraint_rules CASCADE;
CREATE TABLE constraint_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('HARD', 'SOFT', 'PREFERENCE')),
    description TEXT,
    
    rule_parameters JSONB NOT NULL DEFAULT '{}'::JSONB,
    weight DECIMAL(8,2) DEFAULT 1.0 CHECK (weight >= 0),
    
    applies_to_departments UUID[] DEFAULT ARRAY[]::UUID[],
    applies_to_subjects UUID[] DEFAULT ARRAY[]::UUID[],
    applies_to_faculty UUID[] DEFAULT ARRAY[]::UUID[],
    applies_to_batches UUID[] DEFAULT ARRAY[]::UUID[],
    
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student batch enrollment table
DROP TABLE IF EXISTS student_batch_enrollment CASCADE;
CREATE TABLE student_batch_enrollment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, batch_id)
);

-- Audit logs table
DROP TABLE IF EXISTS audit_logs CASCADE;
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    algorithm_context JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 5: DISABLE ROW LEVEL SECURITY FOR ALL TABLES
-- ============================================================================

ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_qualified_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE batch_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE constraint_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_batch_enrollment DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: GRANT COMPREHENSIVE PERMISSIONS
-- ============================================================================

-- Grant permissions on all tables to anon (for registration/login)
GRANT SELECT ON departments TO anon;
GRANT SELECT, INSERT ON users TO anon;
GRANT SELECT ON subjects TO anon;
GRANT SELECT ON classrooms TO anon;
GRANT SELECT ON batches TO anon;
GRANT SELECT ON time_slots TO anon;

-- Grant permissions on all tables to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions on all tables to service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant usage on all sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- STEP 7: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_users_faculty_active ON users(role, is_active) WHERE role = 'faculty';
CREATE INDEX idx_users_department_role ON users(department_id, role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_college_uid ON users(college_uid);

CREATE INDEX idx_subjects_department_active ON subjects(department_id, is_active);
CREATE INDEX idx_classrooms_capacity_features ON classrooms(capacity, has_projector, has_lab_equipment, is_available);
CREATE INDEX idx_batches_department_semester ON batches(department_id, semester, academic_year, is_active);

CREATE INDEX idx_time_slots_algorithm ON time_slots(day, start_time, is_active) WHERE NOT is_break_time;
CREATE INDEX idx_faculty_qualifications_lookup ON faculty_qualified_subjects(faculty_id, subject_id, proficiency_level);
CREATE INDEX idx_faculty_availability_lookup ON faculty_availability(faculty_id, time_slot_id, is_available);
CREATE INDEX idx_batch_subjects_requirements ON batch_subjects(batch_id, subject_id, required_hours_per_week);

-- ============================================================================
-- STEP 8: CREATE SAMPLE DATA
-- ============================================================================

-- Sample departments
INSERT INTO departments (name, code, description, max_hours_per_day, working_days, default_class_duration, algorithm_priority) VALUES
    ('Computer Science & Engineering', 'CSE', 'Department of Computer Science and Engineering', 8, ARRAY['Monday'::day_of_week, 'Tuesday'::day_of_week, 'Wednesday'::day_of_week, 'Thursday'::day_of_week, 'Friday'::day_of_week], 60, 9),
    ('Information Technology', 'IT', 'Department of Information Technology', 8, ARRAY['Monday'::day_of_week, 'Tuesday'::day_of_week, 'Wednesday'::day_of_week, 'Thursday'::day_of_week, 'Friday'::day_of_week], 60, 8),
    ('Electronics & Communication Engineering', 'ECE', 'Department of Electronics & Communication Engineering', 8, ARRAY['Monday'::day_of_week, 'Tuesday'::day_of_week, 'Wednesday'::day_of_week, 'Thursday'::day_of_week, 'Friday'::day_of_week], 60, 8),
    ('Mechanical Engineering', 'ME', 'Department of Mechanical Engineering', 8, ARRAY['Monday'::day_of_week, 'Tuesday'::day_of_week, 'Wednesday'::day_of_week, 'Thursday'::day_of_week, 'Friday'::day_of_week], 60, 7),
    ('Civil Engineering', 'CE', 'Department of Civil Engineering', 8, ARRAY['Monday'::day_of_week, 'Tuesday'::day_of_week, 'Wednesday'::day_of_week, 'Thursday'::day_of_week, 'Friday'::day_of_week], 60, 7),
    ('Electrical Engineering', 'EE', 'Department of Electrical Engineering', 8, ARRAY['Monday'::day_of_week, 'Tuesday'::day_of_week, 'Wednesday'::day_of_week, 'Thursday'::day_of_week, 'Friday'::day_of_week], 60, 7),
    ('Chemical Engineering', 'CHE', 'Department of Chemical Engineering', 8, ARRAY['Monday'::day_of_week, 'Tuesday'::day_of_week, 'Wednesday'::day_of_week, 'Thursday'::day_of_week, 'Friday'::day_of_week], 60, 6),
    ('Biotechnology', 'BT', 'Department of Biotechnology', 8, ARRAY['Monday'::day_of_week, 'Tuesday'::day_of_week, 'Wednesday'::day_of_week, 'Thursday'::day_of_week, 'Friday'::day_of_week], 60, 6),
    ('Mathematics', 'MATH', 'Department of Mathematics', 8, ARRAY['Monday'::day_of_week, 'Tuesday'::day_of_week, 'Wednesday'::day_of_week, 'Thursday'::day_of_week, 'Friday'::day_of_week], 60, 5),
    ('Physics', 'PHY', 'Department of Physics', 8, ARRAY['Monday'::day_of_week, 'Tuesday'::day_of_week, 'Wednesday'::day_of_week, 'Thursday'::day_of_week, 'Friday'::day_of_week], 60, 5),
    ('Chemistry', 'CHEM', 'Department of Chemistry', 8, ARRAY['Monday'::day_of_week, 'Tuesday'::day_of_week, 'Wednesday'::day_of_week, 'Thursday'::day_of_week, 'Friday'::day_of_week], 60, 5),
    ('Business Administration', 'MBA', 'Department of Business Administration', 8, ARRAY['Monday'::day_of_week, 'Tuesday'::day_of_week, 'Wednesday'::day_of_week, 'Thursday'::day_of_week, 'Friday'::day_of_week], 60, 4)
ON CONFLICT (name) DO NOTHING;

-- Sample time slots
INSERT INTO time_slots (day, start_time, end_time, slot_name, is_break_time, preference_score) VALUES
    ('Monday'::day_of_week, '09:00:00', '10:00:00', 'Period 1', FALSE, 8),
    ('Monday'::day_of_week, '10:00:00', '11:00:00', 'Period 2', FALSE, 8),
    ('Monday'::day_of_week, '11:00:00', '11:30:00', 'Tea Break', TRUE, 5),
    ('Monday'::day_of_week, '11:30:00', '12:30:00', 'Period 3', FALSE, 7),
    ('Monday'::day_of_week, '12:30:00', '13:30:00', 'Lunch Break', TRUE, 3),
    ('Monday'::day_of_week, '13:30:00', '14:30:00', 'Period 4', FALSE, 6),
    ('Monday'::day_of_week, '14:30:00', '15:30:00', 'Period 5', FALSE, 6),
    ('Monday'::day_of_week, '15:30:00', '16:30:00', 'Period 6', FALSE, 5),
    ('Tuesday'::day_of_week, '09:00:00', '10:00:00', 'Period 1', FALSE, 8),
    ('Tuesday'::day_of_week, '10:00:00', '11:00:00', 'Period 2', FALSE, 8),
    ('Tuesday'::day_of_week, '11:00:00', '11:30:00', 'Tea Break', TRUE, 5),
    ('Tuesday'::day_of_week, '11:30:00', '12:30:00', 'Period 3', FALSE, 7),
    ('Tuesday'::day_of_week, '12:30:00', '13:30:00', 'Lunch Break', TRUE, 3),
    ('Tuesday'::day_of_week, '13:30:00', '14:30:00', 'Period 4', FALSE, 6),
    ('Tuesday'::day_of_week, '14:30:00', '15:30:00', 'Period 5', FALSE, 6),
    ('Tuesday'::day_of_week, '15:30:00', '16:30:00', 'Period 6', FALSE, 5),
    ('Wednesday'::day_of_week, '09:00:00', '10:00:00', 'Period 1', FALSE, 8),
    ('Wednesday'::day_of_week, '10:00:00', '11:00:00', 'Period 2', FALSE, 8),
    ('Wednesday'::day_of_week, '11:00:00', '11:30:00', 'Tea Break', TRUE, 5),
    ('Wednesday'::day_of_week, '11:30:00', '12:30:00', 'Period 3', FALSE, 7),
    ('Wednesday'::day_of_week, '12:30:00', '13:30:00', 'Lunch Break', TRUE, 3),
    ('Wednesday'::day_of_week, '13:30:00', '14:30:00', 'Period 4', FALSE, 6),
    ('Wednesday'::day_of_week, '14:30:00', '15:30:00', 'Period 5', FALSE, 6),
    ('Wednesday'::day_of_week, '15:30:00', '16:30:00', 'Period 6', FALSE, 5),
    ('Thursday'::day_of_week, '09:00:00', '10:00:00', 'Period 1', FALSE, 8),
    ('Thursday'::day_of_week, '10:00:00', '11:00:00', 'Period 2', FALSE, 8),
    ('Thursday'::day_of_week, '11:00:00', '11:30:00', 'Tea Break', TRUE, 5),
    ('Thursday'::day_of_week, '11:30:00', '12:30:00', 'Period 3', FALSE, 7),
    ('Thursday'::day_of_week, '12:30:00', '13:30:00', 'Lunch Break', TRUE, 3),
    ('Thursday'::day_of_week, '13:30:00', '14:30:00', 'Period 4', FALSE, 6),
    ('Thursday'::day_of_week, '14:30:00', '15:30:00', 'Period 5', FALSE, 6),
    ('Thursday'::day_of_week, '15:30:00', '16:30:00', 'Period 6', FALSE, 5),
    ('Friday'::day_of_week, '09:00:00', '10:00:00', 'Period 1', FALSE, 8),
    ('Friday'::day_of_week, '10:00:00', '11:00:00', 'Period 2', FALSE, 8),
    ('Friday'::day_of_week, '11:00:00', '11:30:00', 'Tea Break', TRUE, 5),
    ('Friday'::day_of_week, '11:30:00', '12:30:00', 'Period 3', FALSE, 7),
    ('Friday'::day_of_week, '12:30:00', '13:30:00', 'Lunch Break', TRUE, 3),
    ('Friday'::day_of_week, '13:30:00', '14:30:00', 'Period 4', FALSE, 6),
    ('Friday'::day_of_week, '14:30:00', '15:30:00', 'Period 5', FALSE, 6),
    ('Friday'::day_of_week, '15:30:00', '16:30:00', 'Period 6', FALSE, 5)
ON CONFLICT (day, start_time, end_time) DO NOTHING;

-- Sample classrooms
INSERT INTO classrooms (name, building, capacity, type, has_projector, has_ac, has_computers, classroom_priority) VALUES
    ('Room A101', 'Academic Block A', 60, 'Lecture Hall', TRUE, TRUE, FALSE, 8),
    ('Room A102', 'Academic Block A', 60, 'Lecture Hall', TRUE, TRUE, FALSE, 8),
    ('Room A103', 'Academic Block A', 40, 'Seminar Room', TRUE, TRUE, FALSE, 7),
    ('Lab B201', 'Academic Block B', 30, 'Lab', TRUE, TRUE, TRUE, 7),
    ('Lab B202', 'Academic Block B', 30, 'Lab', TRUE, TRUE, TRUE, 7),
    ('Lab C301', 'Academic Block C', 30, 'Lab', TRUE, TRUE, TRUE, 6),
    ('Auditorium', 'Main Building', 200, 'Auditorium', TRUE, TRUE, FALSE, 9),
    ('Tutorial Room T1', 'Academic Block A', 25, 'Tutorial Room', TRUE, TRUE, FALSE, 6),
    ('Tutorial Room T2', 'Academic Block A', 25, 'Tutorial Room', TRUE, TRUE, FALSE, 6),
    ('Smart Classroom SC1', 'Academic Block B', 50, 'Lecture Hall', TRUE, TRUE, TRUE, 9)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- STEP 9: FINAL VERIFICATION
-- ============================================================================

-- Verify tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    RAISE NOTICE '==============================================================';
    RAISE NOTICE 'SCHEMA DEPLOYMENT COMPLETE!';
    RAISE NOTICE 'Total tables created: %', table_count;
    RAISE NOTICE 'Expected tables: 12';
    
    IF table_count >= 12 THEN
        RAISE NOTICE 'SUCCESS: All tables created successfully!';
    ELSE
        RAISE NOTICE 'WARNING: Some tables may be missing!';
    END IF;
    
    RAISE NOTICE '==============================================================';
END $$;

-- Test query to verify departments are accessible
SELECT 'Departments available for registration:' as message;
SELECT id, name, code FROM departments WHERE is_active = TRUE ORDER BY name LIMIT 5;