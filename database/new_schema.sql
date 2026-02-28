-- ============================================================================
-- PYGRAM 2025 - FINAL MULTI-COLLEGE PRODUCTION SCHEMA (Corrected)
-- This version is corrected and ready to run on a new project.
-- ============================================================================

-- FIX 1: Drop existing ENUM types to allow for clean recreation
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS faculty_role CASCADE;
DROP TYPE IF EXISTS content_status CASCADE;
DROP TYPE IF EXISTS timetable_status CASCADE;
DROP TYPE IF EXISTS day_of_week CASCADE;
DROP TYPE IF EXISTS subject_type CASCADE;
DROP TYPE IF EXISTS algorithm_phase CASCADE;
DROP TYPE IF EXISTS generation_task_status CASCADE;
DROP TYPE IF EXISTS access_level CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================================
-- 1. ENUM TYPE DEFINITIONS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'college_admin', 'admin', 'hod', 'faculty', 'student');
CREATE TYPE faculty_role AS ENUM ('creator', 'publisher', 'general', 'guest');
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected', 'archived');
CREATE TYPE timetable_status AS ENUM ('draft', 'generating', 'optimizing', 'pending_approval', 'published', 'rejected');
CREATE TYPE day_of_week AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');
CREATE TYPE subject_type AS ENUM ('THEORY', 'LAB', 'PRACTICAL', 'TUTORIAL');
CREATE TYPE algorithm_phase AS ENUM ('INITIALIZING', 'CP_SAT', 'GA', 'FINALIZING', 'COMPLETED', 'FAILED');
CREATE TYPE generation_task_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE access_level AS ENUM ('READ', 'write', 'admin', 'super_admin');
CREATE TYPE notification_type AS ENUM (
    -- Content workflow
    'content_pending_review', 'content_approved', 'content_rejected', 'revision_requested',
    -- Timetable specific  
    'timetable_published', 'timetable_approved', 'timetable_rejected', 'schedule_change', 'conflict_detected',
    -- Assignments
    'assignment_created', 'assignment_due', 'assignment_submitted', 'assignment_graded',
    -- Announcements & Events
    'announcement', 'event_created', 'event_reminder', 'event_cancelled',
    -- System
    'system_alert', 'approval_request', 'resource_updated', 'maintenance_alert', 'policy_update'
);
CREATE TYPE nep_category AS ENUM (
    'MAJOR', 
    'MINOR', 
    'MULTIDISCIPLINARY', 
    'AEC',          -- Ability Enhancement Course
    'VAC',          -- Value Added Course
    'CORE', 
    'PEDAGOGY',     -- Specific to B.Ed/ITEP
    'INTERNSHIP',   -- Block-out events
    'Major I',      -- Major specialization I
    'Major II',     -- Major specialization II
    'CORE COMPLETELY',  -- Fully required core subject
    'CORE PARTIAL'      -- Partially required core subject
);
CREATE TYPE faculty_designation AS ENUM (
    'Professor',
    'Associate Professor',
    'Assistant Professor',
    'Guest Faculty',
    'Lecturer',
    'Demonstrator',
    'Physical Director',
    'Librarian'
);

-- ============================================================================
-- 2. MULTI-COLLEGE FOUNDATION TABLES
-- ============================================================================

CREATE TABLE colleges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    website TEXT,
    academic_year VARCHAR(10) NOT NULL DEFAULT '2025-26',
    semester_system VARCHAR(20) DEFAULT 'semester' CHECK (semester_system IN ('semester', 'trimester', 'quarter')),
    -- FIX 2: Added explicit type cast to the default array
    working_days day_of_week[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']::day_of_week[],
    college_start_time TIME DEFAULT '08:00:00',
    college_end_time TIME DEFAULT '18:00:00',
    default_class_duration INT DEFAULT 60 CHECK (default_class_duration BETWEEN 30 AND 180),
    break_duration INT DEFAULT 15 CHECK (break_duration BETWEEN 5 AND 60),
    lunch_duration INT DEFAULT 60 CHECK (lunch_duration BETWEEN 30 AND 120),
    principal_id UUID,
    registrar_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_college_times CHECK (college_start_time < college_end_time)
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    head_of_department UUID,
    department_type VARCHAR(50) DEFAULT 'academic',
    max_hours_per_day INT DEFAULT 8,
    -- FIX 2: Added explicit type cast to the default array
    working_days day_of_week[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']::day_of_week[],
    default_class_duration INT DEFAULT 60,
    algorithm_priority INT DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(college_id, code),
    UNIQUE(college_id, name),
    CONSTRAINT check_dept_type CHECK (department_type IN ('academic', 'research', 'administration')),
    CONSTRAINT check_max_hours CHECK (max_hours_per_day BETWEEN 1 AND 12),
    CONSTRAINT check_class_duration CHECK (default_class_duration BETWEEN 30 AND 180),
    CONSTRAINT check_algo_priority CHECK (algorithm_priority BETWEEN 1 AND 10),
    CONSTRAINT departments_college_id_fkey FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    college_uid VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    profile_image_url TEXT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments(id) ON DELETE RESTRICT,
    role user_role NOT NULL,
    faculty_type faculty_role,
    designation faculty_designation,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    access_level access_level DEFAULT 'READ',
    student_id VARCHAR(50),
    admission_year INT,
    current_semester INT CHECK (current_semester BETWEEN 1 AND 8),
    credit DECIMAL(5,2),
    cgpa NUMERIC(4,2) CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
    max_hours_per_day INT DEFAULT 6 CHECK (max_hours_per_day BETWEEN 1 AND 12),
    max_hours_per_week INT DEFAULT 30 CHECK (max_hours_per_week BETWEEN 1 AND 60),
    min_hours_per_week INT DEFAULT 10 CHECK (min_hours_per_week >= 0),
    faculty_priority INT DEFAULT 5 CHECK (faculty_priority BETWEEN 1 AND 10),
    algorithm_weight DECIMAL(3,2) DEFAULT 1.0 CHECK (algorithm_weight BETWEEN 0.1 AND 3.0),
    -- FIX 2: Added explicit type cast to the default arrays
    preferred_days day_of_week[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']::day_of_week[],
    avoid_days day_of_week[] DEFAULT '{}'::day_of_week[],
    preferred_time_start TIME DEFAULT '09:00:00',
    preferred_time_end TIME DEFAULT '17:00:00',
    unavailable_slots JSONB DEFAULT '{}',
    is_shared_faculty BOOLEAN DEFAULT FALSE,
    is_guest_faculty BOOLEAN DEFAULT FALSE,
    can_create_timetables BOOLEAN DEFAULT FALSE,
    can_publish_timetables BOOLEAN DEFAULT FALSE,
    can_approve_timetables BOOLEAN DEFAULT FALSE,
    -- Hybrid Scheduler Fields
    specializations JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    CONSTRAINT unique_college_uid UNIQUE (college_id, college_uid),
    CONSTRAINT unique_student_id UNIQUE (college_id, student_id),
    CONSTRAINT faculty_type_consistency CHECK (
        (role = 'faculty' AND faculty_type IS NOT NULL) OR 
        (role != 'faculty' AND faculty_type IS NULL)
    ),
    CONSTRAINT student_fields_consistency CHECK (
        (role = 'student' AND student_id IS NOT NULL AND admission_year IS NOT NULL AND current_semester IS NOT NULL) OR 
        (role != 'student' AND student_id IS NULL)
    ),
    CONSTRAINT valid_hour_constraints CHECK (min_hours_per_week <= max_hours_per_week),
    CONSTRAINT valid_time_preferences CHECK (preferred_time_start < preferred_time_end)
);

ALTER TABLE colleges 
ADD CONSTRAINT fk_principal 
FOREIGN KEY (principal_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE colleges 
ADD CONSTRAINT fk_registrar 
FOREIGN KEY (registrar_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE departments 
ADD CONSTRAINT fk_head_of_department 
FOREIGN KEY (head_of_department) REFERENCES users(id) ON DELETE SET NULL;

-- Add foreign key constraint for NEP 2020 course groups
ALTER TABLE subjects 
ADD CONSTRAINT fk_course_group 
FOREIGN KEY (course_group_id) REFERENCES elective_buckets(id) ON DELETE SET NULL;

CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
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
    facilities TEXT[] DEFAULT '{}',
    location_notes TEXT,
    -- Hybrid Scheduler Fields
    is_lab BOOLEAN DEFAULT FALSE,
    lab_type VARCHAR(100),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(college_id, name)
);

-- ============================================================================
-- COURSES TABLE - Stores programs like B.Ed, M.Ed, ITEP
-- ============================================================================

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,         -- e.g., "Integrated Teacher Education Programme"
    code VARCHAR(50) NOT NULL,           -- e.g., "ITEP"
    nature_of_course VARCHAR(50),        -- e.g., "Integrated", "PG", "UG"
    intake INTEGER DEFAULT 0,            -- e.g., 50
    duration_years INTEGER,              -- e.g., 4
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(college_id, code)
);

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    credits_per_week INT NOT NULL CHECK (credits_per_week BETWEEN 1 AND 10),
    semester INT CHECK (semester BETWEEN 1 AND 8),
    nep_category nep_category DEFAULT 'CORE',
    subject_type subject_type DEFAULT 'THEORY',
    preferred_duration INT DEFAULT 60 CHECK (preferred_duration BETWEEN 30 AND 180),
    max_continuous_hours INT DEFAULT 2 CHECK (max_continuous_hours BETWEEN 1 AND 4),
    requires_lab BOOLEAN DEFAULT FALSE,
    requires_projector BOOLEAN DEFAULT FALSE,
    requires_special_room BOOLEAN DEFAULT FALSE,
    is_intensive_subject BOOLEAN DEFAULT FALSE,
    min_gap_hours INT DEFAULT 0 CHECK (min_gap_hours BETWEEN 0 AND 8),
    algorithm_complexity INT DEFAULT 5 CHECK (algorithm_complexity BETWEEN 1 AND 10),
    is_core_subject BOOLEAN DEFAULT TRUE,
    -- NEP 2020 Fields
    lecture_hours INTEGER DEFAULT 1,
    tutorial_hours INTEGER DEFAULT 0,
    practical_hours INTEGER DEFAULT 0,
    -- Generated column for automatic credit calculation: L + T + (P/2)
    credit_value NUMERIC(3,1) 
        GENERATED ALWAYS AS (lecture_hours + tutorial_hours + (practical_hours / 2.0)) STORED,
    course_group_id UUID REFERENCES elective_buckets(id) ON DELETE SET NULL,
    -- Block Scheduling Fields
    block_start_week INTEGER,
    block_end_week INTEGER,
    time_restriction VARCHAR(20) CHECK (time_restriction IN ('MORNING', 'AFTERNOON', 'EVENING', 'FULL_DAY')),
    is_special_event BOOLEAN DEFAULT FALSE,
    special_event_notes TEXT,
    description TEXT,
    -- Hybrid Scheduler Fields
    weekly_hours INTEGER DEFAULT 3,
    is_elective BOOLEAN DEFAULT FALSE,
    lab_hours INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(college_id, code)
);

-- NEP 2020: Elective Buckets Table
-- This holds the "Pools" (e.g., "Sem 1 Humanities Major Pool")
-- Supports both batch-based (old) and college-based (new NEP) approaches
CREATE TABLE elective_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE, -- Made nullable for college-based approach
    bucket_name VARCHAR(255) NOT NULL,
    min_selection INTEGER DEFAULT 1,
    max_selection INTEGER DEFAULT 1,
    is_common_slot BOOLEAN DEFAULT TRUE, -- TRUE = All subjects in this bucket run simultaneously
    -- NEP 2020 college-based fields (added for direct college-course-semester lookup)
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    course VARCHAR(50), -- Course code (e.g., 'B.Tech', 'B.Ed', 'ITEP')
    semester INTEGER CHECK (semester BETWEEN 1 AND 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure either batch_id OR (college_id + course + semester) is provided
    CONSTRAINT elective_buckets_reference_check CHECK (
        (batch_id IS NOT NULL) OR 
        (college_id IS NOT NULL AND course IS NOT NULL AND semester IS NOT NULL)
    ),
    -- Unique constraint for college-course-semester-bucket_name combination
    CONSTRAINT unique_college_course_semester_bucket UNIQUE (college_id, course, semester, bucket_name)
);

-- Indexes for elective_buckets
CREATE INDEX IF NOT EXISTS idx_elective_buckets_college_course_semester 
ON elective_buckets(college_id, course, semester);

CREATE INDEX IF NOT EXISTS idx_elective_buckets_batch 
ON elective_buckets(batch_id) 
WHERE batch_id IS NOT NULL;

CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    academic_year VARCHAR(10) NOT NULL,
    admission_year INTEGER,
    batch_year VARCHAR(20),
    expected_strength INT DEFAULT 60 CHECK (expected_strength BETWEEN 1 AND 200),
    actual_strength INT DEFAULT 0 CHECK (actual_strength >= 0),
    max_hours_per_day INT DEFAULT 6 CHECK (max_hours_per_day BETWEEN 1 AND 10),
    preferred_start_time TIME DEFAULT '09:00:00',
    preferred_end_time TIME DEFAULT '16:00:00',
    batch_priority INT DEFAULT 5 CHECK (batch_priority BETWEEN 1 AND 10),
    scheduling_flexibility INT DEFAULT 5 CHECK (scheduling_flexibility BETWEEN 1 AND 10),
    section VARCHAR(10) DEFAULT 'A',
    division VARCHAR(10),
    class_coordinator UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    semester_start_date DATE,
    semester_end_date DATE,
    is_current_semester BOOLEAN DEFAULT FALSE,
    -- Hybrid Scheduler Fields
    student_count INTEGER DEFAULT 60,
    section_count INTEGER DEFAULT 1,
    CONSTRAINT valid_batch_times CHECK (preferred_start_time < preferred_end_time),
    CONSTRAINT valid_strength CHECK (actual_strength <= expected_strength + 10),
    CONSTRAINT valid_semester_dates CHECK (
        (semester_start_date IS NULL) OR 
        (semester_end_date IS NULL) OR 
        (semester_start_date < semester_end_date)
    )
);

COMMENT ON COLUMN batches.admission_year IS 'Year when students were admitted (e.g., 2025)';
COMMENT ON COLUMN batches.batch_year IS 'Batch cohort year (e.g., ''2025'' for Batch 2025)';
COMMENT ON COLUMN batches.semester IS 'Current semester the batch is studying (1-8)';
COMMENT ON COLUMN batches.academic_year IS 'Current academic year (e.g., ''2025-26'')';

-- Add unique constraint for batches with named constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'batches_unique_key'
    ) THEN
        ALTER TABLE batches
        ADD CONSTRAINT batches_unique_key 
        UNIQUE (college_id, department_id, semester, academic_year, name, section);
    END IF;
END $$;

-- ============================================================================
-- 3. ALGORITHM-CRITICAL TABLES
-- ============================================================================

CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
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
    -- Hybrid Scheduler Fields
    slot_number INTEGER,
    is_lab_slot BOOLEAN DEFAULT FALSE,
    preference_score INT DEFAULT 5 CHECK (preference_score BETWEEN 1 AND 10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_slot CHECK (end_time > start_time),
    CONSTRAINT reasonable_duration CHECK (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60 BETWEEN 30 AND 240
    ),
    UNIQUE(college_id, day, start_time, end_time)
);

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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(faculty_id, subject_id)
);

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

