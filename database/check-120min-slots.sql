-- Check if 120-minute slots are marked as lab slots
SELECT 
    id,
    day,
    start_time,
    end_time,
    duration_minutes,
    is_lab_slot,
    is_lunch_break
FROM time_slots
WHERE college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
    AND duration_minutes = 120
ORDER BY 
    CASE day
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        ELSE 7
    END,
    start_time;
