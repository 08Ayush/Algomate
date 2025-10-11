-- ============================================================================
-- ADD NEW CONSTRAINT: Max 1 Lab Per Day
-- Run this in Supabase SQL Editor to add the new constraint rule
-- ============================================================================

-- Insert the new constraint rule
INSERT INTO constraint_rules (rule_name, rule_type, description, rule_parameters, weight, is_active) 
VALUES
    ('max_one_lab_per_day', 'HARD',
     'Maximum one lab session per day for a batch to ensure even distribution',
     '{"scope": "per_timetable", "resource": "batch", "check_type": "lab_per_day", "max_labs": 1}',
     85.0,
     true)
ON CONFLICT (rule_name) DO UPDATE SET
    rule_type = EXCLUDED.rule_type,
    description = EXCLUDED.description,
    rule_parameters = EXCLUDED.rule_parameters,
    weight = EXCLUDED.weight,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Verify insertion
SELECT 
    rule_name,
    rule_type,
    weight,
    is_active,
    description
FROM constraint_rules
WHERE rule_name = 'max_one_lab_per_day';

-- Show all lab-related constraints
SELECT 
    rule_name,
    rule_type,
    weight,
    description
FROM constraint_rules
WHERE description ILIKE '%lab%'
ORDER BY weight DESC;

-- Summary
SELECT 
    '✅ New constraint added successfully!' as status,
    'max_one_lab_per_day' as constraint_name,
    'HARD' as type,
    85.0 as weight,
    'Ensures maximum 1 lab per day for better distribution' as purpose;
