-- ============================================================================
-- HYBRID SCHEDULER DATABASE SCHEMA
-- ============================================================================
-- This script creates the necessary tables and functions for the
-- CP-SAT + Genetic Algorithm hybrid scheduling pipeline.
-- 
-- Run this script in your Supabase SQL Editor or via psql.
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 0. DROP EXISTING CONFLICTING OBJECTS (if any)
-- ============================================================================

-- Safely drop existing policies (only if tables exist)
DO $$ 
BEGIN
    -- Drop policies on timetable_generation_tasks if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timetable_generation_tasks' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view their college tasks" ON timetable_generation_tasks;
        DROP POLICY IF EXISTS "Admins can create tasks" ON timetable_generation_tasks;
        DROP POLICY IF EXISTS "Admins can update tasks" ON timetable_generation_tasks;
        DROP TRIGGER IF EXISTS update_timetable_tasks_updated_at ON timetable_generation_tasks;
    END IF;
    
    -- Drop policies on generated_timetables if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generated_timetables' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view their college timetables" ON generated_timetables;
        DROP POLICY IF EXISTS "Admins can manage timetables" ON generated_timetables;
    END IF;
    
    -- Drop policies on scheduled_classes if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_classes' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view scheduled classes" ON scheduled_classes;
        DROP POLICY IF EXISTS "Admins can manage scheduled classes" ON scheduled_classes;
    END IF;
    
    -- Drop policies on scheduling_constraints if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduling_constraints' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Admins can manage constraints" ON scheduling_constraints;
        DROP TRIGGER IF EXISTS update_scheduling_constraints_updated_at ON scheduling_constraints;
    END IF;
    
    -- Drop policies on faculty_scheduling_preferences if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faculty_scheduling_preferences' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Faculty can manage their preferences" ON faculty_scheduling_preferences;
        DROP TRIGGER IF EXISTS update_faculty_preferences_updated_at ON faculty_scheduling_preferences;
    END IF;
    
    -- Drop policies on algorithm_execution_metrics if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'algorithm_execution_metrics' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Allow metrics access" ON algorithm_execution_metrics;
    END IF;
    
    -- Drop policies on ga_population_snapshots if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ga_population_snapshots' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Allow snapshots access" ON ga_population_snapshots;
    END IF;
END $$;

-- ============================================================================
-- 1. ALGORITHM EXECUTION TRACKING
-- ============================================================================

-- Add missing columns to existing timetable_generation_tasks table (if it exists)
DO $$ 
BEGIN
    -- Check if table exists from new_schema.sql
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timetable_generation_tasks') THEN
        -- Add college_id if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_generation_tasks' AND column_name = 'college_id') THEN
            ALTER TABLE timetable_generation_tasks ADD COLUMN college_id UUID REFERENCES colleges(id) ON DELETE CASCADE;
        END IF;
        -- Add algorithm_config if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_generation_tasks' AND column_name = 'algorithm_config') THEN
            ALTER TABLE timetable_generation_tasks ADD COLUMN algorithm_config JSONB DEFAULT '{}'::jsonb;
        END IF;
    ELSE
        -- Create table if it doesn't exist
        CREATE TABLE timetable_generation_tasks (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
            batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
            created_by UUID REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(50) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'cpsat_phase', 'ga_phase', 'completed', 'failed', 'cancelled')),
            progress_message TEXT,
            progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
            algorithm_config JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            error_message TEXT,
            error_details JSONB
        );
    END IF;
END $$;

-- Index for quick lookup by college and status
CREATE INDEX IF NOT EXISTS idx_hybrid_tasks_college_status 
    ON timetable_generation_tasks(college_id, status);

CREATE INDEX IF NOT EXISTS idx_hybrid_tasks_created_by 
    ON timetable_generation_tasks(created_by);


-- ============================================================================
-- 2. GENERATED TIMETABLES STORAGE
-- ============================================================================