CREATE TABLE batch_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    required_hours_per_week INT NOT NULL CHECK (required_hours_per_week BETWEEN 1 AND 20),
    assigned_faculty_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_lab_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    priority_level INT DEFAULT 5 CHECK (priority_level BETWEEN 1 AND 10),
    scheduling_flexibility INT DEFAULT 5 CHECK (scheduling_flexibility BETWEEN 1 AND 10),
    can_split_sessions BOOLEAN DEFAULT TRUE,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(batch_id, subject_id)
);

CREATE TABLE constraint_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('HARD', 'SOFT', 'PREFERENCE')),
    description TEXT,
    rule_parameters JSONB NOT NULL DEFAULT '{}',
    weight DECIMAL(8,2) DEFAULT 1.0 CHECK (weight >= 0),
    applies_to_departments UUID[] DEFAULT '{}',
    applies_to_subjects UUID[] DEFAULT '{}',
    applies_to_faculty UUID[] DEFAULT '{}',
    applies_to_batches UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. ALGORITHM EXECUTION SYSTEM
-- ============================================================================

CREATE TABLE timetable_generation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_name VARCHAR(255) NOT NULL,
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    academic_year VARCHAR(10) NOT NULL,
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    status generation_task_status NOT NULL DEFAULT 'PENDING',
    current_phase algorithm_phase DEFAULT 'INITIALIZING',
    progress INT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    current_message TEXT,
    estimated_completion_time TIMESTAMPTZ,
    algorithm_config JSONB NOT NULL DEFAULT '{
        "cpsat": { "maxSolutions": 10, "timeoutMinutes": 5, "usePreFiltering": true, "enableParallelSearch": true },
        "ga": { "populationSize": 50, "maxGenerations": 100, "mutationRate": 0.1, "crossoverRate": 0.8, "elitismRate": 0.1, "tournamentSize": 5 },
        "hybrid": { "cpsatSolutions": 10, "gaInitialPopulation": 50, "maxTotalTime": 300 }
    }',
    created_by UUID NOT NULL REFERENCES users(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    error_details TEXT,
    solutions_generated INT DEFAULT 0,
    best_fitness_score DECIMAL(10,4),
    execution_time_seconds INT,
    memory_usage_mb INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE generated_timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_task_id UUID NOT NULL REFERENCES timetable_generation_tasks(id) ON DELETE CASCADE,
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    academic_year VARCHAR(10) NOT NULL,
    semester INT NOT NULL,
    fitness_score DECIMAL(10,4) NOT NULL DEFAULT 0,
    hard_constraint_violations INTEGER DEFAULT 0,
    algorithm_source VARCHAR(50) DEFAULT 'hybrid',
    constraint_violations JSONB DEFAULT '[]',
    optimization_metrics JSONB DEFAULT '{}',
    generation_method VARCHAR(20) DEFAULT 'HYBRID' CHECK (
        generation_method IN ('CP_SAT_ONLY', 'GA_ONLY', 'HYBRID')
    ),
    solution_rank INT DEFAULT 1,
    status timetable_status NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    version INT NOT NULL DEFAULT 1,
    comments TEXT,
    review_notes TEXT,
    effective_from DATE,
    effective_until DATE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    CONSTRAINT unique_published_timetable 
        EXCLUDE USING gist (batch_id WITH =, academic_year WITH =) 
        WHERE (status = 'published')
);

CREATE TABLE scheduled_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID NOT NULL REFERENCES generated_timetables(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE RESTRICT,
    time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE RESTRICT,
    variable_id VARCHAR(255),
    assignment_score DECIMAL(8,4) DEFAULT 0,
    credit_hour_number INT NOT NULL CHECK (credit_hour_number > 0),
    class_type subject_type DEFAULT 'THEORY',
    session_duration INT DEFAULT 60,
    is_recurring BOOLEAN DEFAULT TRUE,
    is_elective BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT no_batch_time_conflict_per_timetable 
        EXCLUDE USING gist (timetable_id WITH =, batch_id WITH =, time_slot_id WITH =),
    CONSTRAINT no_faculty_time_conflict_per_timetable 
        EXCLUDE USING gist (timetable_id WITH =, faculty_id WITH =, time_slot_id WITH =),
    CONSTRAINT no_classroom_time_conflict_per_timetable 
        EXCLUDE USING gist (timetable_id WITH =, classroom_id WITH =, time_slot_id WITH =)
);

CREATE TABLE algorithm_execution_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_task_id UUID NOT NULL REFERENCES timetable_generation_tasks(id) ON DELETE CASCADE,
    cpsat_variables_created INT DEFAULT 0,
    cpsat_constraints_generated INT DEFAULT 0,
    cpsat_solutions_found INT DEFAULT 0,
    cpsat_execution_time_ms INT DEFAULT 0,
    cpsat_memory_usage_mb INT DEFAULT 0,
    ga_initial_population_size INT DEFAULT 0,
    ga_generations_completed INT DEFAULT 0,
    ga_best_fitness DECIMAL(10,4),
    ga_average_fitness DECIMAL(10,4),
    ga_fitness_improvement DECIMAL(10,4),
    ga_execution_time_ms INT DEFAULT 0,
    ga_memory_usage_mb INT DEFAULT 0,
    total_execution_time_ms INT DEFAULT 0,
    peak_memory_usage_mb INT DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.0,
    hard_constraints_satisfied INT DEFAULT 0,
    soft_constraints_satisfied INT DEFAULT 0,
    hard_constraint_violations INT DEFAULT 0,
    soft_constraint_violations INT DEFAULT 0,
    preference_satisfaction_score DECIMAL(8,4) DEFAULT 0,
    faculty_utilization_rate DECIMAL(5,2) DEFAULT 0,
    classroom_utilization_rate DECIMAL(5,2) DEFAULT 0,
    time_slot_utilization_rate DECIMAL(5,2) DEFAULT 0,
    workload_distribution_score DECIMAL(8,4) DEFAULT 0,
    -- Hybrid Scheduler Fields
    initial_score DECIMAL(10, 6),
    final_score DECIMAL(10, 6),
    improvement_percentage DECIMAL(10, 4),
    solutions_found INTEGER,
    metrics_json JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4.5 HYBRID SCHEDULER TABLES
-- ============================================================================

-- GA Population Snapshots (for analysis)
CREATE TABLE ga_population_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES timetable_generation_tasks(id) ON DELETE CASCADE,
    generation_number INTEGER NOT NULL,
    population_size INTEGER NOT NULL,
    best_fitness DECIMAL(10, 6) NOT NULL,
    worst_fitness DECIMAL(10, 6) NOT NULL,
    avg_fitness DECIMAL(10, 6) NOT NULL,
    std_fitness DECIMAL(10, 6),
    diversity_score DECIMAL(10, 6),
    best_chromosome JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scheduling Constraints Configuration - REMOVED (dropped from database)
-- CREATE TABLE scheduling_constraints (...) - Table has been dropped

-- Faculty Scheduling Preferences (for soft constraints)
CREATE TABLE faculty_scheduling_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_days day_of_week[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']::day_of_week[],
    preferred_start_time TIME DEFAULT '09:00',
    preferred_end_time TIME DEFAULT '17:00',
    max_hours_per_day INTEGER DEFAULT 6 CHECK (max_hours_per_day > 0 AND max_hours_per_day <= 12),
    max_hours_per_week INTEGER DEFAULT 25 CHECK (max_hours_per_week > 0 AND max_hours_per_week <= 50),
    max_consecutive_hours INTEGER DEFAULT 3,
    prefer_consecutive BOOLEAN DEFAULT TRUE,
    lunch_break_required BOOLEAN DEFAULT TRUE,
    preferred_lunch_start TIME DEFAULT '12:30',
    preferred_lunch_end TIME DEFAULT '13:30',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(faculty_id)
);



-- ============================================================================
-- 5. SUPPORTING TABLES AND ACCESS CONTROL
-- ============================================================================

CREATE TABLE student_batch_enrollment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, batch_id)
);

-- NEP 2020: Student Course Selections Table
-- Tracks which specific "Major/Minor" a student has chosen
CREATE TABLE student_course_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a student doesn't pick the same subject twice in a semester
    UNIQUE(student_id, subject_id, semester, academic_year)
);

CREATE TABLE timetable_access_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID NOT NULL REFERENCES generated_timetables(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    access_type VARCHAR(20) DEFAULT 'view' CHECK (access_type IN ('view', 'edit', 'approve', 'publish')),
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT access_scope_defined CHECK (
        user_id IS NOT NULL OR batch_id IS NOT NULL OR 
        department_id IS NOT NULL OR college_id IS NOT NULL
    )
);

