-- ============================================================================
-- PHASE 3: SPECIAL EVENTS SCHEMA MIGRATION
-- Add support for Internships, Teaching Practice, and Dissertation
-- ============================================================================
-- 
-- ⚠️  IMPORTANT: This file must be run in TWO steps due to PostgreSQL enum limitations
-- 
-- RECOMMENDED: Use the split files instead:
--   1. Run phase3_step1_enum.sql FIRST
--   2. Run phase3_step2_schema.sql SECOND
-- 
-- OR follow the manual steps below:
-- ============================================================================

-- STEP 1: Add new enum values (COPY AND RUN THIS SECTION FIRST)
-- Highlight lines 19-40 below and execute them separately
-- Wait for confirmation, then execute the rest of the file
-- ============================================================================

-- Check and add TEACHING_PRACTICE if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TEACHING_PRACTICE' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'nep_category')
    ) THEN
        EXECUTE 'ALTER TYPE nep_category ADD VALUE ''TEACHING_PRACTICE''';
    END IF;
END $$;

-- Check and add DISSERTATION if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'DISSERTATION' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'nep_category')
    ) THEN
        EXECUTE 'ALTER TYPE nep_category ADD VALUE ''DISSERTATION''';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Run the rest of the migration (RUN AFTER STEP 1 IS COMMITTED)
-- ============================================================================

BEGIN;

-- 2. Add Phase 3 columns to subjects table
ALTER TABLE subjects 
    -- Internship blocking period
    ADD COLUMN IF NOT EXISTS block_start_week INTEGER,
    ADD COLUMN IF NOT EXISTS block_end_week INTEGER,
    
    -- Time restrictions (for Teaching Practice)
    ADD COLUMN IF NOT EXISTS time_restriction VARCHAR(20) CHECK (
        time_restriction IN ('MORNING', 'AFTERNOON', 'EVENING', 'FULL_DAY', NULL)
    ),
    
    -- Flag to indicate if this is a special event (no room allocation)
    ADD COLUMN IF NOT EXISTS is_special_event BOOLEAN DEFAULT FALSE,
    
    -- Notes about the special event
    ADD COLUMN IF NOT EXISTS special_event_notes TEXT;

-- 3. Create a view to easily identify special events
CREATE OR REPLACE VIEW special_events AS
SELECT 
    id,
    code,
    name,
    nep_category,
    block_start_week,
    block_end_week,
    time_restriction,
    special_event_notes,
    CASE 
        WHEN nep_category = 'INTERNSHIP' THEN 'Blocks weeks ' || block_start_week || '-' || block_end_week
        WHEN nep_category = 'TEACHING_PRACTICE' THEN 'Morning slots (9 AM - 12 PM)'
        WHEN nep_category = 'DISSERTATION' THEN 'Library/Research hours (Flexible)'
        ELSE 'Regular class'
    END as scheduling_notes
FROM subjects
WHERE nep_category IN ('INTERNSHIP', 'TEACHING_PRACTICE', 'DISSERTATION');

-- 4. Create a function to automatically mark special events
CREATE OR REPLACE FUNCTION update_special_event_flag()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.nep_category IN ('INTERNSHIP', 'TEACHING_PRACTICE', 'DISSERTATION') THEN
        NEW.is_special_event := TRUE;
    ELSE
        NEW.is_special_event := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to auto-update special event flag
DROP TRIGGER IF EXISTS set_special_event_flag ON subjects;
CREATE TRIGGER set_special_event_flag
    BEFORE INSERT OR UPDATE OF nep_category ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_special_event_flag();

-- 6. Add indexes for Phase 3 queries
CREATE INDEX IF NOT EXISTS idx_subjects_special_event ON subjects(is_special_event) WHERE is_special_event = TRUE;
CREATE INDEX IF NOT EXISTS idx_subjects_block_weeks ON subjects(block_start_week, block_end_week) WHERE block_start_week IS NOT NULL;

-- 7. Add comments for documentation
COMMENT ON COLUMN subjects.block_start_week IS 'Start week for internship blocking (e.g., week 10 of semester)';
COMMENT ON COLUMN subjects.block_end_week IS 'End week for internship blocking (e.g., week 12 of semester)';
COMMENT ON COLUMN subjects.time_restriction IS 'Time restriction: MORNING (9-12), AFTERNOON (1-4), EVENING (4+), or NULL for any time';
COMMENT ON COLUMN subjects.is_special_event IS 'TRUE if this is an Internship, Teaching Practice, or Dissertation (no room allocation)';

COMMIT; -- Commit transaction

-- ============================================================================
-- SAMPLE DATA FOR TESTING PHASE 3
-- ============================================================================

-- Example: Insert B.Ed program subjects with special events
-- (Run this separately after the migration)

/*
-- Core B.Ed subjects
INSERT INTO subjects (code, name, nep_category, lecture_hours, tutorial_hours, practical_hours, subject_type) VALUES
('EDU101', 'Educational Psychology', 'CORE', 3, 1, 0, 'THEORY'),
('EDU102', 'Curriculum Development', 'CORE', 3, 1, 0, 'THEORY'),
('PED201', 'Pedagogy of Mathematics', 'PEDAGOGY', 2, 0, 2, 'THEORY'),
('PED202', 'Pedagogy of Science', 'PEDAGOGY', 2, 0, 2, 'THEORY');

-- Special events
INSERT INTO subjects (code, name, nep_category, lecture_hours, block_start_week, block_end_week, special_event_notes) VALUES
('INTERN401', 'School Internship', 'INTERNSHIP', 0, 10, 12, 'Students spend 2 weeks in local schools'),
('TP301', 'Teaching Practice', 'TEACHING_PRACTICE', 4, NULL, NULL, 'Part-time teaching in morning slots'),
('DISS501', 'M.Ed Dissertation', 'DISSERTATION', 0, NULL, NULL, 'Self-directed research with advisor meetings');

-- Update time restrictions
UPDATE subjects SET time_restriction = 'MORNING' WHERE code = 'TP301';
*/
