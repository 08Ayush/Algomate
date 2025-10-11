-- ============================================================================
-- QUICK FIX: Copy this entire script and run in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Drop old global constraints
ALTER TABLE scheduled_classes DROP CONSTRAINT IF EXISTS no_batch_time_conflict;
ALTER TABLE scheduled_classes DROP CONSTRAINT IF EXISTS no_faculty_time_conflict;
ALTER TABLE scheduled_classes DROP CONSTRAINT IF EXISTS no_classroom_time_conflict;

-- Add new timetable-specific constraints
ALTER TABLE scheduled_classes
ADD CONSTRAINT no_batch_time_conflict_per_timetable
    EXCLUDE USING gist (timetable_id WITH =, batch_id WITH =, time_slot_id WITH =);

ALTER TABLE scheduled_classes
ADD CONSTRAINT no_faculty_time_conflict_per_timetable
    EXCLUDE USING gist (timetable_id WITH =, faculty_id WITH =, time_slot_id WITH =);

ALTER TABLE scheduled_classes
ADD CONSTRAINT no_classroom_time_conflict_per_timetable
    EXCLUDE USING gist (timetable_id WITH =, classroom_id WITH =, time_slot_id WITH =);

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_timetable_conflicts 
ON scheduled_classes(timetable_id, time_slot_id, batch_id, faculty_id, classroom_id);

COMMIT;

-- ============================================================================
-- VERIFICATION: Run this to confirm the fix worked
-- ============================================================================

SELECT 
    conname as constraint_name,
    CASE 
        WHEN conname LIKE '%per_timetable%' THEN '✅ TIMETABLE-SPECIFIC'
        ELSE '⚠️ GLOBAL (OLD)'
    END as constraint_type
FROM pg_constraint
WHERE conrelid = 'scheduled_classes'::regclass
    AND conname LIKE '%conflict%'
ORDER BY conname;

-- You should see three constraints ending with "_per_timetable"
