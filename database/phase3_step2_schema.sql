-- ============================================================================
-- PHASE 3 MIGRATION - STEP 2: Add Columns, Views, and Triggers
-- ============================================================================
-- RUN THIS FILE AFTER phase3_step1_enum.sql has been executed
-- ============================================================================

BEGIN;

-- 1. Add Phase 3 columns to subjects table
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

-- 2. Create a view to easily identify special events
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

-- 3. Create a function to automatically mark special events
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

-- 4. Create trigger to auto-update special event flag
DROP TRIGGER IF EXISTS set_special_event_flag ON subjects;
CREATE TRIGGER set_special_event_flag
    BEFORE INSERT OR UPDATE OF nep_category ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_special_event_flag();

-- 5. Add indexes for Phase 3 queries
CREATE INDEX IF NOT EXISTS idx_subjects_special_event ON subjects(is_special_event) WHERE is_special_event = TRUE;
CREATE INDEX IF NOT EXISTS idx_subjects_block_weeks ON subjects(block_start_week, block_end_week) WHERE block_start_week IS NOT NULL;

-- 6. Add comments for documentation
COMMENT ON COLUMN subjects.block_start_week IS 'Start week for internship blocking (e.g., week 10 of semester)';
COMMENT ON COLUMN subjects.block_end_week IS 'End week for internship blocking (e.g., week 12 of semester)';
COMMENT ON COLUMN subjects.time_restriction IS 'Time restriction: MORNING (9-12), AFTERNOON (1-4), EVENING (4+), or NULL for any time';
COMMENT ON COLUMN subjects.is_special_event IS 'TRUE if this is an Internship, Teaching Practice, or Dissertation (no room allocation)';

COMMIT;

-- ============================================================================
-- ✅ PHASE 3 MIGRATION COMPLETE
-- ============================================================================
