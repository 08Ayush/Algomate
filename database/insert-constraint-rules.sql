-- ============================================================================
-- INSERT CONSTRAINT RULES
-- Run this to add constraint rules to your constraint_rules table
-- Safe to run multiple times (uses ON CONFLICT to prevent duplicates)
-- ============================================================================

-- Insert constraint rules for timetable generation
INSERT INTO constraint_rules (rule_name, rule_type, description, rule_parameters, weight, is_active) 
VALUES
    -- ========================================================================
    -- HARD CONSTRAINTS (Must be satisfied - weight 90-100)
    -- ========================================================================
    
    -- No batch can have multiple classes at same time in same timetable
    ('no_batch_overlap_per_timetable', 'HARD', 
     'A batch cannot attend multiple classes simultaneously within the same timetable',
     '{"scope": "per_timetable", "resource": "batch", "check_type": "time_overlap"}',
     100.0,
     true),
    
    -- No faculty can teach multiple classes at same time in same timetable
    ('no_faculty_overlap_per_timetable', 'HARD',
     'A faculty member cannot teach multiple classes simultaneously within the same timetable',
     '{"scope": "per_timetable", "resource": "faculty", "check_type": "time_overlap"}',
     100.0,
     true),
    
    -- No classroom can host multiple classes at same time in same timetable
    ('no_classroom_overlap_per_timetable', 'HARD',
     'A classroom cannot host multiple classes simultaneously within the same timetable',
     '{"scope": "per_timetable", "resource": "classroom", "check_type": "time_overlap"}',
     100.0,
     true),
    
    -- Theory lectures by same faculty cannot be in continuous slots
    ('no_continuous_theory_same_faculty', 'HARD',
     'Theory lectures by the same faculty cannot be scheduled in continuous time slots',
     '{"scope": "per_timetable", "resource": "faculty", "check_type": "continuous_theory", "max_continuous": 1}',
     90.0,
     true),
    
    -- Lab sessions must be in continuous 2-hour slots
    ('lab_requires_continuous_slots', 'HARD',
     'Lab and practical sessions must be scheduled in 2 continuous time slots',
     '{"scope": "per_timetable", "resource": "subject", "check_type": "lab_continuity", "required_slots": 2}',
     95.0,
     true),
    
    -- Maximum 1 lab per day for better distribution
    ('max_one_lab_per_day', 'HARD',
     'Maximum one lab session can be scheduled per day for a batch to ensure even distribution',
     '{"scope": "per_timetable", "resource": "batch", "check_type": "lab_per_day", "max_labs": 1}',
     85.0,
     true),
    
    -- Each subject must meet minimum credit hours
    ('minimum_subject_hours', 'HARD',
     'Each subject must meet its minimum required credit hours per week',
     '{"scope": "per_timetable", "resource": "subject", "check_type": "minimum_hours"}',
     100.0,
     true),
    
    -- ========================================================================
    -- SOFT CONSTRAINTS (Preferences - weight 5-50)
    -- ========================================================================
    
    -- Distribute subjects evenly across the week
    ('distribute_subjects_evenly', 'SOFT',
     'Distribute subject classes evenly across the week to avoid clustering',
     '{"scope": "per_timetable", "resource": "subject", "check_type": "even_distribution"}',
     50.0,
     true),
    
    -- Schedule faculty during preferred time slots
    ('faculty_preferred_time_slots', 'SOFT',
     'Schedule faculty members during their preferred time slots when possible',
     '{"scope": "per_timetable", "resource": "faculty", "check_type": "time_preference"}',
     30.0,
     true),
    
    -- Avoid scheduling labs in first or last slot
    ('avoid_first_last_slot_labs', 'SOFT',
     'Avoid scheduling lab sessions in the first or last time slot of the day',
     '{"scope": "per_timetable", "resource": "subject", "check_type": "lab_timing"}',
     20.0,
     true),
    
    -- Respect lunch break timings
    ('lunch_break_consideration', 'SOFT',
     'Respect lunch break timings and avoid scheduling critical classes during break',
     '{"scope": "per_timetable", "resource": "batch", "check_type": "break_time"}',
     40.0,
     true),
    
    -- Minimize faculty conflicts across published timetables
    ('faculty_cross_timetable_preference', 'SOFT',
     'Minimize faculty time conflicts across multiple published timetables',
     '{"scope": "cross_timetable", "resource": "faculty", "check_type": "time_overlap", "applies_to_status": ["published"]}',
     10.0,
     true),
    
    -- Minimize classroom conflicts across published timetables
    ('classroom_cross_timetable_preference', 'SOFT',
     'Minimize classroom conflicts across multiple published timetables',
     '{"scope": "cross_timetable", "resource": "classroom", "check_type": "time_overlap", "applies_to_status": ["published"]}',
     5.0,
     true)

-- If rule already exists, update it with new values
ON CONFLICT (rule_name) DO UPDATE SET
    rule_type = EXCLUDED.rule_type,
    description = EXCLUDED.description,
    rule_parameters = EXCLUDED.rule_parameters,
    weight = EXCLUDED.weight,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ============================================================================
-- VERIFICATION: Check what was inserted
-- ============================================================================

-- Show all constraint rules
SELECT 
    rule_name,
    rule_type,
    weight,
    is_active,
    description
FROM constraint_rules
ORDER BY 
    CASE rule_type 
        WHEN 'HARD' THEN 1 
        WHEN 'SOFT' THEN 2 
        ELSE 3 
    END,
    weight DESC,
    rule_name;

-- Summary
SELECT 
    rule_type,
    COUNT(*) as count,
    SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_count
FROM constraint_rules
GROUP BY rule_type
ORDER BY rule_type;

-- Success message
SELECT 
    '✅ Constraint rules inserted successfully!' as status,
    (SELECT COUNT(*) FROM constraint_rules) as total_rules,
    (SELECT COUNT(*) FROM constraint_rules WHERE rule_type = 'HARD') as hard_constraints,
    (SELECT COUNT(*) FROM constraint_rules WHERE rule_type = 'SOFT') as soft_constraints,
    'Ready to generate timetables with proper constraints!' as next_step;
