-- Check what's actually scheduled for labs
-- This will show if labs are getting proper time allocations

SELECT 
    sc.id,
    s.name as subject_name,
    s.subject_type,
    ts.day,
    ts.start_time,
    ts.end_time,
    EXTRACT(EPOCH FROM (ts.end_time - ts.start_time)) / 60 AS slot_duration_minutes,
    sc.is_lab,
    sc.is_continuation,
    sc.session_number
FROM scheduled_classes sc
JOIN subjects s ON sc.subject_id = s.id
JOIN time_slots ts ON sc.time_slot_id = ts.id
WHERE sc.timetable_id = (
    SELECT id FROM generated_timetables 
    ORDER BY created_at DESC 
    LIMIT 1
)
AND (s.subject_type = 'LAB' OR s.subject_type = 'PRACTICAL' OR sc.is_lab = true)
ORDER BY ts.day, ts.start_time;

-- Summary: Count how many slots each lab subject got
SELECT 
    s.name as subject_name,
    s.code as subject_code,
    COUNT(*) as slots_allocated,
    s.lab_hours,
    s.credits_per_week,
    ARRAY_AGG(DISTINCT ts.day ORDER BY ts.day) as days_scheduled
FROM scheduled_classes sc
JOIN subjects s ON sc.subject_id = s.id
JOIN time_slots ts ON sc.time_slot_id = ts.id
WHERE sc.timetable_id = (
    SELECT id FROM generated_timetables 
    ORDER BY created_at DESC 
    LIMIT 1
)
AND (s.subject_type = 'LAB' OR s.subject_type = 'PRACTICAL' OR sc.is_lab = true)
GROUP BY s.id, s.name, s.code, s.lab_hours, s.credits_per_week
ORDER BY s.name;