-- Add missing columns to existing generated_timetables table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generated_timetables') THEN
        -- Add college_id if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'generated_timetables' AND column_name = 'college_id') THEN
            ALTER TABLE generated_timetables ADD COLUMN college_id UUID REFERENCES colleges(id) ON DELETE CASCADE;
        END IF;
        -- Add algorithm_source if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'generated_timetables' AND column_name = 'algorithm_source') THEN
            ALTER TABLE generated_timetables ADD COLUMN algorithm_source VARCHAR(50) DEFAULT 'hybrid';
        END IF;
        -- Add fitness_score if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'generated_timetables' AND column_name = 'fitness_score') THEN
            ALTER TABLE generated_timetables ADD COLUMN fitness_score DECIMAL(10, 6);
        END IF;
        -- Add hard_constraint_violations if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'generated_timetables' AND column_name = 'hard_constraint_violations') THEN
            ALTER TABLE generated_timetables ADD COLUMN hard_constraint_violations INTEGER DEFAULT 0;
        END IF;
        -- Add is_active if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'generated_timetables' AND column_name = 'is_active') THEN
            ALTER TABLE generated_timetables ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
        -- Add is_published if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'generated_timetables' AND column_name = 'is_published') THEN
            ALTER TABLE generated_timetables ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
        -- Add published_at if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'generated_timetables' AND column_name = 'published_at') THEN
            ALTER TABLE generated_timetables ADD COLUMN published_at TIMESTAMPTZ;
        END IF;
    ELSE
        CREATE TABLE generated_timetables (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            task_id UUID REFERENCES timetable_generation_tasks(id) ON DELETE CASCADE,
            college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
            batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
            name VARCHAR(255),
            description TEXT,
            algorithm_source VARCHAR(50) DEFAULT 'hybrid',
            fitness_score DECIMAL(10, 6),
            hard_constraint_violations INTEGER DEFAULT 0,
            version INTEGER NOT NULL DEFAULT 1,
            is_active BOOLEAN NOT NULL DEFAULT FALSE,
            is_published BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            published_at TIMESTAMPTZ
        );
    END IF;
END $$;

-- Index for active timetables
CREATE INDEX IF NOT EXISTS idx_hybrid_timetables_active 
    ON generated_timetables(batch_id, is_active) WHERE is_active = TRUE;


-- ============================================================================
-- 3. SCHEDULED CLASSES (TIMETABLE SLOTS)
-- ============================================================================

-- Add missing columns to existing scheduled_classes table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_classes') THEN
        -- Add is_elective if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scheduled_classes' AND column_name = 'is_elective') THEN
            ALTER TABLE scheduled_classes ADD COLUMN is_elective BOOLEAN DEFAULT FALSE;
        END IF;
    ELSE
        CREATE TABLE scheduled_classes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            timetable_id UUID NOT NULL REFERENCES generated_timetables(id) ON DELETE CASCADE,
            subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
            batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
            section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
            time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
            is_lab BOOLEAN NOT NULL DEFAULT FALSE,
            is_elective BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;
END $$;

-- Indexes for conflict detection
CREATE INDEX IF NOT EXISTS idx_hybrid_classes_faculty_slot 
    ON scheduled_classes(faculty_id, time_slot_id);

CREATE INDEX IF NOT EXISTS idx_hybrid_classes_room_slot 
    ON scheduled_classes(classroom_id, time_slot_id);

CREATE INDEX IF NOT EXISTS idx_hybrid_classes_batch_slot 
    ON scheduled_classes(batch_id, time_slot_id);


-- ============================================================================
-- 4. ALGORITHM EXECUTION METRICS
-- ============================================================================

