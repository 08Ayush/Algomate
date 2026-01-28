-- ============================================================================
-- MIGRATION: ADD SCHEDULING ALGORITHM SUPPORT
-- ============================================================================
-- Run this AFTER hybrid_scheduler_schema.sql
-- This script adds additional columns to existing tables if needed
-- ============================================================================

-- Add algorithm-related columns to existing subjects table (if not exists)
-- Note: new_schema.sql already has: requires_lab, subject_type, lecture_hours, tutorial_hours, practical_hours
DO $$ 
BEGIN
    -- Add weekly_hours column if not exists (for total hours per week)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'weekly_hours'
    ) THEN
        ALTER TABLE subjects ADD COLUMN weekly_hours INTEGER DEFAULT 3;
    END IF;

    -- Add is_elective column if not exists  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'is_elective'
    ) THEN
        ALTER TABLE subjects ADD COLUMN is_elective BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add lab_hours column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'lab_hours'
    ) THEN
        ALTER TABLE subjects ADD COLUMN lab_hours INTEGER DEFAULT 0;
    END IF;
END $$;


-- Add columns to classrooms table
-- Note: new_schema.sql already has: has_projector, has_ac, has_lab_equipment, type (which includes 'Lab')
DO $$ 
BEGIN
    -- Add is_lab column if not exists (derived from type='Lab' but explicit flag is useful)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classrooms' AND column_name = 'is_lab'
    ) THEN
        ALTER TABLE classrooms ADD COLUMN is_lab BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add lab_type column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classrooms' AND column_name = 'lab_type'
    ) THEN
        ALTER TABLE classrooms ADD COLUMN lab_type VARCHAR(100);
    END IF;
END $$;

-- Update is_lab based on existing type column
UPDATE classrooms SET is_lab = TRUE WHERE type = 'Lab' AND is_lab = FALSE;


-- Add columns to users table (faculty)
-- Note: new_schema.sql already has: max_hours_per_day, max_hours_per_week
DO $$ 
BEGIN
    -- Add specializations column (JSONB array)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'specializations'
    ) THEN
        ALTER TABLE users ADD COLUMN specializations JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;


-- Add columns to time_slots table
-- Note: new_schema.sql already has: is_break_time, is_lunch_time, slot_name, day (enum)
DO $$ 
BEGIN
    -- Add slot_number column if not exists (for ordering)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_slots' AND column_name = 'slot_number'
    ) THEN
        ALTER TABLE time_slots ADD COLUMN slot_number INTEGER;
    END IF;

    -- Add is_lab_slot column if not exists (for 2-hour lab slots)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_slots' AND column_name = 'is_lab_slot'
    ) THEN
        ALTER TABLE time_slots ADD COLUMN is_lab_slot BOOLEAN DEFAULT FALSE;
    END IF;
END $$;


-- Add columns to batches table
-- Note: new_schema.sql already has: expected_strength, actual_strength, section
DO $$ 
BEGIN
    -- Add student_count column if not exists (alias for expected_strength for algorithm compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batches' AND column_name = 'student_count'
    ) THEN
        ALTER TABLE batches ADD COLUMN student_count INTEGER DEFAULT 60;
    END IF;

    -- Add section_count column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batches' AND column_name = 'section_count'
    ) THEN
        ALTER TABLE batches ADD COLUMN section_count INTEGER DEFAULT 1;
    END IF;
END $$;


-- Create faculty_subject_assignments table if not exists
-- Note: sections table doesn't exist - batches have a 'section' column instead
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faculty_subject_assignments' AND table_schema = 'public') THEN
        CREATE TABLE faculty_subject_assignments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
            section VARCHAR(10),  -- Section identifier (A, B, C, etc.) - matches batches.section
            
            -- Assignment type
            is_primary BOOLEAN DEFAULT TRUE,
            
            -- Academic period
            academic_year VARCHAR(20),
            semester INTEGER,
            
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            
            UNIQUE(faculty_id, subject_id, batch_id, section)
        );
    END IF;
END $$;

-- Enable RLS (safe even if already enabled)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faculty_subject_assignments' AND table_schema = 'public') THEN
        ALTER TABLE faculty_subject_assignments ENABLE ROW LEVEL SECURITY;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop existing policy if exists, then create
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faculty_subject_assignments' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view faculty assignments in their college" ON faculty_subject_assignments;
        DROP POLICY IF EXISTS "Allow faculty assignments access" ON faculty_subject_assignments;
        
        -- Simple permissive policy
        CREATE POLICY "Allow faculty assignments access"
            ON faculty_subject_assignments FOR ALL
            USING (true);
    END IF;
END $$;


-- Create indexes for performance (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_subjects_is_elective ON subjects(is_elective) WHERE is_elective = TRUE;
CREATE INDEX IF NOT EXISTS idx_subjects_requires_lab ON subjects(requires_lab) WHERE requires_lab = TRUE;
CREATE INDEX IF NOT EXISTS idx_classrooms_is_lab ON classrooms(is_lab) WHERE is_lab = TRUE;
CREATE INDEX IF NOT EXISTS idx_time_slots_slot_number ON time_slots(slot_number);
-- Note: time_slots uses 'day' column (enum), not 'day_of_week'
CREATE INDEX IF NOT EXISTS idx_time_slots_day_enum ON time_slots(day);
CREATE INDEX IF NOT EXISTS idx_faculty_assignments ON faculty_subject_assignments(faculty_id, subject_id);


-- Update slot_number for existing time_slots based on start_time
-- Note: time_slots uses 'day' column, not 'day_of_week'
UPDATE time_slots
SET slot_number = sub.rn
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY college_id, day ORDER BY start_time) as rn
    FROM time_slots
) sub
WHERE time_slots.id = sub.id
AND time_slots.slot_number IS NULL;


COMMENT ON COLUMN subjects.requires_lab IS 'Whether this subject requires lab sessions';
COMMENT ON COLUMN subjects.weekly_hours IS 'Total lecture hours per week';
COMMENT ON COLUMN subjects.lab_hours IS 'Lab hours per week (if applicable)';
COMMENT ON COLUMN classrooms.is_lab IS 'Whether this room is a laboratory';
COMMENT ON COLUMN classrooms.lab_type IS 'Type of lab (e.g., Computer Lab, Physics Lab)';
COMMENT ON COLUMN time_slots.slot_number IS 'Sequential slot number within a day';
COMMENT ON COLUMN time_slots.is_lab_slot IS 'Whether this is a double slot for labs';