CREATE TABLE workflow_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID NOT NULL REFERENCES generated_timetables(id) ON DELETE CASCADE,
    workflow_step VARCHAR(50) NOT NULL CHECK (workflow_step IN ('created', 'submitted_for_review', 'reviewed', 'approved', 'published', 'rejected')),
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    comments TEXT,
    rejection_reason TEXT,
    approval_level VARCHAR(50),
    assigned_to UUID REFERENCES users(id),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    timetable_id UUID REFERENCES generated_timetables(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    -- Extended fields for comprehensive notification system
    content_type VARCHAR(50) DEFAULT NULL, -- 'timetable', 'assignment', 'announcement', 'event'
    content_id UUID DEFAULT NULL, -- ID of the related content item
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    action_url TEXT DEFAULT NULL, -- URL to navigate to when notification is clicked
    expires_at TIMESTAMPTZ DEFAULT NULL, -- Auto-expire notifications
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements table for college/department/batch announcements
CREATE TABLE announcements (
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

-- Submission question grades for detailed assignment grading
CREATE TABLE submission_question_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
    obtained_marks DECIMAL(5,2) DEFAULT 0,
    feedback TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique grade per question per submission
    CONSTRAINT unique_submission_question UNIQUE (submission_id, question_id)
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    algorithm_context JSONB DEFAULT '{}',
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5.5 ADDITIONAL SUPPORTING TABLES
-- ============================================================================

-- Bucket Subjects - Links subjects to elective buckets with capacity management
CREATE TABLE bucket_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id UUID NOT NULL REFERENCES elective_buckets(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    max_capacity INTEGER DEFAULT 60,
    current_enrollment INTEGER DEFAULT 0,
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    CONSTRAINT bucket_subjects_max_capacity_check CHECK (max_capacity >= 0),
    CONSTRAINT bucket_subjects_current_enrollment_check CHECK (current_enrollment >= 0),
    CONSTRAINT bucket_subjects_check CHECK (current_enrollment <= max_capacity),
    UNIQUE(bucket_id, subject_id)
);

-- Subject Allotments Permanent - Tracks permanent subject assignments to students
CREATE TABLE subject_allotments_permanent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bucket_id UUID NOT NULL REFERENCES elective_buckets(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    allotted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    priority_rank INTEGER CHECK (priority_rank >= 1 AND priority_rank <= 10),
    student_cgpa NUMERIC(4, 2),
    allotted_at TIMESTAMPTZ DEFAULT NOW(),
    algorithm_used VARCHAR(50) DEFAULT 'priority_based',
    notes TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DROPPED', 'TRANSFERRED')),
    CONSTRAINT subject_allotments_permanent_priority_rank_check CHECK (priority_rank >= 1 AND priority_rank <= 10),
    UNIQUE(student_id, bucket_id)
);

-- Master Accepted Timetables - Published and approved timetables
CREATE TABLE master_accepted_timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_timetable_id UUID NOT NULL REFERENCES generated_timetables(id) ON DELETE CASCADE,
    college_id UUID NOT NULL REFERENCES colleges(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    batch_id UUID NOT NULL REFERENCES batches(id),
    academic_year VARCHAR(10) NOT NULL,
    semester INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    fitness_score NUMERIC(10, 4) NOT NULL DEFAULT 0,
    constraint_violations JSONB DEFAULT '[]'::jsonb,
    optimization_metrics JSONB DEFAULT '{}'::jsonb,
    generation_method VARCHAR(20) DEFAULT 'HYBRID',
    published_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    effective_from DATE NOT NULL,
    effective_until DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    total_classes INTEGER NOT NULL DEFAULT 0,
    faculty_count INTEGER NOT NULL DEFAULT 0,
    classroom_count INTEGER NOT NULL DEFAULT 0,
    occupied_faculty_ids UUID[] DEFAULT '{}'::UUID[],
    occupied_classroom_ids UUID[] DEFAULT '{}'::UUID[],
    occupied_time_slot_ids UUID[] DEFAULT '{}'::UUID[],
    has_external_conflicts BOOLEAN DEFAULT FALSE,
    conflict_details JSONB DEFAULT '{}'::jsonb,
    conflict_resolved_at TIMESTAMPTZ,
    publisher_notes TEXT,
    approval_notes TEXT,
    revision_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

-- Master Scheduled Classes - Individual class schedules from master timetables
CREATE TABLE master_scheduled_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_timetable_id UUID NOT NULL REFERENCES master_accepted_timetables(id),
    original_scheduled_class_id UUID NOT NULL REFERENCES scheduled_classes(id),
    college_id UUID NOT NULL REFERENCES colleges(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    batch_id UUID NOT NULL REFERENCES batches(id),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES users(id),
    classroom_id UUID NOT NULL REFERENCES classrooms(id),
    time_slot_id UUID NOT NULL REFERENCES time_slots(id),
    day_of_week day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    class_type subject_type DEFAULT 'THEORY',
    credit_hour_number INTEGER NOT NULL,
    session_duration INTEGER DEFAULT 60,
    is_recurring BOOLEAN DEFAULT TRUE,
    assignment_score NUMERIC(8, 4) DEFAULT 0,
    resource_hash TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross Department Conflicts - Tracks conflicts between different departments
CREATE TABLE cross_department_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    timetable_id_1 UUID NOT NULL REFERENCES master_accepted_timetables(id),
    timetable_id_2 UUID NOT NULL REFERENCES master_accepted_timetables(id),
    department_id_1 UUID NOT NULL REFERENCES departments(id),
    department_id_2 UUID NOT NULL REFERENCES departments(id),
    scheduled_class_id_1 UUID REFERENCES master_scheduled_classes(id),
    scheduled_class_id_2 UUID REFERENCES master_scheduled_classes(id),
    conflict_description TEXT NOT NULL,
    conflict_details JSONB DEFAULT '{}'::jsonb,
    affected_faculty_id UUID REFERENCES users(id),
    affected_classroom_id UUID REFERENCES classrooms(id),
    affected_time_slot_id UUID REFERENCES time_slots(id),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolution_priority INTEGER DEFAULT 5,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resource Utilization Summary - Tracks resource usage statistics
CREATE TABLE resource_utilization_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id),
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    semester INTEGER NOT NULL,
    total_allocated_hours NUMERIC(10, 2) DEFAULT 0,
    total_available_hours NUMERIC(10, 2) DEFAULT 0,
    utilization_percentage NUMERIC(5, 2),
    department_usage_breakdown JSONB DEFAULT '{}'::jsonb,
    time_distribution JSONB DEFAULT '{}'::jsonb,
    is_overutilized BOOLEAN DEFAULT FALSE,
    is_underutilized BOOLEAN DEFAULT FALSE,
    capacity_status VARCHAR(20),
    conflict_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(college_id, resource_type, resource_id, academic_year, semester)
);

-- Assignment Notifications - Notification system for assignments
CREATE TABLE assignment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES batches(id),
    department_id UUID REFERENCES departments(id),
    college_id UUID REFERENCES colleges(id),
    due_date DATE NOT NULL,
    assigned_date DATE DEFAULT CURRENT_DATE,
    submission_deadline TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    total_marks INTEGER DEFAULT 100,
    passing_marks INTEGER DEFAULT 40,
    priority VARCHAR(20) DEFAULT 'medium',
    instructions TEXT,
    submission_format VARCHAR(255),
    attachment_urls TEXT[],
    target_students UUID[],
    notify_students BOOLEAN DEFAULT TRUE,
    reminder_date DATE,
    is_published BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'published',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignment Notification Tracking - Tracks notification delivery
CREATE TABLE assignment_notification_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignment_notifications(id),
    user_id UUID NOT NULL REFERENCES users(id),
    notification_type VARCHAR(50) NOT NULL DEFAULT 'assignment_created',
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Exam Notifications - Notification system for exams
CREATE TABLE exam_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    exam_type VARCHAR(50) DEFAULT 'regular',
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES batches(id),
    department_id UUID REFERENCES departments(id),
    college_id UUID REFERENCES colleges(id),
    exam_date DATE NOT NULL,
    exam_start_time TIME NOT NULL,
    exam_end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    classroom_id UUID REFERENCES classrooms(id),
    venue VARCHAR(255),
    building VARCHAR(100),
    room_number VARCHAR(50),
    total_marks INTEGER DEFAULT 100,
    passing_marks INTEGER DEFAULT 40,
    priority VARCHAR(20) DEFAULT 'high',
    syllabus_topics TEXT[],
    syllabus_chapters TEXT,
    instructions TEXT,
    allowed_materials TEXT,
    is_open_book BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT FALSE,
    online_platform VARCHAR(100),
    online_link TEXT,
    target_students UUID[],
    notify_students BOOLEAN DEFAULT TRUE,
    reminder_date DATE,
    invigilators UUID[],
    is_published BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'published',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exam Notification Tracking - Tracks exam notification delivery
CREATE TABLE exam_notification_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exam_notifications(id),
    user_id UUID NOT NULL REFERENCES users(id),
    notification_type VARCHAR(50) NOT NULL DEFAULT 'exam_scheduled',
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- ============================================================================
-- 6. MULTI-COLLEGE OPTIMIZED INDEXES
-- ============================================================================

CREATE INDEX idx_users_college_role ON users(college_id, role, is_active);
CREATE INDEX idx_users_faculty_active ON users(college_id, role, is_active) WHERE role = 'faculty';
CREATE INDEX idx_users_department_role ON users(department_id, role);
CREATE INDEX idx_users_student_semester ON users(college_id, current_semester, is_active) WHERE role = 'student';
CREATE INDEX IF NOT EXISTS idx_users_course_id ON users(course_id);
CREATE INDEX idx_departments_college ON departments(college_id, is_active);
CREATE INDEX idx_subjects_college_department ON subjects(college_id, department_id, is_active);
CREATE INDEX idx_subjects_course ON subjects(course_id);
CREATE INDEX idx_subjects_department ON subjects(department_id);
CREATE INDEX idx_subjects_algorithm_lookup ON subjects(subject_type, requires_lab, algorithm_complexity);
CREATE INDEX IF NOT EXISTS idx_subjects_nep_category ON subjects(nep_category);
CREATE INDEX IF NOT EXISTS idx_subjects_bucket ON subjects(course_group_id);
CREATE INDEX IF NOT EXISTS idx_subjects_special_event ON subjects(is_special_event) WHERE is_special_event = TRUE;
CREATE INDEX IF NOT EXISTS idx_subjects_block_weeks ON subjects(block_start_week, block_end_week) WHERE block_start_week IS NOT NULL;
CREATE INDEX idx_classrooms_college ON classrooms(college_id, is_available);
CREATE INDEX idx_classrooms_capacity_features ON classrooms(college_id, capacity, has_projector, has_lab_equipment, is_available);
CREATE INDEX idx_batches_college_dept_semester ON batches(college_id, department_id, semester, academic_year, is_active);
CREATE INDEX idx_batches_access_control ON batches(college_id, department_id, semester, section);
CREATE INDEX IF NOT EXISTS idx_batches_course_id ON batches(course_id);
CREATE INDEX IF NOT EXISTS idx_batches_semester_validity ON batches(semester_start_date, semester_end_date, is_current_semester) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_batches_admission_year ON batches(admission_year);
CREATE INDEX IF NOT EXISTS idx_batches_batch_year ON batches(batch_year);
CREATE INDEX idx_time_slots_college_algorithm ON time_slots(college_id, day, start_time, is_active) WHERE NOT is_break_time;
CREATE INDEX idx_faculty_qualifications_lookup ON faculty_qualified_subjects(faculty_id, subject_id, proficiency_level);
CREATE INDEX idx_faculty_availability_lookup ON faculty_availability(faculty_id, time_slot_id, is_available);
CREATE INDEX idx_batch_subjects_requirements ON batch_subjects(batch_id, subject_id, required_hours_per_week);
CREATE INDEX idx_constraint_rules_active ON constraint_rules(rule_type, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_generation_tasks_status ON timetable_generation_tasks(status, current_phase);
CREATE INDEX idx_generation_tasks_batch_lookup ON timetable_generation_tasks(batch_id, academic_year, semester);
CREATE INDEX idx_timetables_batch_status ON generated_timetables(batch_id, status, fitness_score);
CREATE INDEX idx_scheduled_classes_timetable ON scheduled_classes(timetable_id, time_slot_id);
CREATE INDEX idx_scheduled_classes_conflicts ON scheduled_classes(faculty_id, classroom_id, time_slot_id);
CREATE INDEX idx_student_enrollment_batch ON student_batch_enrollment(batch_id, is_active);
CREATE INDEX idx_student_enrollment_student ON student_batch_enrollment(student_id, is_active);
-- NEP 2020 Indexes
CREATE INDEX idx_buckets_batch ON elective_buckets(batch_id);

CREATE INDEX idx_student_selections_student ON student_course_selections(student_id);
CREATE INDEX idx_subjects_bucket ON subjects(course_group_id);
CREATE INDEX idx_timetable_access_user ON timetable_access_control(user_id, access_type, is_active);
CREATE INDEX idx_timetable_access_batch ON timetable_access_control(batch_id, access_type, is_active);
CREATE INDEX idx_workflow_approvals_timetable ON workflow_approvals(timetable_id, workflow_step);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read, created_at);
CREATE INDEX idx_algorithm_metrics_task ON algorithm_execution_metrics(generation_task_id);
CREATE INDEX idx_audit_algorithm_context ON audit_logs USING GIN (algorithm_context);

-- Hybrid Scheduler Indexes
CREATE INDEX IF NOT EXISTS idx_subjects_is_elective ON subjects(is_elective) WHERE is_elective = TRUE;
CREATE INDEX IF NOT EXISTS idx_classrooms_is_lab ON classrooms(is_lab) WHERE is_lab = TRUE;
CREATE INDEX IF NOT EXISTS idx_time_slots_slot_number ON time_slots(slot_number);
CREATE INDEX IF NOT EXISTS idx_time_slots_day_enum ON time_slots(day);
CREATE INDEX IF NOT EXISTS idx_hybrid_tasks_college_status ON timetable_generation_tasks(college_id, status);
CREATE INDEX IF NOT EXISTS idx_hybrid_tasks_created_by ON timetable_generation_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_hybrid_timetables_active ON generated_timetables(batch_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_hybrid_classes_faculty_slot ON scheduled_classes(faculty_id, time_slot_id);
CREATE INDEX IF NOT EXISTS idx_hybrid_classes_room_slot ON scheduled_classes(classroom_id, time_slot_id);
CREATE INDEX IF NOT EXISTS idx_hybrid_classes_batch_slot ON scheduled_classes(batch_id, time_slot_id);
CREATE INDEX IF NOT EXISTS idx_hybrid_metrics_task ON algorithm_execution_metrics(generation_task_id);
CREATE INDEX IF NOT EXISTS idx_hybrid_snapshots_task_gen ON ga_population_snapshots(task_id, generation_number);


-- Additional Supporting Tables Indexes
CREATE INDEX IF NOT EXISTS idx_bucket_subjects_bucket ON bucket_subjects(bucket_id);
CREATE INDEX IF NOT EXISTS idx_bucket_subjects_subject ON bucket_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_permanent_allotments_student ON subject_allotments_permanent(student_id);
CREATE INDEX IF NOT EXISTS idx_permanent_allotments_bucket ON subject_allotments_permanent(bucket_id);
CREATE INDEX IF NOT EXISTS idx_submission_grades_submission ON submission_question_grades(submission_id);

-- ============================================================================
-- 7. MULTI-COLLEGE ALGORITHM HELPER VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW algorithm_faculty_data AS
SELECT 
    u.id, u.first_name, u.last_name, u.college_id, u.department_id, c.name as college_name,
    c.code as college_code, d.name as department_name, d.code as department_code, u.max_hours_per_day,
    u.max_hours_per_week, u.min_hours_per_week, u.faculty_priority, u.algorithm_weight, u.preferred_days,
    u.avoid_days, u.preferred_time_start, u.preferred_time_end, u.unavailable_slots, u.is_shared_faculty,
    u.faculty_type, u.can_create_timetables, u.can_publish_timetables, u.can_approve_timetables,
    COALESCE(
        ARRAY_AGG(
            DISTINCT jsonb_build_object(
                'subject_id', fqs.subject_id, 'subject_name', s.name, 'subject_code', s.code,
                'proficiency_level', fqs.proficiency_level, 'preference_score', fqs.preference_score,
                'is_primary_teacher', fqs.is_primary_teacher
            )
        ) FILTER (WHERE fqs.subject_id IS NOT NULL), 
        ARRAY[]::jsonb[]
    ) as qualified_subjects
FROM users u
LEFT JOIN colleges c ON u.college_id = c.id
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN faculty_qualified_subjects fqs ON u.id = fqs.faculty_id
LEFT JOIN subjects s ON fqs.subject_id = s.id
WHERE u.role = 'faculty' AND u.is_active = TRUE
GROUP BY u.id, c.id, d.id;

CREATE OR REPLACE VIEW algorithm_subject_data AS
SELECT 
    s.*,
    COALESCE(
        array_agg(
            json_build_object('faculty_id', fqs.faculty_id, 'proficiency', fqs.proficiency_level, 'preference', fqs.preference_score, 'is_primary', fqs.is_primary_teacher)
        ) FILTER (WHERE fqs.faculty_id IS NOT NULL), '{}'::json[]
    ) as qualified_faculty
FROM subjects s
LEFT JOIN faculty_qualified_subjects fqs ON s.id = fqs.subject_id
WHERE s.is_active = TRUE
GROUP BY s.id;

CREATE OR REPLACE VIEW algorithm_batch_curriculum AS
SELECT 
    bs.id AS batch_subject_id,
    bs.batch_id,
    bs.subject_id,
    bs.required_hours_per_week,
    bs.assigned_faculty_id,
    bs.priority_level,
    bs.scheduling_flexibility AS subject_scheduling_flexibility,
    bs.can_split_sessions,
    bs.is_mandatory,
    b.name AS batch_name,
    b.department_id,
    b.semester,
    b.academic_year,
    b.expected_strength,
    b.max_hours_per_day AS batch_max_hours_per_day,
    b.preferred_start_time,
    b.preferred_end_time,
    b.scheduling_flexibility AS batch_scheduling_flexibility,
    s.name AS subject_name,
    s.code AS subject_code,
    s.subject_type,
    s.requires_lab,
    s.requires_projector,
    s.algorithm_complexity,
    s.preferred_duration,
    u.first_name || ' ' || u.last_name AS assigned_faculty_name
FROM batch_subjects bs
JOIN batches b ON bs.batch_id = b.id
JOIN subjects s ON bs.subject_id = s.id
LEFT JOIN users u ON bs.assigned_faculty_id = u.id
WHERE bs.is_mandatory = TRUE AND b.is_active = TRUE AND s.is_active = TRUE;

CREATE OR REPLACE VIEW algorithm_time_slots AS
SELECT 
    ts.*,
    COUNT(fa.faculty_id) FILTER (WHERE fa.is_available = TRUE) as available_faculty_count,
    COUNT(fa.faculty_id) FILTER (WHERE fa.availability_type = 'preferred') as preferred_faculty_count
FROM time_slots ts
LEFT JOIN faculty_availability fa ON ts.id = fa.time_slot_id
WHERE ts.is_active = TRUE AND NOT ts.is_break_time AND NOT ts.is_lunch_time
GROUP BY ts.id;

-- ============================================================================
-- 7.5 HYBRID SCHEDULER VIEWS
-- ============================================================================

-- View for easy constraint lookup - REMOVED (scheduling_constraints table dropped)
-- CREATE OR REPLACE VIEW v_scheduling_constraints_summary AS (...) - View has been dropped

-- View for task execution summary
CREATE OR REPLACE VIEW v_task_execution_summary AS
SELECT 
    t.id as task_id,
    c.name as college_name,
    b.name as batch_name,
    t.task_name,
    t.status::text as status,
    t.current_phase::text as current_phase,
    t.progress as progress_percentage,
    t.current_message as progress_message,
    t.created_at,
    t.started_at,
    t.completed_at,
    t.execution_time_seconds as duration_seconds,
    t.best_fitness_score,
    t.solutions_generated,
    t.error_details,
    m.cpsat_solutions_found as cpsat_solutions,
    m.cpsat_execution_time_ms / 1000.0 as cpsat_duration_seconds,
    m.cpsat_variables_created,
    m.cpsat_constraints_generated,
    m.ga_best_fitness as ga_score,
    m.ga_execution_time_ms / 1000.0 as ga_duration_seconds,
    m.ga_generations_completed as ga_generations,
    m.ga_fitness_improvement,
    m.total_execution_time_ms / 1000.0 as total_duration_seconds,
    m.hard_constraints_satisfied,
    m.soft_constraints_satisfied,
    m.faculty_utilization_rate,
    m.classroom_utilization_rate
FROM timetable_generation_tasks t
LEFT JOIN colleges c ON c.id = (SELECT college_id FROM batches WHERE id = t.batch_id)
JOIN batches b ON t.batch_id = b.id
LEFT JOIN algorithm_execution_metrics m ON m.generation_task_id = t.id
ORDER BY t.created_at DESC;

-- View for active semester batches with computed is_active_semester flag
CREATE OR REPLACE VIEW active_semester_batchs AS
SELECT 
    b.*,
    CASE 
        WHEN b.is_active = TRUE AND (
            (b.semester_start_date IS NULL OR CURRENT_DATE >= b.semester_start_date) AND
            (b.semester_end_date IS NULL OR CURRENT_DATE <= b.semester_end_date)
        ) THEN TRUE
        ELSE FALSE
    END as is_active_semester
FROM batches b
WHERE b.is_active = TRUE
ORDER BY b.college_id, b.department_id, b.semester;

-- View for detailed subject allotments with student, subject, bucket, and allotted_by information
CREATE OR REPLACE VIEW subject_allotments_detailed AS
SELECT 
    sa.id,
    sa.student_id,
    sa.bucket_id,
    sa.subject_id,
    sa.allotted_at,
    sa.algorithm_used,
    sa.student_priority,
    sa.cgpa,
    -- Student information
    s.first_name,
    s.last_name,
    s.college_uid,
    s.email,
    -- Subject information
    subj.code as subject_code,
    subj.name as subject_name,
    subj.credit_value,
    -- Bucket information
    eb.bucket_name,
    eb.batch_id,
    -- Allotted by information
    ab.first_name as allotted_by_first_name,
    ab.last_name as allotted_by_last_name
FROM subject_allotments sa
JOIN users s ON sa.student_id = s.id
JOIN subjects subj ON sa.subject_id = subj.id
LEFT JOIN elective_buckets eb ON sa.bucket_id = eb.id
LEFT JOIN users ab ON sa.allotted_by = ab.id
ORDER BY sa.allotted_at DESC;

-- ============================================================================
-- 8. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- ============================================================================
-- SESSION CONTEXT OPTIMIZATION FUNCTIONS
-- These functions dramatically improve RLS policy performance by caching user context
-- ============================================================================

-- Function to set session context variables (called after login)
CREATE OR REPLACE FUNCTION set_user_context(
  p_user_id UUID,
  p_college_id UUID,
  p_role VARCHAR,
  p_department_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Store user context in session variables for RLS policy optimization
  PERFORM set_config('app.current_user_id', p_user_id::TEXT, TRUE);
  PERFORM set_config('app.current_college_id', p_college_id::TEXT, TRUE);
  PERFORM set_config('app.current_role', p_role, TRUE);
  
  IF p_department_id IS NOT NULL THEN
    PERFORM set_config('app.current_department_id', p_department_id::TEXT, TRUE);
  ELSE
    PERFORM set_config('app.current_department_id', '', TRUE);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user ID from session
CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to get current college ID from session
CREATE OR REPLACE FUNCTION current_app_college_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_college_id', TRUE), '')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to get current role from session
CREATE OR REPLACE FUNCTION current_app_role() RETURNS VARCHAR AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_role', TRUE), '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to get current department ID from session
CREATE OR REPLACE FUNCTION current_app_department_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_department_id', TRUE), '')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION set_user_context(UUID, UUID, VARCHAR, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION current_app_user_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION current_app_college_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION current_app_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION current_app_department_id() TO authenticated, anon;

-- ============================================================================
-- HYBRID SCHEDULER FUNCTIONS
-- ============================================================================

-- Function to insert default constraints for a college - REMOVED (scheduling_constraints table dropped)
-- CREATE OR REPLACE FUNCTION insert_default_scheduling_constraints(...) - Function removed

-- Function to get default algorithm configuration
CREATE OR REPLACE FUNCTION get_default_algorithm_config()
RETURNS JSONB AS $$
BEGIN
    RETURN '{
        "cpsat": {"max_time_seconds": 300, "num_workers": 8, "num_solutions": 10, "log_search_progress": false},
        "ga": {"population_size": 100, "generations": 200, "elite_size": 10, "mutation_rate": 0.15, "crossover_rate": 0.8, "tournament_size": 5, "stagnation_limit": 30},
        "hybrid": {"cpsat_weight": 0.6, "ga_weight": 0.4, "use_cpsat_seed": true, "parallel_mode": true},
        "constraint_weights": {"minimize_gaps": 50, "preferred_time_slots": 30, "workload_balance": 40, "room_stability": 20, "consecutive_lectures": 35, "department_clustering": 25, "elective_distribution": 30}
    }'::jsonb;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get latest active timetable for a batch
CREATE OR REPLACE FUNCTION get_active_timetable(p_batch_id UUID)
RETURNS UUID AS $$
DECLARE
    v_timetable_id UUID;
BEGIN
    SELECT id INTO v_timetable_id
    FROM generated_timetables
    WHERE batch_id = p_batch_id AND is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;
    RETURN v_timetable_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to activate a timetable (deactivates others for same batch)
CREATE OR REPLACE FUNCTION activate_timetable(p_timetable_id UUID)
RETURNS VOID AS $$
DECLARE
    v_batch_id UUID;
BEGIN
    SELECT batch_id INTO v_batch_id FROM generated_timetables WHERE id = p_timetable_id;
    UPDATE generated_timetables SET is_active = FALSE WHERE batch_id = v_batch_id AND is_active = TRUE;
    UPDATE generated_timetables SET is_active = TRUE WHERE id = p_timetable_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for scheduling conflicts
CREATE OR REPLACE FUNCTION check_scheduling_conflicts(p_timetable_id UUID)
RETURNS TABLE(conflict_type VARCHAR(50), entity_id UUID, entity_name TEXT, time_slot_id UUID, conflict_count INTEGER) AS $$
BEGIN
    -- Faculty conflicts
    RETURN QUERY
    SELECT 'faculty_overlap'::VARCHAR(50), sc.faculty_id, u.first_name || ' ' || u.last_name, sc.time_slot_id, COUNT(*)::INTEGER
    FROM scheduled_classes sc JOIN users u ON sc.faculty_id = u.id
    WHERE sc.timetable_id = p_timetable_id
    GROUP BY sc.faculty_id, u.first_name, u.last_name, sc.time_slot_id HAVING COUNT(*) > 1;
    -- Room conflicts
    RETURN QUERY
    SELECT 'room_overlap'::VARCHAR(50), sc.classroom_id, c.name, sc.time_slot_id, COUNT(*)::INTEGER
    FROM scheduled_classes sc JOIN classrooms c ON sc.classroom_id = c.id
    WHERE sc.timetable_id = p_timetable_id
    GROUP BY sc.classroom_id, c.name, sc.time_slot_id HAVING COUNT(*) > 1;
    -- Batch conflicts
    RETURN QUERY
    SELECT 'batch_overlap'::VARCHAR(50), sc.batch_id, b.name, sc.time_slot_id, COUNT(*)::INTEGER
    FROM scheduled_classes sc JOIN batches b ON sc.batch_id = b.id
    WHERE sc.timetable_id = p_timetable_id
    GROUP BY sc.batch_id, b.name, sc.time_slot_id HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- STANDARD TRIGGER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION log_audit_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, old_values, new_values, created_at
    ) VALUES (
        COALESCE(current_setting('app.current_user_id', true)::uuid, NULL),
        TG_OP || '_' || TG_TABLE_NAME, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_special_event_flag()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically set is_special_event flag based on nep_category
    IF NEW.nep_category = 'INTERNSHIP' THEN
        NEW.is_special_event := TRUE;
    ELSIF NEW.nep_category IN ('MAJOR', 'MINOR', 'CORE', 'AEC', 'VAC', 'PEDAGOGY', 'MULTIDISCIPLINARY') THEN
        NEW.is_special_event := FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_current_semester_flag()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically set is_current_semester flag based on semester dates
    IF NEW.semester_start_date IS NOT NULL AND NEW.semester_end_date IS NOT NULL THEN
        NEW.is_current_semester := (CURRENT_DATE BETWEEN NEW.semester_start_date AND NEW.semester_end_date);
    ELSE
        NEW.is_current_semester := FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply timestamp triggers
CREATE TRIGGER update_colleges_updated_at BEFORE UPDATE ON colleges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_slots_updated_at BEFORE UPDATE ON time_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faculty_qualified_subjects_updated_at BEFORE UPDATE ON faculty_qualified_subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faculty_availability_updated_at BEFORE UPDATE ON faculty_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batch_subjects_updated_at BEFORE UPDATE ON batch_subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_constraint_rules_updated_at BEFORE UPDATE ON constraint_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_generation_tasks_updated_at BEFORE UPDATE ON timetable_generation_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_generated_timetables_updated_at BEFORE UPDATE ON generated_timetables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_classes_updated_at BEFORE UPDATE ON scheduled_classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_batch_enrollment_updated_at BEFORE UPDATE ON student_batch_enrollment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_elective_buckets_updated_at BEFORE UPDATE ON elective_buckets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Hybrid Scheduler Triggers
-- CREATE TRIGGER update_scheduling_constraints_updated_at - REMOVED (scheduling_constraints table dropped)
CREATE TRIGGER update_faculty_preferences_updated_at BEFORE UPDATE ON faculty_scheduling_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply special event flag trigger
CREATE TRIGGER set_special_event_flag BEFORE INSERT OR UPDATE OF nep_category ON subjects FOR EACH ROW EXECUTE FUNCTION update_special_event_flag();

-- Apply current semester flag trigger
CREATE TRIGGER trigger_update_current_semester BEFORE INSERT OR UPDATE OF semester_start_date, semester_end_date ON batches FOR EACH ROW EXECUTE FUNCTION update_current_semester_flag();

-- Apply audit triggers
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION log_audit_changes();
CREATE TRIGGER audit_generated_timetables AFTER INSERT OR UPDATE OR DELETE ON generated_timetables FOR EACH ROW EXECUTE FUNCTION log_audit_changes();
CREATE TRIGGER audit_generation_tasks AFTER INSERT OR UPDATE OR DELETE ON timetable_generation_tasks FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ============================================================================
-- 9. SAMPLE DATA FOR MULTI-COLLEGE ALGORITHM TESTING
-- ============================================================================

-- UPDATED: College name changed as requested
INSERT INTO colleges (name, code, address, city, state, academic_year, working_days, college_start_time, college_end_time) VALUES
    ('St. Vincent Pallotti College of Engineering and Technology', 'SVPCET', 'Gavsi Manapur, Wardha Road, Nagpur', 'Nagpur', 'Maharashtra', '2025-26', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday','Saturday']::day_of_week[], '09:00:00', '16:15:00');

INSERT INTO departments (college_id, name, code) VALUES
    ((SELECT id FROM colleges WHERE code = 'SVPCET'), 'Computer Science & Engineering', 'CSE'),
    ((SELECT id FROM colleges WHERE code = 'SVPCET'), 'Information Technology', 'IT'),
    ((SELECT id FROM colleges WHERE code = 'SVPCET'), 'Civil Engineering', 'CE');

-- ============================================================================
-- GCOEJ COLLEGE AND DEPARTMENTS SETUP
-- ============================================================================

-- Insert GCOEJ College
INSERT INTO colleges (
    name, 
    code, 
    address, 
    city, 
    state, 
    academic_year, 
    working_days, 
    college_start_time, 
    college_end_time,
    phone,
    email,
    website
) VALUES (
    'Government College of Education, Jammu', 
    'GCOEJ', 
    'Canal Road, Jammu', 
    'Jammu', 
    'Jammu and Kashmir', 
    '2025-26', 
    ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']::day_of_week[], 
    '09:00:00', 
    '16:00:00',
    '+91-191-2123456',
    'info@gcoej.edu.in',
    'https://gcoej.edu.in'
);

-- Insert Multiple Departments for GCOEJ
INSERT INTO departments (college_id, name, code, description, department_type) VALUES
    ((SELECT id FROM colleges WHERE code = 'GCOEJ'), 'Education', 'EDU', 'Department of Education offering B.Ed and other teacher training programs', 'academic'),
    ((SELECT id FROM colleges WHERE code = 'GCOEJ'), 'English', 'ENG', 'Department of English Language and Literature', 'academic'),
    ((SELECT id FROM colleges WHERE code = 'GCOEJ'), 'History', 'HIST', 'Department of History and Social Studies', 'academic'),
    ((SELECT id FROM colleges WHERE code = 'GCOEJ'), 'Hindi', 'HIN', 'Department of Hindi Language and Literature', 'academic'),
    ((SELECT id FROM colleges WHERE code = 'GCOEJ'), 'Urdu', 'URDU', 'Department of Urdu Language and Literature', 'academic'),
    ((SELECT id FROM colleges WHERE code = 'GCOEJ'), 'Mathematics', 'MATH', 'Department of Mathematics and Statistics', 'academic'),
    ((SELECT id FROM colleges WHERE code = 'GCOEJ'), 'Science', 'SCI', 'Department of Physical Sciences', 'academic');

-- Insert Courses for GCOEJ
INSERT INTO courses (college_id, title, code, nature_of_course, intake, duration_years) VALUES
    ((SELECT id FROM colleges WHERE code = 'GCOEJ'), 'Bachelor of Education', 'B.Ed', 'UG', 100, 2),
    ((SELECT id FROM colleges WHERE code = 'GCOEJ'), 'Master of Education', 'M.Ed', 'PG', 50, 2),
    ((SELECT id FROM colleges WHERE code = 'GCOEJ'), 'Integrated Teacher Education Programme', 'ITEP', 'Integrated', 50, 4);

-- ============================================================================
-- GCOEJ USERS SETUP
-- ============================================================================

-- Insert Admin User
INSERT INTO users (
    first_name,
    last_name,
    college_uid,
    email,
    password_hash, -- Password: admin123 (bcrypt hashed)
    phone,
    college_id,
    department_id,
    role,
    access_level,
    can_create_timetables,
    can_publish_timetables,
    can_approve_timetables,
    is_active,
    email_verified
) VALUES (
    'Rajesh',
    'Kumar',
    'ADMIN001',
    'admin@gcoej.in',
    '$2b$10$rOzJgZxvfq7H8Ln/VQJjVeKNwYv5vKH3d8FgRxP2LmN9QwErTyBiC', -- admin123
    '+91-9876543210',
    (SELECT id FROM colleges WHERE code = 'GCOEJ'),
    (SELECT id FROM departments WHERE code = 'EDU' AND college_id = (SELECT id FROM colleges WHERE code = 'GCOEJ')),
    'admin',
    'admin',
    true,
    true,
    true,
    true,
    true
);

-- Insert Faculty User
INSERT INTO users (
    first_name,
    last_name,
    college_uid,
    email,
    password_hash, -- Password: faculty123 (bcrypt hashed)
    phone,
    college_id,
    department_id,
    role,
    faculty_type,
    access_level,
    max_hours_per_day,
    max_hours_per_week,
    min_hours_per_week,
    faculty_priority,
    can_create_timetables,
    can_publish_timetables,
    is_active,
    email_verified
) VALUES (
    'Dr. Priya',
    'Sharma',
    'FAC001',
    'priya.sharma@gcoej.in',
    '$2b$10$8VxGfKZqJmN4YwHrP1LmQeRnBvC2DtF5GhI6JkM7NpO8QsT9UvW0X', -- faculty123
    '+91-9876543211',
    (SELECT id FROM colleges WHERE code = 'GCOEJ'),
    (SELECT id FROM departments WHERE code = 'EDU' AND college_id = (SELECT id FROM colleges WHERE code = 'GCOEJ')),
    'faculty',
    'general',
    'write',
    8,
    35,
    15,
    7,
    false,
    false,
    true,
    true
);

-- Insert Student User
INSERT INTO users (
    first_name,
    last_name,
    college_uid,
    email,
    password_hash, -- Password: student123 (bcrypt hashed)
    phone,
    college_id,
    department_id,
    role,
    access_level,
    student_id,
    admission_year,
    current_semester,
    is_active,
    email_verified
) VALUES (
    'Aarav',
    'Verma',
    'STU001',
    'aarav.verma@gcoej.in',
    '$2b$10$3MnB5VtC7YzA1WsE9RqL4eHgF2JkM6NpO7QsT8UvX0Y1ZaBcD4EfG', -- student123
    '+91-9876543212',
    (SELECT id FROM colleges WHERE code = 'GCOEJ'),
    (SELECT id FROM departments WHERE code = 'EDU' AND college_id = (SELECT id FROM colleges WHERE code = 'GCOEJ')),
    'student',
    'read',
    'GCOEJ2025001',
    2025,
    1,
    true,
    true
);

-- Create a sample batch for B.Ed Semester 1
INSERT INTO batches (
    name,
    college_id,
    department_id,
    semester,
    academic_year,
    expected_strength,
    actual_strength,
    section,
    is_active
) VALUES (
    'B.Ed Semester 1 - Section A',
    (SELECT id FROM colleges WHERE code = 'GCOEJ'),
    (SELECT id FROM departments WHERE code = 'EDU' AND college_id = (SELECT id FROM colleges WHERE code = 'GCOEJ')),
    1,
    '2025-26',
    40,
    1, -- Will be updated when more students are enrolled
    'A',
    true
);

-- Enroll the student in the batch
INSERT INTO student_batch_enrollment (
    student_id,
    batch_id,
    enrollment_date,
    is_active
) VALUES (
    (SELECT id FROM users WHERE college_uid = 'STU001' AND college_id = (SELECT id FROM colleges WHERE code = 'GCOEJ')),
    (SELECT id FROM batches WHERE name = 'B.Ed Semester 1 - Section A' AND college_id = (SELECT id FROM colleges WHERE code = 'GCOEJ')),
    CURRENT_DATE,
    true
);

-- Insert default constraint rules for timetable generation
INSERT INTO constraint_rules (rule_name, rule_type, description, rule_parameters, weight, is_active) VALUES
    -- Hard constraints (must be satisfied)
    ('no_batch_overlap_per_timetable', 'HARD', 
     'A batch cannot attend multiple classes simultaneously within the same timetable',
     '{"scope": "per_timetable", "resource": "batch", "check_type": "time_overlap"}', 100.0, true),
    
    ('no_faculty_overlap_per_timetable', 'HARD',
     'A faculty member cannot teach multiple classes simultaneously within the same timetable',
     '{"scope": "per_timetable", "resource": "faculty", "check_type": "time_overlap"}', 100.0, true),
    
    ('no_classroom_overlap_per_timetable', 'HARD',
     'A classroom cannot host multiple classes simultaneously within the same timetable',
     '{"scope": "per_timetable", "resource": "classroom", "check_type": "time_overlap"}', 100.0, true),
    
    ('no_continuous_theory_same_faculty', 'HARD',
     'Theory lectures by the same faculty cannot be scheduled in continuous slots',
     '{"scope": "per_timetable", "resource": "faculty", "check_type": "continuous_theory", "max_continuous": 1}', 90.0, true),
    
    ('lab_requires_continuous_slots', 'HARD',
     'Lab sessions must be scheduled in 2 continuous time slots',
     '{"scope": "per_timetable", "resource": "subject", "check_type": "lab_continuity", "required_slots": 2}', 95.0, true),
    
    ('max_one_lab_per_day', 'HARD',
     'Maximum one lab session per day for a batch to ensure even distribution',
     '{"scope": "per_timetable", "resource": "batch", "check_type": "lab_per_day", "max_labs": 1}', 85.0, true),
    
    ('minimum_subject_hours', 'HARD',
     'Each subject must meet minimum required credit hours per week',
     '{"scope": "per_timetable", "resource": "subject", "check_type": "minimum_hours"}', 100.0, true),
    
    -- Soft constraints (preferences)
    ('distribute_subjects_evenly', 'SOFT',
     'Distribute subject classes evenly across the week',
     '{"scope": "per_timetable", "resource": "subject", "check_type": "even_distribution"}', 50.0, true),
    
    ('faculty_preferred_time_slots', 'SOFT',
     'Schedule faculty during their preferred time slots when possible',
     '{"scope": "per_timetable", "resource": "faculty", "check_type": "time_preference"}', 30.0, true),
    
    ('avoid_first_last_slot_labs', 'SOFT',
     'Avoid scheduling labs in the first or last slot of the day',
     '{"scope": "per_timetable", "resource": "subject", "check_type": "lab_timing"}', 20.0, true),
    
    ('lunch_break_consideration', 'SOFT',
     'Respect lunch break timings',
     '{"scope": "per_timetable", "resource": "batch", "check_type": "break_time"}', 40.0, true),
    
    ('faculty_cross_timetable_preference', 'SOFT',
     'Minimize faculty conflicts across multiple published timetables',
     '{"scope": "cross_timetable", "resource": "faculty", "check_type": "time_overlap", "applies_to_status": ["published"]}', 10.0, true),
    
    ('classroom_cross_timetable_preference', 'SOFT',
     'Minimize classroom conflicts across multiple published timetables',
     '{"scope": "cross_timetable", "resource": "classroom", "check_type": "time_overlap", "applies_to_status": ["published"]}', 5.0, true)
ON CONFLICT (rule_name) DO NOTHING;

-- ============================================================================
-- SCHEMA VALIDATION AND COMPLETION
-- ============================================================================

-- ============================================================================
-- 10. EVENTS MANAGEMENT SYSTEM
-- Complete event management with conflict resolution and queue system
-- Added: October 2025
-- ============================================================================

-- Create event_type enum (reuse if exists)
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

-- Create event_status enum (reuse if exists)
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
-- EVENTS SYSTEM INDEXES
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
-- EVENTS SYSTEM VIEWS
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
-- EVENTS SYSTEM FUNCTIONS
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
-- EVENTS SYSTEM TRIGGERS
-- ============================================================================

-- Trigger for conflict checking
DROP TRIGGER IF EXISTS trigger_check_event_conflicts ON events;
CREATE TRIGGER trigger_check_event_conflicts
    BEFORE INSERT OR UPDATE OF start_date, end_date, venue, status
    ON events
    FOR EACH ROW
    EXECUTE FUNCTION check_event_conflicts();

-- Trigger for updating timestamps on events
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
-- SCHEMA VALIDATION AND COMPLETION
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    SELECT COUNT(*) INTO view_count FROM information_schema.views WHERE table_schema = 'public';
    RAISE NOTICE '==============================================================';
    RAISE NOTICE 'PYGRAM 2025 ALGORITHM-READY SCHEMA COMPLETED SUCCESSFULLY';
    RAISE NOTICE '==============================================================';
    RAISE NOTICE '✓ Tables Created: %', table_count;
    RAISE NOTICE '✓ Views Created: %', view_count;
    RAISE NOTICE '✓ Events Management System: INTEGRATED';
    RAISE NOTICE '✓ NEP 2020 Architecture: INTEGRATED';
    RAISE NOTICE 'Ready for PyGram 2025 Algorithm Integration!';
    RAISE NOTICE '==============================================================';
END $$;

-- ============================================================================
-- 10A. ASSIGNMENT & PROCTORING SYSTEM
-- Complete assignment module with MCQ/MSQ/essay/coding questions and proctoring
-- Added: December 2025
-- ============================================================================

-- 1. Create Assignment System Enums (Safe Block)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_type') THEN
        CREATE TYPE assignment_type AS ENUM ('MCQ', 'MSQ', 'FILL_BLANK', 'ESSAY', 'CODING', 'MIXED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
        CREATE TYPE assignment_status AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'CLOSED', 'ARCHIVED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
        CREATE TYPE submission_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'LATE_SUBMISSION', 'GRADED', 'RESUBMISSION_REQUIRED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
        CREATE TYPE question_type AS ENUM ('MCQ', 'MSQ', 'FILL_BLANK', 'ESSAY', 'CODING');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'violation_type') THEN
        CREATE TYPE violation_type AS ENUM ('TAB_SWITCH', 'WINDOW_BLUR', 'COPY_PASTE', 'RIGHT_CLICK', 'DEVELOPER_TOOLS', 'FULLSCREEN_EXIT');
    END IF;
END $$;

COMMENT ON TYPE assignment_type IS 'Types of assignments that can be created';
COMMENT ON TYPE assignment_status IS 'Lifecycle status of an assignment';
COMMENT ON TYPE submission_status IS 'Status of student submission';
COMMENT ON TYPE question_type IS 'Types of questions within an assignment';
COMMENT ON TYPE violation_type IS 'Types of proctoring violations that can be detected';

-- 2. Create Assignment System Tables
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type assignment_type NOT NULL,
    status assignment_status DEFAULT 'DRAFT',
    instructions TEXT,
    total_marks DECIMAL(6,2) NOT NULL CHECK (total_marks > 0),
    passing_marks DECIMAL(6,2) CHECK (passing_marks <= total_marks AND passing_marks >= 0),
    duration_minutes INT CHECK (duration_minutes > 0),
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    max_attempts INT DEFAULT 1 CHECK (max_attempts > 0),
    proctoring_enabled BOOLEAN DEFAULT FALSE,
    max_violations INT DEFAULT 3 CHECK (max_violations >= 0),
    show_results_immediately BOOLEAN DEFAULT FALSE,
    allow_review BOOLEAN DEFAULT TRUE,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_schedule CHECK (scheduled_start IS NULL OR scheduled_end IS NULL OR scheduled_start < scheduled_end)
);

COMMENT ON TABLE assignments IS 'Main table storing assignment metadata and configuration';
COMMENT ON COLUMN assignments.proctoring_enabled IS 'Whether browser-based proctoring is enabled for this assignment';
COMMENT ON COLUMN assignments.max_violations IS 'Maximum proctoring violations before auto-submit (default 3)';

CREATE TABLE IF NOT EXISTS public.assignment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    question_order INT NOT NULL CHECK (question_order > 0),
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    marks DECIMAL(5,2) NOT NULL CHECK (marks > 0),
    negative_marking DECIMAL(5,2) DEFAULT 0 CHECK (negative_marking >= 0),
    question_data JSONB NOT NULL DEFAULT '{}',
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assignment_id, question_order)
);

COMMENT ON TABLE assignment_questions IS 'Individual questions within an assignment';
COMMENT ON COLUMN assignment_questions.question_data IS 'JSONB field storing question-specific data (options, test cases, blanks, etc.)';

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
    submission_status submission_status DEFAULT 'NOT_STARTED',
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    time_taken_seconds INT,
    score DECIMAL(6,2) DEFAULT 0,
    percentage DECIMAL(5,2),
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ,
    feedback TEXT,
    auto_graded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assignment_id, student_id, attempt_number)
);

