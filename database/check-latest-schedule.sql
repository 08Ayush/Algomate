-- Check the latest timetable generation results
-- Shows all scheduled classes with their continuation status

SELECT 
    sc.id,
    b.name as batch,
    s.code as subject_code,
    s.name as subject_name,
    f.name as faculty,
    ts.day,
    ts.start_time,
    ts.end_time,
    ts.duration_minutes,
    sc.is_lab,
    sc.is_continuation,
    sc.session_number,
    sc.credit_hour_number,
    r.name as room
FROM scheduled_classes sc
JOIN generated_timetables gt ON sc.timetable_id = gt.id
JOIN batches b ON sc.batch_id = b.id
JOIN subjects s ON sc.subject_id = s.id
JOIN faculty f ON sc.faculty_id = f.id
JOIN time_slots ts ON sc.time_slot_id = ts.id
JOIN classrooms r ON sc.classroom_id = r.id
WHERE gt.id = (
    SELECT id FROM generated_timetables 
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY 
    CASE ts.day
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        ELSE 7
    END,
    ts.start_time,
    sc.session_number;
