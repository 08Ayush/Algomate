-- ============================================================================
-- PHASE 1: NEP 2020 ARCHITECTURE MIGRATION
-- Transition from rigid streams to Choice-Based "Buckets"
-- ============================================================================

BEGIN; -- Start transaction to ensure all or nothing execution

-- 1. Create the NEP Category Enum
-- Defines the types of courses available under the new curriculum
DO $$ BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Elective Buckets Table
-- This holds the "Pools" (e.g., "Sem 1 Humanities Major Pool")
CREATE TABLE IF NOT EXISTS elective_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    bucket_name VARCHAR(255) NOT NULL,
    min_selection INTEGER DEFAULT 1,
    max_selection INTEGER DEFAULT 1,
    is_common_slot BOOLEAN DEFAULT TRUE, -- TRUE = All subjects in this bucket run simultaneously
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update Subjects Table
-- Adds credits breakdown and links subjects to buckets
ALTER TABLE subjects 
    ADD COLUMN IF NOT EXISTS nep_category nep_category DEFAULT 'CORE',
    ADD COLUMN IF NOT EXISTS lecture_hours INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS tutorial_hours INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS practical_hours INTEGER DEFAULT 0,
    -- Generated column for automatic credit calculation: L + T + (P/2)
    ADD COLUMN IF NOT EXISTS credit_value NUMERIC(3,1) 
        GENERATED ALWAYS AS (lecture_hours + tutorial_hours + (practical_hours / 2.0)) STORED,
    ADD COLUMN IF NOT EXISTS course_group_id UUID REFERENCES elective_buckets(id) ON DELETE SET NULL;

-- 4. Create Student Course Selections Table
-- Tracks which specific "Major/Minor" a student has chosen
CREATE TABLE IF NOT EXISTS student_course_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a student doesn't pick the same subject twice in a semester
    UNIQUE(student_id, subject_id, semester, academic_year)
);

-- 5. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_buckets_batch ON elective_buckets(batch_id);
CREATE INDEX IF NOT EXISTS idx_subjects_nep_category ON subjects(nep_category);
CREATE INDEX IF NOT EXISTS idx_student_selections_student ON student_course_selections(student_id);
CREATE INDEX IF NOT EXISTS idx_subjects_bucket ON subjects(course_group_id);

COMMIT; -- Commit the transaction