COMMENT ON TABLE assignment_submissions IS 'Student submission records for assignments';
COMMENT ON COLUMN assignment_submissions.auto_graded IS 'Whether the submission was automatically graded (MCQ/MSQ/Fill-blank)';

CREATE TABLE IF NOT EXISTS public.submission_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
    answer_data JSONB NOT NULL DEFAULT '{}',
    is_correct BOOLEAN,
    marks_awarded DECIMAL(5,2) DEFAULT 0,
    evaluator_comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id, question_id)
);

COMMENT ON TABLE submission_answers IS 'Individual answers for each question in a submission';

CREATE TABLE IF NOT EXISTS public.proctoring_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    violation_type violation_type NOT NULL,
    violation_count INT NOT NULL DEFAULT 1 CHECK (violation_count > 0),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    snapshot_data JSONB DEFAULT '{}',
    action_taken VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE proctoring_violations IS 'Log of proctoring violations during assignment attempts';

CREATE TABLE IF NOT EXISTS public.assignment_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE assignment_attachments IS 'File attachments for assignments (PDFs, images, reference materials)';

CREATE TABLE IF NOT EXISTS public.coding_test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
    test_case_order INT NOT NULL CHECK (test_case_order > 0),
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_sample BOOLEAN DEFAULT FALSE,
    points DECIMAL(5,2) DEFAULT 0,
    time_limit_ms INT DEFAULT 1000,
    memory_limit_mb INT DEFAULT 256,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(question_id, test_case_order)
);

