-- Fix Credit Values for Realistic Timetable Scheduling
-- Run this to update subjects with proper credit values
-- Based on standard NEP 2020 credit system:
-- - Theory subjects: 3-4 credits
-- - Lab subjects: 1-2 credits (each credit = 2 hours)
-- - Mini Projects: 2 credits
-- - MDM/Career Development: 1 credit

-- Update theory subjects to 3 credits
UPDATE subjects
SET 
    credit_value = 3.0,
    credits_per_week = 3,
    weekly_hours = 3
WHERE name IN (
    'Advanced Computer Architecture',
    'Advanced computer vision',
    'Data Communication',
    'Database Management System',
    'Object Oriented Programming',
    'Economics & Management',
    'Environmental Science',
    'Fundamentals of Economics and Management'
)
AND id IN (
    SELECT subject_id FROM batch_subjects 
    WHERE batch_id = 'abbdd58e-f543-4e82-acbf-e813df03e23c'
);

-- Update lab subjects to 1 credit (will get 2 hours per credit)
UPDATE subjects
SET 
    credit_value = 1.0,
    credits_per_week = 1,
    weekly_hours = 2,  -- 1 credit × 2 hours = 2 hour block
    requires_lab = true,
    subject_type = 'lab'
WHERE name LIKE '%Lab%'
AND id IN (
    SELECT subject_id FROM batch_subjects 
    WHERE batch_id = 'abbdd58e-f543-4e82-acbf-e813df03e23c'
);

-- Update Mini Projects to 2 credits
UPDATE subjects
SET 
    credit_value = 2.0,
    credits_per_week = 2,
    weekly_hours = 2,
    requires_lab = true,
    subject_type = 'project'
WHERE name LIKE '%Mini Project%'
AND id IN (
    SELECT subject_id FROM batch_subjects 
    WHERE batch_id = 'abbdd58e-f543-4e82-acbf-e813df03e23c'
);

-- Keep MDM and Career Development at 1 credit (already correct)
UPDATE subjects
SET 
    credit_value = 1.0,
    credits_per_week = 1,
    weekly_hours = 1
WHERE (name LIKE '%MDM%' OR name LIKE '%Career Development%')
AND id IN (
    SELECT subject_id FROM batch_subjects 
    WHERE batch_id = 'abbdd58e-f543-4e82-acbf-e813df03e23c'
);

-- Verify the changes
SELECT 
    name,
    credit_value,
    credits_per_week,
    weekly_hours,
    requires_lab,
    subject_type,
    CASE 
        WHEN requires_lab THEN credit_value * 2
        ELSE credit_value * 1
    END as expected_hours_per_week
FROM subjects
WHERE id IN (
    SELECT subject_id FROM batch_subjects 
    WHERE batch_id = 'abbdd58e-f543-4e82-acbf-e813df03e23c'
)
ORDER BY name;
