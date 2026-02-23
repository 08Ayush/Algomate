-- ============================================================================
-- FIX: Make Scheduling Constraints Timetable-Specific
-- This allows multiple draft timetables for different batches/semesters
-- to coexist without conflicts
-- ============================================================================

BEGIN;

-- Step 1: Drop the global exclusion constraints
-- These were preventing multiple timetables from using same resources
ALTER TABLE scheduled_classes 
DROP CONSTRAINT IF EXISTS no_batch_time_conflict;

ALTER TABLE scheduled_classes 
DROP CONSTRAINT IF EXISTS no_faculty_time_conflict;

ALTER TABLE scheduled_classes 
DROP CONSTRAINT IF EXISTS no_classroom_time_conflict;

-- Step 2: Add timetable-specific exclusion constraints
-- These ensure no conflicts WITHIN a single timetable
ALTER TABLE scheduled_classes
ADD CONSTRAINT no_batch_time_conflict_per_timetable
    EXCLUDE USING gist (
        timetable_id WITH =,
        batch_id WITH =,
        time_slot_id WITH =
    );

ALTER TABLE scheduled_classes
ADD CONSTRAINT no_faculty_time_conflict_per_timetable
    EXCLUDE USING gist (
        timetable_id WITH =,
        faculty_id WITH =,
        time_slot_id WITH =
    );

ALTER TABLE scheduled_classes
ADD CONSTRAINT no_classroom_time_conflict_per_timetable
    EXCLUDE USING gist (
        timetable_id WITH =,
        classroom_id WITH =,
        time_slot_id WITH =
    );

-- Step 3: Add index for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_timetable_conflicts 
ON scheduled_classes(timetable_id, time_slot_id, batch_id, faculty_id, classroom_id);

-- Step 4: Insert constraint rules for proper conflict management
INSERT INTO constraint_rules (rule_name, rule_type, description, rule_parameters, weight) 
VALUES
    -- Hard constraint: No batch can have multiple classes at same time in same timetable
    ('no_batch_overlap_per_timetable', 'HARD', 
     'A batch cannot attend multiple classes simultaneously within the same timetable',
     '{"scope": "per_timetable", "resource": "batch", "check_type": "time_overlap"}',
     100.0),
    
    -- Hard constraint: No faculty can teach multiple classes at same time in same timetable
    ('no_faculty_overlap_per_timetable', 'HARD',
     'A faculty member cannot teach multiple classes simultaneously within the same timetable',
     '{"scope": "per_timetable", "resource": "faculty", "check_type": "time_overlap"}',
     100.0),
    
    -- Hard constraint: No classroom can host multiple classes at same time in same timetable
    ('no_classroom_overlap_per_timetable', 'HARD',
     'A classroom cannot host multiple classes simultaneously within the same timetable',
     '{"scope": "per_timetable", "resource": "classroom", "check_type": "time_overlap"}',
     100.0),
    
    -- Soft constraint: Prefer not to schedule same faculty across multiple published timetables
    ('faculty_cross_timetable_preference', 'SOFT',
     'Minimize faculty conflicts across multiple published timetables',
     '{"scope": "cross_timetable", "resource": "faculty", "check_type": "time_overlap", "applies_to_status": ["published"]}',
     10.0),
    
    -- Soft constraint: Prefer not to use same classroom across multiple published timetables
    ('classroom_cross_timetable_preference', 'SOFT',
     'Minimize classroom conflicts across multiple published timetables',
     '{"scope": "cross_timetable", "resource": "classroom", "check_type": "time_overlap", "applies_to_status": ["published"]}',
     5.0)
ON CONFLICT (rule_name) DO UPDATE SET
    rule_type = EXCLUDED.rule_type,
    description = EXCLUDED.description,
    rule_parameters = EXCLUDED.rule_parameters,
    weight = EXCLUDED.weight,
    is_active = true;