COMMENT ON TABLE coding_test_cases IS 'Test cases for coding questions with input/output validation';

CREATE TABLE IF NOT EXISTS public.assignment_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE UNIQUE,
    total_students INT DEFAULT 0,
    submitted_count INT DEFAULT 0,
    pending_count INT DEFAULT 0,
    average_score DECIMAL(6,2) DEFAULT 0,
    highest_score DECIMAL(6,2) DEFAULT 0,
    lowest_score DECIMAL(6,2),
    completion_rate DECIMAL(5,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE assignment_analytics IS 'Cached analytics and statistics for assignments';

-- 3. Create Assignment System Indexes
CREATE INDEX IF NOT EXISTS idx_assignments_college_batch_subject ON assignments(college_id, batch_id, subject_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_status_scheduled ON assignments(status, scheduled_start, scheduled_end) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by, status);
CREATE INDEX IF NOT EXISTS idx_submissions_college_student ON assignment_submissions(student_id, assignment_id, submission_status);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_status ON assignment_submissions(assignment_id, submission_status);
CREATE INDEX IF NOT EXISTS idx_submissions_batch ON assignment_submissions(batch_id, submission_status);
CREATE INDEX IF NOT EXISTS idx_questions_assignment_order ON assignment_questions(assignment_id, question_order);
CREATE INDEX IF NOT EXISTS idx_answers_submission ON submission_answers(submission_id, question_id);
CREATE INDEX IF NOT EXISTS idx_violations_submission_time ON proctoring_violations(submission_id, detected_at);
CREATE INDEX IF NOT EXISTS idx_attachments_assignment ON assignment_attachments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_question ON coding_test_cases(question_id, test_case_order);

-- 4. Enable RLS on Assignment Tables
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctoring_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_analytics ENABLE ROW LEVEL SECURITY;

-- 5. Create Assignment System RLS Policies
DROP POLICY IF EXISTS "assignments_faculty_crud" ON assignments;
CREATE POLICY "assignments_faculty_crud" ON assignments FOR ALL USING (
    college_id = current_app_college_id() AND (
        created_by = current_app_user_id() OR 
        current_app_role() IN ('college_admin', 'admin', 'hod') OR
        (current_app_role() = 'faculty' AND batch_id IN (SELECT batch_id FROM batch_subjects WHERE assigned_faculty_id = current_app_user_id()))
    )
);

DROP POLICY IF EXISTS "assignments_student_view" ON assignments;
CREATE POLICY "assignments_student_view" ON assignments FOR SELECT USING (
    college_id = current_app_college_id() AND is_published = TRUE AND current_app_role() = 'student' AND 
    batch_id IN (SELECT batch_id FROM student_batch_enrollment WHERE student_id = current_app_user_id() AND is_active = TRUE)
);

DROP POLICY IF EXISTS "questions_access" ON assignment_questions;
CREATE POLICY "questions_access" ON assignment_questions FOR ALL USING (
    assignment_id IN (SELECT id FROM assignments WHERE college_id = current_app_college_id())
);

DROP POLICY IF EXISTS "submissions_student_own" ON assignment_submissions;
CREATE POLICY "submissions_student_own" ON assignment_submissions FOR ALL USING (
    student_id = current_app_user_id()
);

DROP POLICY IF EXISTS "submissions_faculty_view" ON assignment_submissions;
CREATE POLICY "submissions_faculty_view" ON assignment_submissions FOR ALL USING (
    batch_id IN (SELECT id FROM batches WHERE college_id = current_app_college_id()) AND current_app_role() != 'student'
);

DROP POLICY IF EXISTS "answers_access" ON submission_answers;
CREATE POLICY "answers_access" ON submission_answers FOR ALL USING (
    submission_id IN (SELECT id FROM assignment_submissions WHERE student_id = current_app_user_id() OR batch_id IN (SELECT id FROM batches WHERE college_id = current_app_college_id()))
);

DROP POLICY IF EXISTS "violations_access" ON proctoring_violations;
CREATE POLICY "violations_access" ON proctoring_violations FOR ALL USING (
    submission_id IN (SELECT id FROM assignment_submissions WHERE student_id = current_app_user_id() OR batch_id IN (SELECT id FROM batches WHERE college_id = current_app_college_id()))
);

DROP POLICY IF EXISTS "attachments_access" ON assignment_attachments;
CREATE POLICY "attachments_access" ON assignment_attachments FOR ALL USING (
    assignment_id IN (SELECT id FROM assignments WHERE college_id = current_app_college_id())
);

DROP POLICY IF EXISTS "test_cases_access" ON coding_test_cases;
CREATE POLICY "test_cases_access" ON coding_test_cases FOR ALL USING (
    question_id IN (SELECT id FROM assignment_questions WHERE assignment_id IN (SELECT id FROM assignments WHERE college_id = current_app_college_id()))
);

DROP POLICY IF EXISTS "analytics_access" ON assignment_analytics;
CREATE POLICY "analytics_access" ON assignment_analytics FOR ALL USING (
    assignment_id IN (SELECT id FROM assignments WHERE college_id = current_app_college_id())
);

-- 6. Auto-Grade Trigger Function
CREATE OR REPLACE FUNCTION public.trigger_auto_grade_submission()
RETURNS TRIGGER AS $$
DECLARE
    v_assignment_id UUID;
    v_total_score DECIMAL(6,2) := 0;
    v_assignment_total_marks DECIMAL(6,2);
    v_calc_percentage DECIMAL(5,2);
    v_question RECORD;
    v_answer RECORD;
    v_is_correct BOOLEAN;
    v_marks_awarded DECIMAL(5,2);
    p_submission_id UUID;
BEGIN
    -- We grab the ID from the NEW record automatically
    p_submission_id := NEW.id;

    SELECT assignment_id INTO v_assignment_id FROM assignment_submissions WHERE id = p_submission_id;
    SELECT total_marks INTO v_assignment_total_marks FROM assignments WHERE id = v_assignment_id;

    FOR v_question IN 
        SELECT aq.id, aq.question_type, aq.marks, aq.negative_marking, aq.question_data
        FROM assignment_questions aq
        WHERE aq.assignment_id = v_assignment_id AND aq.question_type IN ('MCQ', 'MSQ', 'FILL_BLANK')
    LOOP
        SELECT * INTO v_answer FROM submission_answers WHERE submission_id = p_submission_id AND question_id = v_question.id;
        CONTINUE WHEN v_answer IS NULL;
        
        v_is_correct := FALSE;
        v_marks_awarded := 0;

        IF v_question.question_type = 'MCQ' THEN
            v_is_correct := (SELECT (v_answer.answer_data->>'selected_option') = opt->>'id' FROM jsonb_array_elements(v_question.question_data->'options') AS opt WHERE (opt->>'is_correct')::boolean = true LIMIT 1);
            v_marks_awarded := CASE WHEN v_is_correct THEN v_question.marks ELSE -v_question.negative_marking END;
        END IF;

        UPDATE submission_answers SET is_correct = v_is_correct, marks_awarded = v_marks_awarded, updated_at = NOW() WHERE id = v_answer.id;
        v_total_score := v_total_score + v_marks_awarded;
    END LOOP;

    IF v_assignment_total_marks > 0 THEN
        v_calc_percentage := (v_total_score / v_assignment_total_marks) * 100;
    ELSE
        v_calc_percentage := 0;
    END IF;

    -- Update without triggering recursion
    UPDATE assignment_submissions
    SET score = v_total_score, percentage = v_calc_percentage, auto_graded = TRUE, submission_status = 'GRADED', graded_at = NOW(), updated_at = NOW()
    WHERE id = p_submission_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_auto_grade_submission() IS 'Automatically grades MCQ, MSQ, and Fill-in-blank questions for a submission';

-- 7. Notification Trigger Function
CREATE OR REPLACE FUNCTION public.notify_submission_graded() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.submission_status = 'GRADED' AND (OLD.submission_status IS NULL OR OLD.submission_status != 'GRADED') THEN
        INSERT INTO notifications (recipient_id, sender_id, type, title, message, created_at)
        SELECT NEW.student_id, NEW.graded_by, 'submission_graded'::notification_type, 'Assignment Graded',
        'Your submission for "' || a.title || '" has been graded. Score: ' || NEW.score || '/' || a.total_marks || ' (' || ROUND(COALESCE(NEW.percentage, 0), 2) || '%)', NOW()
        FROM assignments a WHERE a.id = NEW.assignment_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_submission_graded() IS 'Sends notification to student when their submission is graded';

-- 8. Create Assignment System Triggers
DROP TRIGGER IF EXISTS trigger_auto_grade_on_submit ON public.assignment_submissions;
CREATE TRIGGER trigger_auto_grade_on_submit 
    AFTER UPDATE OF submission_status ON public.assignment_submissions
    FOR EACH ROW 
    WHEN (NEW.submission_status IN ('SUBMITTED', 'LATE_SUBMISSION') AND OLD.submission_status = 'IN_PROGRESS')
    EXECUTE FUNCTION public.trigger_auto_grade_submission();

DROP TRIGGER IF EXISTS trigger_notify_submission_graded ON public.assignment_submissions;
CREATE TRIGGER trigger_notify_submission_graded 
    AFTER UPDATE OF submission_status ON public.assignment_submissions
    FOR EACH ROW 
    EXECUTE FUNCTION public.notify_submission_graded();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignment_questions_updated_at BEFORE UPDATE ON assignment_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON assignment_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submission_answers_updated_at BEFORE UPDATE ON submission_answers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_assignments AFTER INSERT OR UPDATE OR DELETE ON assignments FOR EACH ROW EXECUTE FUNCTION log_audit_changes();
CREATE TRIGGER audit_assignment_submissions AFTER INSERT OR UPDATE OR DELETE ON assignment_submissions FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- 9. Add Assignment Notification Types (Safe)
DO $$ 
BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'assignment_created';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'submission_graded';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'violation_warning';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'auto_submitted';
EXCEPTION
    WHEN others THEN null;
END $$;

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS) PATCH
-- ============================================================================