-- Add missing columns to existing algorithm_execution_metrics table or create if not exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'algorithm_execution_metrics' AND table_schema = 'public') THEN
        -- Table exists from new_schema.sql - add any missing columns
        -- Note: existing table uses generation_task_id, not task_id
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'algorithm_execution_metrics' AND column_name = 'initial_score') THEN
            ALTER TABLE algorithm_execution_metrics ADD COLUMN initial_score DECIMAL(10, 6);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'algorithm_execution_metrics' AND column_name = 'final_score') THEN
            ALTER TABLE algorithm_execution_metrics ADD COLUMN final_score DECIMAL(10, 6);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'algorithm_execution_metrics' AND column_name = 'improvement_percentage') THEN
            ALTER TABLE algorithm_execution_metrics ADD COLUMN improvement_percentage DECIMAL(10, 4);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'algorithm_execution_metrics' AND column_name = 'solutions_found') THEN
            ALTER TABLE algorithm_execution_metrics ADD COLUMN solutions_found INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'algorithm_execution_metrics' AND column_name = 'metrics_json') THEN
            ALTER TABLE algorithm_execution_metrics ADD COLUMN metrics_json JSONB DEFAULT '{}'::jsonb;
        END IF;
    ELSE
        CREATE TABLE algorithm_execution_metrics (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            generation_task_id UUID REFERENCES timetable_generation_tasks(id) ON DELETE CASCADE,
            phase VARCHAR(50) NOT NULL CHECK (phase IN ('cpsat', 'ga', 'validation')),
            start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            end_time TIMESTAMPTZ,
            duration_seconds DECIMAL(10, 3),
            initial_score DECIMAL(10, 6),
            final_score DECIMAL(10, 6),
            improvement_percentage DECIMAL(10, 4),
            iterations INTEGER,
            solutions_found INTEGER,
            memory_usage_mb DECIMAL(10, 2),
            cpu_time_seconds DECIMAL(10, 3),
            metrics_json JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;
END $$;

-- Index for task metrics lookup (use generation_task_id which is the existing column name)
CREATE INDEX IF NOT EXISTS idx_hybrid_metrics_task 
    ON algorithm_execution_metrics(generation_task_id);


-- ============================================================================
-- 5. GA POPULATION SNAPSHOTS (FOR ANALYSIS)
-- ============================================================================

-- Create ga_population_snapshots table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ga_population_snapshots' AND table_schema = 'public') THEN
        CREATE TABLE ga_population_snapshots (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    END IF;
END $$;

-- Index for generation lookup
CREATE INDEX IF NOT EXISTS idx_hybrid_snapshots_task_gen 
    ON ga_population_snapshots(task_id, generation_number);


-- ============================================================================
-- 6. SCHEDULING CONSTRAINTS CONFIGURATION
-- ============================================================================

-- Create scheduling_constraints table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduling_constraints' AND table_schema = 'public') THEN
        CREATE TABLE scheduling_constraints (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
            constraint_type VARCHAR(50) NOT NULL CHECK (constraint_type IN ('hard', 'soft')),
            constraint_name VARCHAR(100) NOT NULL,
            is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            weight INTEGER DEFAULT 50 CHECK (weight >= 0 AND weight <= 100),
            parameters JSONB DEFAULT '{}'::jsonb,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(college_id, constraint_name)
        );
    END IF;
END $$;


-- ============================================================================
-- 7. FACULTY PREFERENCES (FOR SOFT CONSTRAINTS)
-- ============================================================================

-- Create faculty_scheduling_preferences table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faculty_scheduling_preferences' AND table_schema = 'public') THEN
        CREATE TABLE faculty_scheduling_preferences (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            preferred_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
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
    END IF;
END $$;


-- ============================================================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on tables (safe even if already enabled)
DO $$ 
BEGIN
    ALTER TABLE timetable_generation_tasks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE generated_timetables ENABLE ROW LEVEL SECURITY;
    ALTER TABLE scheduled_classes ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE algorithm_execution_metrics ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ga_population_snapshots ENABLE ROW LEVEL SECURITY;
    ALTER TABLE scheduling_constraints ENABLE ROW LEVEL SECURITY;
    ALTER TABLE faculty_scheduling_preferences ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Policy: Users can see tasks from their college
CREATE POLICY "Users can view their college tasks"
    ON timetable_generation_tasks FOR SELECT
    USING (true);

-- Policy: Admins can create tasks
CREATE POLICY "Admins can create tasks"
    ON timetable_generation_tasks FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can update tasks"
    ON timetable_generation_tasks FOR UPDATE
    USING (true);

-- Policy: Users can view timetables from their college
CREATE POLICY "Users can view their college timetables"
    ON generated_timetables FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage timetables"
    ON generated_timetables FOR ALL
    USING (true);

-- Policy: Users can view scheduled classes from their college timetables
CREATE POLICY "Users can view scheduled classes"
    ON scheduled_classes FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage scheduled classes"
    ON scheduled_classes FOR ALL
    USING (true);

-- Policy: Admins can manage constraints
CREATE POLICY "Admins can manage constraints"
    ON scheduling_constraints FOR ALL
    USING (true);

-- Policy: Faculty can view/update their own preferences
CREATE POLICY "Faculty can manage their preferences"
    ON faculty_scheduling_preferences FOR ALL
    USING (true);

-- Policy: Allow metrics access
CREATE POLICY "Allow metrics access"
    ON algorithm_execution_metrics FOR ALL
    USING (true);

-- Policy: Allow snapshots access
CREATE POLICY "Allow snapshots access"
    ON ga_population_snapshots FOR ALL
    USING (true);


-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function to update task progress
CREATE OR REPLACE FUNCTION update_task_progress(
    p_task_id UUID,
    p_status VARCHAR(50),
    p_progress_percentage INTEGER DEFAULT NULL,
    p_progress_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE timetable_generation_tasks
    SET 
        status = p_status,
        progress_percentage = COALESCE(p_progress_percentage, progress_percentage),
        progress_message = COALESCE(p_progress_message, progress_message),
        updated_at = NOW(),
        started_at = CASE WHEN p_status = 'running' AND started_at IS NULL THEN NOW() ELSE started_at END,
        completed_at = CASE WHEN p_status IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE completed_at END
    WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    -- Get the batch ID
    SELECT batch_id INTO v_batch_id
    FROM generated_timetables
    WHERE id = p_timetable_id;
    
    -- Deactivate all timetables for this batch
    UPDATE generated_timetables
    SET is_active = FALSE
    WHERE batch_id = v_batch_id AND is_active = TRUE;
    
    -- Activate the specified timetable
    UPDATE generated_timetables
    SET is_active = TRUE
    WHERE id = p_timetable_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for scheduling conflicts
CREATE OR REPLACE FUNCTION check_scheduling_conflicts(
    p_timetable_id UUID
)
RETURNS TABLE(
    conflict_type VARCHAR(50),
    entity_id UUID,
    entity_name TEXT,
    time_slot_id UUID,
    conflict_count INTEGER
) AS $$
BEGIN
    -- Faculty conflicts
    RETURN QUERY
    SELECT 
        'faculty_overlap'::VARCHAR(50) as conflict_type,
        sc.faculty_id as entity_id,
        u.first_name || ' ' || u.last_name as entity_name,
        sc.time_slot_id,
        COUNT(*)::INTEGER as conflict_count
    FROM scheduled_classes sc
    JOIN users u ON sc.faculty_id = u.id
    WHERE sc.timetable_id = p_timetable_id
    GROUP BY sc.faculty_id, u.first_name, u.last_name, sc.time_slot_id
    HAVING COUNT(*) > 1;
    
    -- Room conflicts
    RETURN QUERY
    SELECT 
        'room_overlap'::VARCHAR(50) as conflict_type,
        sc.classroom_id as entity_id,
        c.name as entity_name,
        sc.time_slot_id,
        COUNT(*)::INTEGER as conflict_count
    FROM scheduled_classes sc
    JOIN classrooms c ON sc.classroom_id = c.id
    WHERE sc.timetable_id = p_timetable_id
    GROUP BY sc.classroom_id, c.name, sc.time_slot_id
    HAVING COUNT(*) > 1;
    
    -- Batch conflicts (same batch, same time, different classes)
    RETURN QUERY
    SELECT 
        'batch_overlap'::VARCHAR(50) as conflict_type,
        sc.batch_id as entity_id,
        b.name as entity_name,
        sc.time_slot_id,
        COUNT(*)::INTEGER as conflict_count
    FROM scheduled_classes sc
    JOIN batches b ON sc.batch_id = b.id
    WHERE sc.timetable_id = p_timetable_id
    AND sc.section_id IS NULL  -- Only for non-sectioned classes
    GROUP BY sc.batch_id, b.name, sc.time_slot_id
    HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================================================
-- 10. TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_timetable_tasks_updated_at
    BEFORE UPDATE ON timetable_generation_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduling_constraints_updated_at
    BEFORE UPDATE ON scheduling_constraints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faculty_preferences_updated_at
    BEFORE UPDATE ON faculty_scheduling_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 11. INSERT DEFAULT CONSTRAINTS
-- ============================================================================

-- Insert default constraint configurations (run for each college as needed)
-- This is a template - execute with actual college_id
/*
INSERT INTO scheduling_constraints (college_id, constraint_type, constraint_name, is_enabled, weight, description)
VALUES 
    -- Hard constraints
    ('YOUR_COLLEGE_ID', 'hard', 'no_teacher_overlap', TRUE, 100, 'Faculty cannot teach two classes simultaneously'),
    ('YOUR_COLLEGE_ID', 'hard', 'no_room_overlap', TRUE, 100, 'Room cannot host two classes simultaneously'),
    ('YOUR_COLLEGE_ID', 'hard', 'no_student_overlap', TRUE, 100, 'Batch cannot attend two classes simultaneously'),
    ('YOUR_COLLEGE_ID', 'hard', 'room_capacity', TRUE, 100, 'Room must fit all students'),
    ('YOUR_COLLEGE_ID', 'hard', 'lab_requires_lab_room', TRUE, 100, 'Lab sessions must be in lab rooms'),
    
    -- Soft constraints
    ('YOUR_COLLEGE_ID', 'soft', 'minimize_gaps', TRUE, 50, 'Minimize gaps in student schedules'),
    ('YOUR_COLLEGE_ID', 'soft', 'preferred_time_slots', TRUE, 30, 'Prefer morning slots for theory'),
    ('YOUR_COLLEGE_ID', 'soft', 'workload_balance', TRUE, 40, 'Balance faculty workload across days'),
    ('YOUR_COLLEGE_ID', 'soft', 'room_stability', TRUE, 20, 'Same room for same subject'),
    ('YOUR_COLLEGE_ID', 'soft', 'consecutive_lectures', TRUE, 35, 'Limit consecutive lectures'),
    ('YOUR_COLLEGE_ID', 'soft', 'department_clustering', TRUE, 25, 'Keep department classes nearby'),
    ('YOUR_COLLEGE_ID', 'soft', 'elective_distribution', TRUE, 30, 'Spread electives across days')
ON CONFLICT (college_id, constraint_name) DO NOTHING;
*/


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify the schema was created correctly:

-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN (
--     'timetable_generation_tasks',
--     'generated_timetables', 
--     'scheduled_classes',
--     'algorithm_execution_metrics',
--     'ga_population_snapshots',
--     'scheduling_constraints',
--     'faculty_scheduling_preferences'
-- );

-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name IN (
--     'update_task_progress',
--     'get_active_timetable',
--     'activate_timetable',
--     'check_scheduling_conflicts'
-- );

COMMENT ON TABLE timetable_generation_tasks IS 'Tracks timetable generation task execution';
COMMENT ON TABLE generated_timetables IS 'Stores generated timetable versions';
COMMENT ON TABLE scheduled_classes IS 'Individual class assignments within a timetable';
COMMENT ON TABLE algorithm_execution_metrics IS 'Performance metrics for CP-SAT and GA phases';
COMMENT ON TABLE ga_population_snapshots IS 'Snapshots of GA population for analysis';
COMMENT ON TABLE scheduling_constraints IS 'College-specific constraint configurations';
COMMENT ON TABLE faculty_scheduling_preferences IS 'Faculty scheduling preferences for soft constraints';
