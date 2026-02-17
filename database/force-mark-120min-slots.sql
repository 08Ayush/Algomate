-- Update 120-minute slots even if is_lab_slot is NULL
UPDATE time_slots
SET is_lab_slot = TRUE
WHERE duration_minutes = 120
    AND college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
    AND (is_lab_slot IS NULL OR is_lab_slot = FALSE);

-- Verify
SELECT 
    duration_minutes,
    is_lab_slot,
    COUNT(*) as count
FROM time_slots
WHERE college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
    AND duration_minutes = 120
GROUP BY duration_minutes, is_lab_slot;