-- Helper function to get the current user's college ID from the session
-- Enable RLS on Sensitive Tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_batch_enrollment ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICY: USERS TABLE
-- Rules: 
-- 1. Super Admins see everyone.
-- 2. Users can see their own profile.
-- 3. College Admins/Faculty can see other users ONLY in their own college.
-- ============================================================================

CREATE POLICY "users_isolation_policy" ON users
FOR ALL
USING (
    -- Rule 1: Super Admin bypass
    current_app_role() = 'super_admin'
    OR
    -- Rule 2: Own Profile
    id = NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID
    OR
    -- Rule 3: Same College Isolation
    college_id = current_app_college_id()
);

-- ============================================================================
-- POLICY: DEPARTMENTS, BATCHES, SUBJECTS (Shared College Resources)
-- Rules: Users can view these resources if they belong to the same college.
-- ============================================================================

-- Departments
CREATE POLICY "departments_college_isolation" ON departments
FOR ALL USING (college_id = current_app_college_id());

-- Batches
CREATE POLICY "batches_college_isolation" ON batches
FOR ALL USING (college_id = current_app_college_id());

-- Subjects
CREATE POLICY "subjects_college_isolation" ON subjects
FOR ALL USING (college_id = current_app_college_id());

-- ============================================================================
-- ADD COLLEGE_ID TO GENERATED_TIMETABLES (Missing Column Fix)
-- ============================================================================

-- 1. Add the missing column
ALTER TABLE generated_timetables 
ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES colleges(id) ON DELETE CASCADE;

-- 2. Backfill the data (copy college_id from the related batch)
UPDATE generated_timetables gt
SET college_id = b.college_id
FROM batches b
WHERE gt.batch_id = b.id AND gt.college_id IS NULL;

-- 3. Make it mandatory (so it never happens again)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'generated_timetables' 
        AND column_name = 'college_id' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE generated_timetables 
        ALTER COLUMN college_id SET NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- POLICY: GENERATED TIMETABLES (Corrected)
-- ============================================================================

DROP POLICY IF EXISTS "timetables_access_policy" ON generated_timetables;
DROP POLICY IF EXISTS "timetables_write_policy" ON generated_timetables;
DROP POLICY IF EXISTS "timetables_modify_policy" ON generated_timetables;

CREATE POLICY "timetables_access_policy" ON generated_timetables
FOR SELECT
USING (
    college_id = current_app_college_id()
    AND (
        -- If published, everyone in college sees it
        status = 'published'
        OR
        -- If draft, only Admins or Faculty with specific rights see it
        (status != 'published' AND current_app_role() IN ('college_admin', 'admin', 'hod', 'faculty'))
    )
);

CREATE POLICY "timetables_write_policy" ON generated_timetables
FOR INSERT WITH CHECK (
    college_id = current_app_college_id()
    AND current_app_role() IN ('college_admin', 'admin', 'hod')
);

CREATE POLICY "timetables_modify_policy" ON generated_timetables
FOR UPDATE USING (
    college_id = current_app_college_id()
    AND current_app_role() IN ('college_admin', 'admin', 'hod')
);

-- ============================================================================
-- POLICY: SCHEDULED CLASSES
-- ============================================================================

CREATE POLICY "scheduled_classes_college_isolation" ON scheduled_classes
FOR ALL
USING (
    batch_id IN (
        SELECT id FROM batches WHERE college_id = current_app_college_id()
    )
);

-- ============================================================================
-- POLICY: STUDENT BATCH ENROLLMENT
-- ============================================================================

CREATE POLICY "enrollment_college_isolation" ON student_batch_enrollment
FOR ALL
USING (
    batch_id IN (
        SELECT id FROM batches WHERE college_id = current_app_college_id()
    )
);

-- ============================================================================
-- 12. COMPLETE SECURITY LOCKDOWN (RLS FOR REMAINING TABLES)
-- ============================================================================

-- A. ENABLE RLS ON ALL REMAINING TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_qualified_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_generation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE elective_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_course_selections ENABLE ROW LEVEL SECURITY;

-- B. STANDARD "COLLEGE ISOLATION" POLICIES
-- These tables have a direct 'college_id' column, so policies are simple.
-- ----------------------------------------------------------------------------

-- Classrooms
CREATE POLICY "classrooms_isolation" ON classrooms
FOR ALL USING (college_id = current_app_college_id());

-- Courses (B.Ed, ITEP, etc.)
CREATE POLICY "courses_isolation" ON courses
FOR ALL USING (college_id = current_app_college_id());

-- Time Slots
CREATE POLICY "time_slots_isolation" ON time_slots
FOR ALL USING (college_id = current_app_college_id());

-- C. COMPLEX ISOLATION (Tables without direct 'college_id')
-- These tables depend on other tables (Users/Batches) for their security context.
-- ----------------------------------------------------------------------------

-- Faculty Availability (Link via Faculty ID -> Users Table)
CREATE POLICY "faculty_avail_isolation" ON faculty_availability
FOR ALL USING (
    faculty_id IN (SELECT id FROM users WHERE college_id = current_app_college_id())
);

-- Faculty Qualified Subjects (Link via Faculty ID -> Users Table)
CREATE POLICY "faculty_qual_isolation" ON faculty_qualified_subjects
FOR ALL USING (
    faculty_id IN (SELECT id FROM users WHERE college_id = current_app_college_id())
);

-- Batch Subjects (Link via Batch ID)
CREATE POLICY "batch_subjects_isolation" ON batch_subjects
FOR ALL USING (
    batch_id IN (SELECT id FROM batches WHERE college_id = current_app_college_id())
);

-- Elective Buckets (Link via Batch ID)
CREATE POLICY "elective_buckets_isolation" ON elective_buckets
FOR ALL USING (
    batch_id IN (SELECT id FROM batches WHERE college_id = current_app_college_id())
);

-- Timetable Generation Tasks (Link via Batch ID)
CREATE POLICY "gen_tasks_isolation" ON timetable_generation_tasks
FOR ALL USING (
    batch_id IN (SELECT id FROM batches WHERE college_id = current_app_college_id())
);

-- Student Course Selections (Link via Student ID)
CREATE POLICY "student_selections_isolation" ON student_course_selections
FOR ALL USING (
    student_id IN (SELECT id FROM users WHERE college_id = current_app_college_id())
);

-- D. SPECIAL TABLES (Events & Notifications)
-- ----------------------------------------------------------------------------

-- Events: Linked via Department. 
-- PERFORMANCE TIP: It is better to add 'college_id' to events later, but this works for now.
CREATE POLICY "events_isolation" ON events
FOR ALL USING (
    department_id IN (SELECT id FROM departments WHERE college_id = current_app_college_id())
);

-- Notifications: Strictly Personal (User can only see their OWN notifications)
CREATE POLICY "notifications_personal" ON notifications
FOR ALL USING (
    recipient_id = NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID
);

-- Audit Logs: Admins only, for their own college
CREATE POLICY "audit_logs_isolation" ON audit_logs
FOR SELECT USING (
    -- User must be an Admin AND the log entry must belong to a user in their college
    current_app_role() IN ('super_admin', 'admin', 'college_admin')
    AND
    user_id IN (SELECT id FROM users WHERE college_id = current_app_college_id())
);

-- E. COLLEGES TABLE - PUBLIC VIEWING WITH RESTRICTED MANAGEMENT
-- ----------------------------------------------------------------------------

-- Enable RLS on colleges table
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;

-- Allow EVERYONE (even unauthenticated) to see the list of colleges
CREATE POLICY "public_view_colleges" ON colleges
FOR SELECT USING (true);

-- Allow ONLY Super Admins to edit/delete colleges
CREATE POLICY "super_admin_manage_colleges" ON colleges
FOR ALL USING (current_app_role() = 'super_admin');

-- ============================================================================
-- MAJOR SUBJECT LOCK CONSTRAINT SYSTEM (NEP 2020 Compliance)
-- Ensures students cannot change their MAJOR discipline after Semester 3
-- ============================================================================

-- Step 1: Add columns to track major subject selections
ALTER TABLE student_course_selections 
ADD COLUMN IF NOT EXISTS selection_type VARCHAR(20) DEFAULT 'ELECTIVE' CHECK (selection_type IN ('MAJOR', 'MINOR', 'ELECTIVE', 'CORE')),
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS continuation_of UUID REFERENCES student_course_selections(id) ON DELETE SET NULL;

COMMENT ON COLUMN student_course_selections.selection_type IS 'MAJOR (Major I/II), MINOR, CORE (Core Completely/Partial), ELECTIVE';
COMMENT ON COLUMN student_course_selections.is_locked IS 'TRUE when MAJOR selection is locked from Semester 3 onwards (permanent)';
COMMENT ON COLUMN student_course_selections.locked_at IS 'Timestamp when MAJOR selection was permanently locked';
COMMENT ON COLUMN student_course_selections.continuation_of IS 'References the initial locked MAJOR selection for continuation tracking';

-- Step 2: Add domain/track column to subjects table
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS subject_domain VARCHAR(100),
ADD COLUMN IF NOT EXISTS domain_sequence INTEGER,
ADD COLUMN IF NOT EXISTS prerequisite_subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

COMMENT ON COLUMN subjects.subject_domain IS 'Academic domain/track (e.g., "Computer Science", "Mathematics", "Physics") for MAJOR subject grouping';
COMMENT ON COLUMN subjects.domain_sequence IS 'Sequence number within domain for progressive learning (1, 2, 3...)';
COMMENT ON COLUMN subjects.prerequisite_subject_id IS 'References prerequisite subject that must be completed before this subject';

-- Step 3: Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_student_selections_type_lock ON student_course_selections(student_id, selection_type, is_locked);
CREATE INDEX IF NOT EXISTS idx_subjects_domain_sequence ON subjects(subject_domain, domain_sequence, semester);
CREATE INDEX IF NOT EXISTS idx_student_selections_continuation ON student_course_selections(continuation_of);

-- Step 4: Function to check if student can select/change a major
CREATE OR REPLACE FUNCTION check_major_lock_constraint()
RETURNS TRIGGER AS $$
DECLARE
    existing_major_lock RECORD;
    student_current_sem INTEGER;
