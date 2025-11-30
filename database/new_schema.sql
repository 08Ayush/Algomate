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
CREATE TYPE notification_type AS ENUM ('timetable_published', 'schedule_change', 'system_alert', 'approval_request');
CREATE TYPE nep_category AS ENUM (
    'MAJOR', 
    'MINOR', 
    'MULTIDISCIPLINARY', 
    'AEC',          -- Ability Enhancement Course
    'VAC',          -- Value Added Course
    'CORE', 
    'PEDAGOGY',     -- Specific to B.Ed/ITEP
    'INTERNSHIP'    -- Block-out events
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
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    head_of_department UUID,
    department_type VARCHAR(50) DEFAULT 'academic' CHECK (department_type IN ('academic', 'research', 'administration')),
    max_hours_per_day INT DEFAULT 8 CHECK (max_hours_per_day BETWEEN 1 AND 12),
    -- FIX 2: Added explicit type cast to the default array
    working_days day_of_week[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']::day_of_week[],
    default_class_duration INT DEFAULT 60 CHECK (default_class_duration BETWEEN 30 AND 180),
    algorithm_priority INT DEFAULT 5 CHECK (algorithm_priority BETWEEN 1 AND 10),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(college_id, code),
    UNIQUE(college_id, name)
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
    access_level access_level DEFAULT 'READ',
    student_id VARCHAR(50),
    admission_year INT,
    current_semester INT CHECK (current_semester BETWEEN 1 AND 8),
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
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(college_id, name)
);

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    credits_per_week INT NOT NULL CHECK (credits_per_week BETWEEN 1 AND 10),
    semester INT CHECK (semester BETWEEN 1 AND 8),
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
    -- NEP 2020 Fields
    nep_category nep_category DEFAULT 'CORE',
    lecture_hours INTEGER DEFAULT 1,
    tutorial_hours INTEGER DEFAULT 0,
    practical_hours INTEGER DEFAULT 0,
    -- Generated column for automatic credit calculation: L + T + (P/2)
    credit_value NUMERIC(3,1) 
        GENERATED ALWAYS AS (lecture_hours + tutorial_hours + (practical_hours / 2.0)) STORED,
    course_group_id UUID,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(college_id, department_id, code)
);

-- NEP 2020: Elective Buckets Table
-- This holds the "Pools" (e.g., "Sem 1 Humanities Major Pool")
CREATE TABLE elective_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    bucket_name VARCHAR(255) NOT NULL,
    min_selection INTEGER DEFAULT 1,
    max_selection INTEGER DEFAULT 1,
    is_common_slot BOOLEAN DEFAULT TRUE, -- TRUE = All subjects in this bucket run simultaneously
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
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
    section VARCHAR(10) DEFAULT 'A',
    division VARCHAR(10),
    class_coordinator UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(college_id, department_id, semester, academic_year, name, section),
    CONSTRAINT valid_batch_times CHECK (preferred_start_time < preferred_end_time),
    CONSTRAINT valid_strength CHECK (actual_strength <= expected_strength + 10)
);

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
    preference_score INT DEFAULT 5 CHECK (preference_score BETWEEN 1 AND 10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
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
    title VARCHAR(255) NOT NULL,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    academic_year VARCHAR(10) NOT NULL,
    semester INT NOT NULL,
    fitness_score DECIMAL(10,4) NOT NULL DEFAULT 0,
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
    recorded_at TIMESTAMPTZ DEFAULT NOW()
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
    timetable_id UUID REFERENCES generated_timetables(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
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
-- 6. MULTI-COLLEGE OPTIMIZED INDEXES
-- ============================================================================

CREATE INDEX idx_users_college_role ON users(college_id, role, is_active);
CREATE INDEX idx_users_faculty_active ON users(college_id, role, is_active) WHERE role = 'faculty';
CREATE INDEX idx_users_department_role ON users(department_id, role);
CREATE INDEX idx_users_student_semester ON users(college_id, current_semester, is_active) WHERE role = 'student';
CREATE INDEX idx_departments_college ON departments(college_id, is_active);
CREATE INDEX idx_subjects_college_department ON subjects(college_id, department_id, is_active);
CREATE INDEX idx_subjects_algorithm_lookup ON subjects(subject_type, requires_lab, algorithm_complexity);
CREATE INDEX idx_classrooms_college ON classrooms(college_id, is_available);
CREATE INDEX idx_classrooms_capacity_features ON classrooms(college_id, capacity, has_projector, has_lab_equipment, is_available);
CREATE INDEX idx_batches_college_dept_semester ON batches(college_id, department_id, semester, academic_year, is_active);
CREATE INDEX idx_batches_access_control ON batches(college_id, department_id, semester, section);
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
CREATE INDEX idx_subjects_nep_category ON subjects(nep_category);
CREATE INDEX idx_student_selections_student ON student_course_selections(student_id);
CREATE INDEX idx_subjects_bucket ON subjects(course_group_id);
CREATE INDEX idx_timetable_access_user ON timetable_access_control(user_id, access_type, is_active);
CREATE INDEX idx_timetable_access_batch ON timetable_access_control(batch_id, access_type, is_active);
CREATE INDEX idx_workflow_approvals_timetable ON workflow_approvals(timetable_id, workflow_step);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read, created_at);
CREATE INDEX idx_algorithm_metrics_task ON algorithm_execution_metrics(generation_task_id);
CREATE INDEX idx_audit_algorithm_context ON audit_logs USING GIN (algorithm_context);

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
-- 8. FUNCTIONS AND TRIGGERS
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

-- Apply timestamp triggers
CREATE TRIGGER update_colleges_updated_at BEFORE UPDATE ON colleges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faculty_availability_updated_at BEFORE UPDATE ON faculty_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batch_subjects_updated_at BEFORE UPDATE ON batch_subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_constraint_rules_updated_at BEFORE UPDATE ON constraint_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_generation_tasks_updated_at BEFORE UPDATE ON timetable_generation_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_generated_timetables_updated_at BEFORE UPDATE ON generated_timetables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_classes_updated_at BEFORE UPDATE ON scheduled_classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_elective_buckets_updated_at BEFORE UPDATE ON elective_buckets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
COMMENT ON TABLE elective_buckets IS 'NEP 2020 elective pools where students choose from multiple subject options';
COMMENT ON TABLE student_course_selections IS 'Tracks individual student choices for major/minor subjects under NEP 2020';
COMMENT ON COLUMN subjects.credit_value IS 'NEP 2020 standard credit calculation: L + T + (P/2)';
COMMENT ON COLUMN subjects.nep_category IS 'NEP 2020 course classification for structured learning outcomes';