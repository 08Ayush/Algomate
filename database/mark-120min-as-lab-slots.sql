--Update 120-minute time slots to be marked as lab slots
-- This ensures the algorithm will prefer them for lab assignments

UPDATE time_slots
SET is_lab_slot = TRUE
WHERE duration_minutes = 120
    AND college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f';

-- Verify the update
SELECT COUNT(*) as updated_count
FROM time_slots
WHERE duration_minutes = 120
    AND is_lab_slot = TRUE
    AND college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f';