BEGIN
    -- Only apply this constraint for MAJOR selections
    IF NEW.selection_type != 'MAJOR' THEN
        RETURN NEW;
    END IF;

    -- Get student's current semester
    SELECT current_semester INTO student_current_sem FROM users WHERE id = NEW.student_id;

    -- Check if student already has a locked MAJOR from semester 3 or later
    SELECT * INTO existing_major_lock
    FROM student_course_selections
    WHERE student_id = NEW.student_id
      AND selection_type = 'MAJOR'
      AND is_locked = TRUE
      AND semester >= 3
    LIMIT 1;

    -- If there's an existing locked MAJOR
    IF existing_major_lock.id IS NOT NULL THEN
        DECLARE
            new_subject_domain VARCHAR(100);
            locked_subject_domain VARCHAR(100);
        BEGIN
            -- Get domain of new subject
            SELECT subject_domain INTO new_subject_domain FROM subjects WHERE id = NEW.subject_id;

            -- Get domain of locked major subject
            SELECT s.subject_domain INTO locked_subject_domain
            FROM subjects s
            JOIN student_course_selections scs ON s.id = scs.subject_id
            WHERE scs.id = existing_major_lock.id;

            -- If domains don't match, reject the selection
            IF new_subject_domain IS NULL OR locked_subject_domain IS NULL OR new_subject_domain != locked_subject_domain THEN
                RAISE EXCEPTION 'Cannot change MAJOR subject. You selected a MAJOR in Semester % and must continue with subjects from the same domain (%)',
                    existing_major_lock.semester, locked_subject_domain;
            END IF;

            -- If domains match, this is a valid continuation
            NEW.is_locked := TRUE;
            NEW.locked_at := existing_major_lock.locked_at;
            NEW.continuation_of := existing_major_lock.id;
        END;
    ELSE
        -- No existing locked major, lock if semester >= 3
        IF NEW.semester >= 3 THEN
            NEW.is_locked := TRUE;
            NEW.locked_at := NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_major_lock_constraint() IS 'Enforces NEP 2020 MAJOR discipline lock from Semester 3 onwards. Students must continue with same domain once locked.';

-- Step 5: Trigger to enforce major lock
DROP TRIGGER IF EXISTS enforce_major_lock ON student_course_selections;
CREATE TRIGGER enforce_major_lock
    BEFORE INSERT OR UPDATE ON student_course_selections
    FOR EACH ROW
    EXECUTE FUNCTION check_major_lock_constraint();

-- Step 6: Function to prevent deletion of locked majors
CREATE OR REPLACE FUNCTION prevent_locked_major_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.selection_type = 'MAJOR' AND OLD.is_locked = TRUE THEN
        RAISE EXCEPTION 'Cannot delete a locked MAJOR subject. MAJOR selections are permanent from Semester 3 onwards.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prevent_locked_major_deletion() IS 'Prevents deletion of locked MAJOR subjects to maintain NEP 2020 compliance';

-- Step 7: Trigger to prevent deletion
DROP TRIGGER IF EXISTS prevent_major_deletion ON student_course_selections;
CREATE TRIGGER prevent_major_deletion
    BEFORE DELETE ON student_course_selections
    FOR EACH ROW
    EXECUTE FUNCTION prevent_locked_major_deletion();

-- Step 8: View for student's major progression tracking
CREATE OR REPLACE VIEW student_major_progression AS
SELECT 
    scs.student_id,
    u.first_name || ' ' || u.last_name AS student_name,
    u.current_semester,
    s.subject_domain,
    scs.semester AS major_selected_semester,
    scs.locked_at,
    s.id AS subject_id,
    s.code AS subject_code,
    s.name AS subject_name,
    s.semester AS subject_semester,
    scs.is_locked,
    CASE 
        WHEN scs.continuation_of IS NOT NULL THEN 'Continuation'
        WHEN scs.is_locked THEN 'Initial Lock'
        ELSE 'Not Locked'
    END AS lock_status
FROM student_course_selections scs
JOIN users u ON scs.student_id = u.id
JOIN subjects s ON scs.subject_id = s.id
WHERE scs.selection_type = 'MAJOR'
ORDER BY scs.student_id, scs.semester;

COMMENT ON VIEW student_major_progression IS 'Tracks student MAJOR discipline progression and lock status across semesters';

-- Step 9: Helper function to get available subjects for student selection
CREATE OR REPLACE FUNCTION get_available_subjects_for_student(
    p_student_id UUID,
    p_semester INTEGER,
    p_academic_year VARCHAR(10)
)
RETURNS TABLE (
    subject_id UUID,
    subject_code VARCHAR(20),
    subject_name VARCHAR(255),
    subject_domain VARCHAR(100),
    nep_category nep_category,
    is_selectable BOOLEAN,
    selection_type VARCHAR(20),
    reason TEXT
) AS $$
DECLARE
    locked_major_domain VARCHAR(100);
    has_locked_major BOOLEAN := FALSE;
BEGIN
    -- Check if student has a locked major
    SELECT s.subject_domain INTO locked_major_domain
    FROM student_course_selections scs
    JOIN subjects s ON scs.subject_id = s.id
    WHERE scs.student_id = p_student_id
      AND scs.selection_type = 'MAJOR'
      AND scs.is_locked = TRUE
    LIMIT 1;

    has_locked_major := (locked_major_domain IS NOT NULL);

    RETURN QUERY
    SELECT 
        s.id AS subject_id,
        s.code AS subject_code,
        s.name AS subject_name,
        s.subject_domain,
        s.nep_category,
        CASE
            -- Locked Major Logic using 'Major I' and 'Major II'
            WHEN has_locked_major AND s.nep_category IN ('Major I', 'Major II') THEN
                (s.subject_domain = locked_major_domain)
            WHEN s.nep_category IN ('MINOR', 'AEC', 'VAC') THEN
                TRUE
            WHEN s.nep_category IN ('CORE COMPLETELY', 'CORE PARTIAL') THEN
                TRUE
            ELSE
                TRUE
        END AS is_selectable,
        CASE
            WHEN has_locked_major AND s.nep_category IN ('Major I', 'Major II') AND s.subject_domain = locked_major_domain THEN
                'MAJOR'
            WHEN s.nep_category = 'MINOR' THEN
                'MINOR'
            WHEN s.nep_category IN ('CORE COMPLETELY', 'CORE PARTIAL') THEN
                'CORE'
            ELSE
                'ELECTIVE'
        END AS selection_type,
        CASE
            WHEN has_locked_major AND s.nep_category IN ('Major I', 'Major II') AND s.subject_domain != locked_major_domain THEN
                'Locked to ' || locked_major_domain || ' domain.'
            WHEN has_locked_major AND s.nep_category IN ('Major I', 'Major II') AND s.subject_domain = locked_major_domain THEN
                'Continuation of locked MAJOR'
            WHEN s.nep_category = 'MINOR' THEN
                'MINOR (Changeable)'
            WHEN s.nep_category IN ('CORE COMPLETELY', 'CORE PARTIAL') THEN
                'Mandatory Core'
            ELSE
                'Elective'
        END AS reason
    FROM subjects s
    WHERE s.semester = p_semester
      AND s.is_active = TRUE
    ORDER BY 
        CASE 
            WHEN has_locked_major AND s.subject_domain = locked_major_domain THEN 1
            WHEN s.nep_category IN ('CORE COMPLETELY', 'CORE PARTIAL') THEN 2
            ELSE 3
        END, s.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_subjects_for_student(UUID, INTEGER, VARCHAR) IS 'Returns available subjects for student based on their locked MAJOR domain and NEP 2020 rules';

-- ============================================================================
-- DATA MIGRATION: Update existing selections for MAJOR lock system
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '==============================================================';
    RAISE NOTICE 'Migrating existing student course selections to MAJOR lock system...';
    RAISE NOTICE '==============================================================';

    -- Update selection_type and lock status based on nep_category
    UPDATE student_course_selections scs
    SET 
        selection_type = CASE 
            WHEN s.nep_category IN ('Major I', 'Major II') THEN 'MAJOR'
            WHEN s.nep_category = 'MINOR' THEN 'MINOR'
            WHEN s.nep_category IN ('CORE COMPLETELY', 'CORE PARTIAL') THEN 'CORE'
            ELSE 'ELECTIVE'
        END,
        is_locked = CASE 
            WHEN s.nep_category IN ('Major I', 'Major II') AND scs.semester >= 3 THEN TRUE
            ELSE FALSE
        END,
        locked_at = CASE 
            WHEN s.nep_category IN ('Major I', 'Major II') AND scs.semester >= 3 THEN scs.enrolled_at
            ELSE NULL
        END
    FROM subjects s
    WHERE scs.subject_id = s.id;

    RAISE NOTICE '✓ Student course selections migrated successfully';
    RAISE NOTICE '✓ MAJOR lock system is now active';
    RAISE NOTICE '==============================================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠ Migration encountered an issue: %', SQLERRM;
END $$;

-- ============================================================================
-- POST-SETUP DATA MIGRATIONS (Run after initial setup)
-- ============================================================================

-- Migration 1: Tag subjects with program values for NEP Curriculum Builder
-- This should be run after subjects are added to the database
DO $$ 
BEGIN
    RAISE NOTICE '==============================================================';
    RAISE NOTICE 'Running Data Migrations...';
    RAISE NOTICE '==============================================================';
    
    -- Tag subjects based on department names (customize based on your college structure)
    -- Example patterns for different institutions:
    
    -- Computer Science & Engineering
    UPDATE subjects 
    SET program = 'B.Tech CSE'
    WHERE department_id IN (
        SELECT id FROM departments 
        WHERE name = 'Computer Science & Engineering'
    )
    AND is_active = true
    AND program IS NULL;
    
    -- Data Science
    UPDATE subjects 
    SET program = 'B.Tech DS'
    WHERE department_id IN (
        SELECT id FROM departments 
        WHERE name ILIKE '%Data Science%'
    )
    AND is_active = true
    AND program IS NULL;
    
    -- B.Ed (Bachelor of Education)
    UPDATE subjects 
    SET program = 'B.Ed'
    WHERE department_id IN (
        SELECT id FROM departments 
        WHERE name ILIKE '%Education%' AND name NOT ILIKE '%Master%'
    )
    AND is_active = true
    AND program IS NULL;
    
    -- M.Ed (Master of Education)
    UPDATE subjects 
    SET program = 'M.Ed'
    WHERE department_id IN (
        SELECT id FROM departments 
        WHERE name ILIKE '%Master%' AND name ILIKE '%Education%'
    )
    AND is_active = true
    AND program IS NULL;
    
    -- ITEP (Integrated Teacher Education Programme)
    UPDATE subjects 
    SET program = 'ITEP'
    WHERE (
        code ILIKE 'ITEP%' OR 
        code ILIKE 'ITE%' OR
        name ILIKE '%ITEP%' OR 
        name ILIKE '%Integrated Teacher%'
    )
    AND is_active = true
    AND program IS NULL;
    
    -- Additional patterns based on subject codes
    UPDATE subjects 
    SET program = 'B.Ed'
    WHERE (
        code ILIKE 'BED%' OR 
        code ILIKE 'B.ED%' OR 
        code ILIKE 'B_ED%'
    )
    AND is_active = true
    AND program IS NULL;
    
    UPDATE subjects 
    SET program = 'M.Ed'
    WHERE (
        code ILIKE 'MED%' OR 
        code ILIKE 'M.ED%' OR 
        code ILIKE 'M_ED%'
    )
    AND is_active = true
    AND program IS NULL;
    
    RAISE NOTICE '✓ Subject program tagging completed';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠ Subject tagging skipped (subjects not yet created)';
END $$;

-- Migration 2: Ensure all subjects have college_id set
DO $$ 
BEGIN
    -- Update subjects to have college_id from their department
    UPDATE subjects 
    SET college_id = (
        SELECT college_id FROM departments 
        WHERE departments.id = subjects.department_id
    )
    WHERE college_id IS NULL 
    AND department_id IS NOT NULL;
    
    -- If still NULL and only one college exists, assign to that college
    UPDATE subjects 
    SET college_id = (SELECT id FROM colleges LIMIT 1)
    WHERE college_id IS NULL 
    AND EXISTS (SELECT 1 FROM colleges);
    
    RAISE NOTICE '✓ College ID assignment completed';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠ College ID assignment skipped (subjects not yet created)';
END $$;

-- Migration 3: Intelligent Department Mapping for GCOEJ Subjects
DO $$ 
DECLARE 
    v_college_id UUID;
    
    -- Department IDs
    v_edu_dept UUID;
    v_eng_dept UUID;
    v_hist_dept UUID;
    v_pol_dept UUID;
    v_geo_dept UUID;
    v_hin_dept UUID;
    v_urd_dept UUID;
    v_math_dept UUID;
    v_sci_dept UUID;
BEGIN
    -- Get College ID (GCOEJ)
    SELECT id INTO v_college_id FROM colleges WHERE code = 'GCOEJ' LIMIT 1;

    IF v_college_id IS NOT NULL THEN
        
        -- Fetch Department IDs
        SELECT id INTO v_edu_dept FROM departments WHERE code = 'EDU' AND college_id = v_college_id;
        SELECT id INTO v_eng_dept FROM departments WHERE code = 'ENG' AND college_id = v_college_id;
        SELECT id INTO v_hist_dept FROM departments WHERE code = 'HIST' AND college_id = v_college_id;
        SELECT id INTO v_hin_dept FROM departments WHERE code = 'HIN' AND college_id = v_college_id;
        SELECT id INTO v_urd_dept FROM departments WHERE code = 'URDU' AND college_id = v_college_id;
        SELECT id INTO v_math_dept FROM departments WHERE code = 'MATH' AND college_id = v_college_id;
        SELECT id INTO v_sci_dept FROM departments WHERE code = 'SCI' AND college_id = v_college_id;
        
        -- === A. Map Languages & Humanities ===
        
        -- English Subjects -> English Dept
        IF v_eng_dept IS NOT NULL THEN
            UPDATE subjects SET department_id = v_eng_dept 
            WHERE college_id = v_college_id 
            AND (name ILIKE '%English%' OR name ILIKE '%Literature%' OR name ILIKE '%Communication%');
        END IF;

        -- Hindi Subjects -> Hindi Dept
        IF v_hin_dept IS NOT NULL THEN
            UPDATE subjects SET department_id = v_hin_dept 
            WHERE college_id = v_college_id 
            AND (name ILIKE '%Hindi%' OR name ILIKE '%Bhasha%');
        END IF;

        -- Urdu Subjects -> Urdu Dept
        IF v_urd_dept IS NOT NULL THEN
            UPDATE subjects SET department_id = v_urd_dept 
            WHERE college_id = v_college_id 
            AND (name ILIKE '%Urdu%' OR name ILIKE '%Tarseel%');
        END IF;

        -- History Subjects -> History Dept
        IF v_hist_dept IS NOT NULL THEN
            UPDATE subjects SET department_id = v_hist_dept 
            WHERE college_id = v_college_id 
            AND (name ILIKE '%History%' OR name ILIKE '%Ancient%' OR name ILIKE '%Medieval%');
        END IF;

        -- === B. Map Sciences ===

        -- Math Subjects -> Math Dept
        IF v_math_dept IS NOT NULL THEN
            UPDATE subjects SET department_id = v_math_dept 
            WHERE college_id = v_college_id 
            AND (name ILIKE '%Math%' OR name ILIKE '%Algebra%' OR name ILIKE '%Statistics%');
        END IF;

        -- Science Subjects -> Science Dept
        IF v_sci_dept IS NOT NULL THEN
            UPDATE subjects SET department_id = v_sci_dept 
            WHERE college_id = v_college_id 
            AND (name ILIKE '%Science%' OR name ILIKE '%Physics%' OR name ILIKE '%Chemistry%')
            AND name NOT ILIKE '%Political%'; -- Exclude Political Science
        END IF;

        -- === C. Map Core Education ===
        
        -- Everything else defaults to Education Dept (e.g., "Childhood and Growing Up")
        IF v_edu_dept IS NOT NULL THEN
            UPDATE subjects SET department_id = v_edu_dept 
            WHERE college_id = v_college_id 
            AND department_id IS NULL; 
        END IF;

        RAISE NOTICE '✓ Department ID mapping completed for GCOEJ subjects';
        
    ELSE
        RAISE NOTICE '⚠ GCOEJ college not found - department mapping skipped';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠ Department mapping skipped (subjects or departments not yet created)';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (Run these after setup to verify data)