-- Step 5: Create helper function to check cross-timetable conflicts
CREATE OR REPLACE FUNCTION check_cross_timetable_conflicts(
    p_timetable_id UUID,
    p_faculty_id UUID DEFAULT NULL,
    p_classroom_id UUID DEFAULT NULL,
    p_time_slot_id UUID DEFAULT NULL,
    p_check_status TEXT[] DEFAULT ARRAY['published']
)
RETURNS TABLE(
    conflict_type TEXT,
    conflicting_timetable_id UUID,
    conflicting_class_id UUID,
    resource_type TEXT,
    resource_id UUID,
    time_slot_id UUID,
    details JSONB
) AS $$
BEGIN
    -- Check faculty conflicts
    IF p_faculty_id IS NOT NULL AND p_time_slot_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            'faculty_conflict'::TEXT,
            sc.timetable_id,
            sc.id,
            'faculty'::TEXT,
            sc.faculty_id,
            sc.time_slot_id,
            jsonb_build_object(
                'faculty_id', sc.faculty_id,
                'time_slot_id', sc.time_slot_id,
                'batch_id', sc.batch_id,
                'timetable_status', gt.status,
                'timetable_title', gt.title
            )
        FROM scheduled_classes sc
        JOIN generated_timetables gt ON sc.timetable_id = gt.id
        WHERE sc.timetable_id != p_timetable_id
            AND sc.faculty_id = p_faculty_id
            AND sc.time_slot_id = p_time_slot_id
            AND gt.status = ANY(p_check_status);
    END IF;

    -- Check classroom conflicts
    IF p_classroom_id IS NOT NULL AND p_time_slot_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            'classroom_conflict'::TEXT,
            sc.timetable_id,
            sc.id,
            'classroom'::TEXT,
            sc.classroom_id,
            sc.time_slot_id,
            jsonb_build_object(
                'classroom_id', sc.classroom_id,
                'time_slot_id', sc.time_slot_id,
                'batch_id', sc.batch_id,
                'timetable_status', gt.status,
                'timetable_title', gt.title
            )
        FROM scheduled_classes sc
        JOIN generated_timetables gt ON sc.timetable_id = gt.id
        WHERE sc.timetable_id != p_timetable_id
            AND sc.classroom_id = p_classroom_id
            AND sc.time_slot_id = p_time_slot_id
            AND gt.status = ANY(p_check_status);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create view for conflict detection
CREATE OR REPLACE VIEW timetable_conflict_summary AS
SELECT 
    gt.id as timetable_id,
    gt.title,
    gt.status,
    gt.batch_id,
    gt.semester,
    gt.academic_year,
    COUNT(DISTINCT sc.id) as total_classes,
    COUNT(DISTINCT sc.faculty_id) as unique_faculty,
    COUNT(DISTINCT sc.classroom_id) as unique_classrooms,
    COUNT(DISTINCT sc.time_slot_id) as unique_time_slots,
    -- Count potential conflicts with other published timetables
    (
        SELECT COUNT(*)
        FROM scheduled_classes sc2
        JOIN generated_timetables gt2 ON sc2.timetable_id = gt2.id
        WHERE sc2.timetable_id != gt.id
            AND gt2.status = 'published'
            AND sc2.faculty_id IN (SELECT faculty_id FROM scheduled_classes WHERE timetable_id = gt.id)
            AND sc2.time_slot_id IN (SELECT time_slot_id FROM scheduled_classes WHERE timetable_id = gt.id)
    ) as potential_faculty_conflicts,
    (
        SELECT COUNT(*)
        FROM scheduled_classes sc2
        JOIN generated_timetables gt2 ON sc2.timetable_id = gt2.id
        WHERE sc2.timetable_id != gt.id
            AND gt2.status = 'published'
            AND sc2.classroom_id IN (SELECT classroom_id FROM scheduled_classes WHERE timetable_id = gt.id)
            AND sc2.time_slot_id IN (SELECT time_slot_id FROM scheduled_classes WHERE timetable_id = gt.id)
    ) as potential_classroom_conflicts
FROM generated_timetables gt
LEFT JOIN scheduled_classes sc ON gt.id = sc.timetable_id
GROUP BY gt.id;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check that constraints were updated
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'scheduled_classes'::regclass
    AND conname LIKE '%conflict%'
ORDER BY conname;

-- Check constraint rules
SELECT rule_name, rule_type, description, is_active
FROM constraint_rules
WHERE rule_name LIKE '%timetable%'
ORDER BY rule_type, rule_name;

-- Summary
SELECT 
    'Constraints updated successfully!' as status,
    'Timetables are now isolated - multiple drafts can coexist' as message,
    'Run the application and test generating timetables for Semester 3, 5, and 7' as next_step;
