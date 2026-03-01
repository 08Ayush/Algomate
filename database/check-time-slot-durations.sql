-- Check time slot durations to verify if any have > 60 minutes
-- This will help diagnose why splitting isn't working

SELECT 
    id,
    day,
    start_time,
    end_time,
    EXTRACT(EPOCH FROM (end_time - start_time)) / 60 AS duration_minutes,
    is_lab_slot,
    college_id
FROM time_slots
WHERE college_id = (SELECT id FROM colleges LIMIT 1)
ORDER BY day, start_time;

-- Count slots by duration
WITH slot_durations AS (
    SELECT 
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60 AS duration_minutes
    FROM time_slots
    WHERE college_id = (SELECT id FROM colleges LIMIT 1)
)
SELECT 
    duration_minutes,
    COUNT(*) as slot_count,
    CASE 
        WHEN duration_minutes > 60 THEN '⚠️ MULTI-HOUR'
        ELSE '✓ Single-hour'
    END as slot_type
FROM slot_durations
GROUP BY duration_minutes
ORDER BY duration_minutes;