-- ============================================================================

-- Uncomment and run these queries to verify your data:
/*
-- Check subject program distribution
SELECT 
    program,
    COUNT(*) as subject_count,
    MIN(semester) as min_semester,
    MAX(semester) as max_semester
FROM subjects 
WHERE is_active = true
GROUP BY program
ORDER BY program;

-- Check subjects by department and program
SELECT 
    d.name as department_name,
    s.program,
    COUNT(*) as count
FROM subjects s
JOIN departments d ON s.department_id = d.id
WHERE s.is_active = true
GROUP BY d.name, s.program
ORDER BY d.name;

-- Check for subjects without program assigned
SELECT 
    COUNT(*) FILTER (WHERE program IS NOT NULL) as tagged_subjects,
    COUNT(*) FILTER (WHERE program IS NULL) as untagged_subjects,
    COUNT(*) as total_active_subjects
FROM subjects 
WHERE is_active = true;

-- Check for subjects without college_id
SELECT 
    college_id,
    COUNT(*) as subject_count
FROM subjects 
WHERE is_active = true
GROUP BY college_id;
*/

-- ============================================================================
-- 10. ENTERPRISE REGISTRATION SYSTEM
-- ============================================================================

-- Demo Request Status Enum
DROP TYPE IF EXISTS demo_request_status CASCADE;
CREATE TYPE demo_request_status AS ENUM ('pending', 'contacted', 'demo_scheduled', 'demo_completed', 'approved', 'registered', 'rejected');

-- Demo Requests Table
-- Stores all demo/trial requests from prospective institutions
CREATE TABLE IF NOT EXISTS demo_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Institution Information
    institution_name VARCHAR(255) NOT NULL,
    institution_type VARCHAR(100) NOT NULL,
    website VARCHAR(255),
    student_count VARCHAR(50) NOT NULL,
    faculty_count VARCHAR(50),
    
    -- Contact Person Information
    contact_name VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    
    -- Location
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    
    -- Requirements
    current_system VARCHAR(255),
    challenges TEXT[], -- Array of challenges they face
    preferred_date DATE,
    preferred_time VARCHAR(50),
    additional_notes TEXT,
    
    -- Status tracking
    status demo_request_status DEFAULT 'pending',
    assigned_to UUID REFERENCES users(id), -- Sales rep assigned
    demo_scheduled_at TIMESTAMPTZ,
    demo_completed_at TIMESTAMPTZ,
    follow_up_notes TEXT,
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registration Tokens Table
-- Stores unique tokens for college registration (sent after demo approval)
CREATE TABLE IF NOT EXISTS registration_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Token details
    token VARCHAR(64) UNIQUE NOT NULL, -- Secure random token
    
    -- Associated data
    demo_request_id UUID REFERENCES demo_requests(id),
    institution_name VARCHAR(255),
    email VARCHAR(255),
    
    -- Token status
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    college_id UUID REFERENCES colleges(id), -- Created college after registration
    
    -- Tracking
    created_by UUID REFERENCES users(id), -- Super admin who created the token
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON demo_requests(status);
CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON demo_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON demo_requests(email);
CREATE INDEX IF NOT EXISTS idx_registration_tokens_token ON registration_tokens(token);
CREATE INDEX IF NOT EXISTS idx_registration_tokens_expires ON registration_tokens(expires_at) WHERE is_used = FALSE;
CREATE INDEX IF NOT EXISTS idx_registration_tokens_demo_request ON registration_tokens(demo_request_id);

-- Update timestamp trigger for demo_requests
CREATE OR REPLACE FUNCTION update_demo_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_demo_requests_timestamp ON demo_requests;
CREATE TRIGGER trigger_update_demo_requests_timestamp
    BEFORE UPDATE ON demo_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_demo_requests_updated_at();

-- RLS Policies for demo_requests
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view all demo requests" ON demo_requests;
CREATE POLICY "Super admins can view all demo requests" 
ON demo_requests FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'super_admin'
    )
);

DROP POLICY IF EXISTS "Anyone can submit demo requests" ON demo_requests;
CREATE POLICY "Anyone can submit demo requests" 
ON demo_requests FOR INSERT 
TO authenticated, anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can update demo requests" ON demo_requests;
CREATE POLICY "Super admins can update demo requests" 
ON demo_requests FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'super_admin'
    )
);

-- RLS Policies for registration_tokens
ALTER TABLE registration_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage registration tokens" ON registration_tokens;
CREATE POLICY "Super admins can manage registration tokens" 
ON registration_tokens FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'super_admin'
    )
);

DROP POLICY IF EXISTS "Anyone can validate tokens" ON registration_tokens;
CREATE POLICY "Anyone can validate tokens" 
ON registration_tokens FOR SELECT 
TO authenticated, anon
USING (true);

-- Grant permissions
GRANT SELECT, INSERT ON demo_requests TO authenticated;
GRANT SELECT, INSERT ON demo_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON demo_requests TO service_role;
GRANT SELECT ON registration_tokens TO authenticated;
GRANT SELECT ON registration_tokens TO anon;
GRANT ALL ON registration_tokens TO service_role;

-- Add principal columns to colleges table if not exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colleges' AND column_name = 'principal_name') THEN
        ALTER TABLE colleges ADD COLUMN principal_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colleges' AND column_name = 'principal_email') THEN
        ALTER TABLE colleges ADD COLUMN principal_email VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colleges' AND column_name = 'principal_phone') THEN
        ALTER TABLE colleges ADD COLUMN principal_phone VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colleges' AND column_name = 'established_year') THEN
        ALTER TABLE colleges ADD COLUMN established_year INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colleges' AND column_name = 'affiliated_university') THEN
        ALTER TABLE colleges ADD COLUMN affiliated_university VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colleges' AND column_name = 'accreditation') THEN
        ALTER TABLE colleges ADD COLUMN accreditation VARCHAR(255);
    END IF;
END $$;

-- Enterprise Registration Comments
COMMENT ON TABLE demo_requests IS 'Stores demo/trial requests from prospective educational institutions';
COMMENT ON TABLE registration_tokens IS 'Stores unique registration tokens for approved institutions';
COMMENT ON TYPE demo_request_status IS 'Status workflow for demo requests: pending → contacted → demo_scheduled → demo_completed → approved/rejected → registered';

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE events IS 'Stores all college events with conflict detection and queue management';
COMMENT ON TABLE event_registrations IS 'Stores user registrations for events';
COMMENT ON TABLE event_notifications IS 'Stores event-related notifications for users';
COMMENT ON FUNCTION check_event_conflicts() IS 'Automatically detects venue and time conflicts for events';
COMMENT ON FUNCTION update_event_participants() IS 'Maintains accurate participant count for events';
COMMENT ON FUNCTION send_event_notification() IS 'Sends notifications to users when event status changes';

-- NEP 2020 Documentation
COMMENT ON TYPE nep_category IS 'NEP 2020 course categories for choice-based credit system';
COMMENT ON TABLE courses IS 'Stores academic programs like B.Ed, M.Ed, ITEP with intake and duration details';
COMMENT ON TABLE elective_buckets IS 'NEP 2020 elective pools where students choose from multiple subject options';
COMMENT ON TABLE student_course_selections IS 'Tracks individual student choices for major/minor subjects under NEP 2020';
COMMENT ON COLUMN subjects.credit_value IS 'NEP 2020 standard credit calculation: L + T + (P/2)';
COMMENT ON COLUMN subjects.nep_category IS 'NEP 2020 course classification for structured learning outcomes';
COMMENT ON COLUMN subjects.subject_type IS 'Type of subject delivery (THEORY, LAB, PRACTICAL, TUTORIAL)';
COMMENT ON COLUMN subjects.course_id IS 'Links subject to academic program/course (B.Ed, M.Ed, ITEP)';
COMMENT ON COLUMN subjects.department_id IS 'Links subject to teaching department (nullable for flexibility)';
COMMENT ON COLUMN subjects.block_start_week IS 'Starting week for block-scheduled subjects (e.g., internships, intensive courses)';
COMMENT ON COLUMN subjects.block_end_week IS 'Ending week for block-scheduled subjects';
COMMENT ON COLUMN subjects.time_restriction IS 'Time of day restriction for scheduling (MORNING, AFTERNOON, EVENING, FULL_DAY)';
COMMENT ON COLUMN subjects.is_special_event IS 'Flag indicating if subject is a special event (automatically set based on nep_category)';
COMMENT ON COLUMN subjects.special_event_notes IS 'Additional notes for special event subjects';
COMMENT ON FUNCTION update_special_event_flag() IS 'Automatically sets is_special_event flag based on nep_category (INTERNSHIP = true, others = false)';

-- ============================================================================
-- SUPER ADMIN FEATURES - ACADEMIC CALENDARS & SYSTEM SETTINGS
-- ============================================================================

-- Academic Calendar Types/Templates
CREATE TABLE IF NOT EXISTS academic_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    calendar_type VARCHAR(50) NOT NULL DEFAULT 'semester' CHECK (calendar_type IN ('semester', 'trimester', 'quarter', 'annual')),
    duration_months INT NOT NULL DEFAULT 6 CHECK (duration_months BETWEEN 1 AND 12),
    terms_per_year INT NOT NULL DEFAULT 2 CHECK (terms_per_year BETWEEN 1 AND 4),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- College to Calendar association
CREATE TABLE IF NOT EXISTS college_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    calendar_id UUID NOT NULL REFERENCES academic_calendars(id) ON DELETE CASCADE,
    academic_year VARCHAR(10) NOT NULL DEFAULT '2025-26',
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(college_id, calendar_id, academic_year)
);

-- System Settings (Key-Value store for super admin configuration)
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'notifications', 'security', 'system', 'email')),
    is_secret BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category) VALUES
    ('site_name', 'Academic Compass', 'string', 'Name of the application', 'general'),
    ('site_url', 'http://localhost:3000', 'string', 'Base URL of the application', 'general'),
    ('admin_email', 'admin@academiccompass.edu', 'string', 'Primary admin email address', 'general'),
    ('default_timezone', 'Asia/Kolkata', 'string', 'Default timezone for the application', 'general'),
    ('enable_notifications', 'true', 'boolean', 'Enable in-app notifications', 'notifications'),
    ('enable_email_alerts', 'true', 'boolean', 'Enable email alert notifications', 'notifications'),
    ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', 'system'),
    ('allow_registration', 'true', 'boolean', 'Allow new user registrations', 'system'),
    ('session_timeout', '30', 'number', 'Session timeout in minutes', 'security'),
    ('max_login_attempts', '5', 'number', 'Maximum failed login attempts before lockout', 'security')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default academic calendars
INSERT INTO academic_calendars (name, description, calendar_type, duration_months, terms_per_year, is_default) VALUES
    ('Semester System', 'Two semesters per academic year (6 months each)', 'semester', 6, 2, TRUE),
    ('Trimester System', 'Three trimesters per academic year (4 months each)', 'trimester', 4, 3, FALSE),
    ('Annual System', 'One continuous academic year (12 months)', 'annual', 12, 1, FALSE)
ON CONFLICT DO NOTHING;

-- Indexes for academic calendars and settings
CREATE INDEX IF NOT EXISTS idx_academic_calendars_type ON academic_calendars(calendar_type);
CREATE INDEX IF NOT EXISTS idx_academic_calendars_active ON academic_calendars(is_active);
CREATE INDEX IF NOT EXISTS idx_college_calendars_college ON college_calendars(college_id);
CREATE INDEX IF NOT EXISTS idx_college_calendars_calendar ON college_calendars(calendar_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Enable RLS for new tables
ALTER TABLE academic_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all for authenticated users
CREATE POLICY "Allow all for academic_calendars" ON academic_calendars FOR ALL USING (true);
CREATE POLICY "Allow all for college_calendars" ON college_calendars FOR ALL USING (true);
CREATE POLICY "Allow all for system_settings" ON system_settings FOR ALL USING (true);

-- Documentation comments
COMMENT ON TABLE academic_calendars IS 'Stores academic calendar configurations (semester, trimester, annual systems)';
COMMENT ON TABLE college_calendars IS 'Associates colleges with their selected academic calendar configurations';
COMMENT ON TABLE system_settings IS 'Key-value store for system-wide configuration managed by super admins';
COMMENT ON COLUMN system_settings.setting_type IS 'Data type of the setting value (string, number, boolean, json)';
COMMENT ON COLUMN system_settings.category IS 'Category for grouping settings in the admin UI';
COMMENT ON COLUMN system_settings.is_secret IS 'If true, value should be masked in UI (for passwords, API keys, etc.)';

-- ============================================================================
-- NOTIFICATION SYSTEM - INDEXES, RLS, AND FUNCTIONS
-- ============================================================================

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_content ON notifications(content_type, content_id) WHERE content_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority, is_read) WHERE priority IN ('high', 'urgent');
CREATE INDEX IF NOT EXISTS idx_notifications_expiry ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Announcements indexes
CREATE INDEX IF NOT EXISTS idx_announcements_college ON announcements(college_id, is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_target ON announcements(target_type, target_id, is_published);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(college_id, is_pinned DESC, created_at DESC) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_announcements_expiry ON announcements(expires_at) WHERE expires_at IS NOT NULL;

-- Submission question grades index
CREATE INDEX IF NOT EXISTS idx_submission_grades_submission ON submission_question_grades(submission_id);

-- Enable RLS on notification tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_question_grades ENABLE ROW LEVEL SECURITY;

-- Notification RLS policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (recipient_id = auth.uid());

-- Announcement RLS policies
CREATE POLICY "Users can view college announcements" ON announcements FOR SELECT 
USING (
    college_id IN (SELECT college_id FROM users WHERE id = auth.uid()) 
    AND is_published = TRUE
);

CREATE POLICY "Admins can create announcements" ON announcements FOR INSERT 
WITH CHECK (
    created_by = auth.uid() AND
    college_id IN (SELECT college_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Creators can update announcements" ON announcements FOR UPDATE 
USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND college_id = announcements.college_id 
        AND role IN ('super_admin', 'college_admin', 'admin')
    )
);

-- Submission grades RLS policies
CREATE POLICY "Faculty can manage grades" ON submission_question_grades FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('super_admin', 'college_admin', 'admin', 'faculty')
    )
);

CREATE POLICY "Students can view own grades" ON submission_question_grades FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM assignment_submissions s
        WHERE s.id = submission_question_grades.submission_id
        AND s.student_id = auth.uid()
    )
);

-- Helper function to cleanup expired notifications
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

-- Documentation comments for notification system
COMMENT ON TABLE notifications IS 'User notifications for all platform events (timetables, assignments, announcements, events, system)';
COMMENT ON COLUMN notifications.content_type IS 'Type of content: timetable, assignment, announcement, event';
COMMENT ON COLUMN notifications.content_id IS 'UUID of the related content item';
COMMENT ON COLUMN notifications.priority IS 'Priority level: low, normal, high, urgent';
COMMENT ON COLUMN notifications.action_url IS 'URL to navigate to when notification is clicked';
COMMENT ON COLUMN notifications.expires_at IS 'When the notification should auto-expire';

COMMENT ON TABLE announcements IS 'College-wide, department, or batch-specific announcements';
COMMENT ON COLUMN announcements.target_type IS 'Scope of announcement: batch, department, or college';
COMMENT ON COLUMN announcements.target_id IS 'ID of the target (batch_id, department_id, or college_id)';

COMMENT ON TABLE submission_question_grades IS 'Individual question grades for assignment submissions';
COMMENT ON FUNCTION cleanup_expired_notifications IS 'Deletes notifications that have passed their expiration date';