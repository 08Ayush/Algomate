-- Diagnostic: Check ALL time slots for this college
SELECT 
    duration_minutes,
    is_lab_slot,
    COUNT(*) as slot_count,
    STRING_AGG(DISTINCT day::text, ', ' ORDER BY day::text) as days_with_this_config
FROM time_slots
WHERE college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
GROUP BY duration_minutes, is_lab_slot
ORDER BY duration_minutes, is_lab_slot;

-- Show first few 120-minute slots in detail
SELECT 
    id,
    day,
    start_time,
    end_time,
    duration_minutes,
    is_lab_slot,
    college_id
FROM time_slots
WHERE college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
    AND duration_minutes = 120
LIMIT 5;

-- If no results above, check if 120min slots exist at all
SELECT COUNT(*) as total_120min_slots
FROM time_slots
WHERE duration_minutes = 120;
