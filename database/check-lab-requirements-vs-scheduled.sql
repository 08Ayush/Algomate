-- Check lab requirements vs what was actually scheduled
-- Shows if labs with 2+ hour requirements are getting enough time slots

WITH latest_tt AS (
    SELECT id FROM generated_timetables 
    ORDER BY created_at DESC 
    LIMIT 1
),
lab_subjects AS (
    SELECT 
        s.id,
        s.code,
        s.name,
        s.credits_per_week,
        s.lab_hours,
        s.is_lab
    FROM subjects s
    WHERE s.semester = 4 
        AND s.is_lab = true
        AND s.department_id = 'b8674bda-6101-4e60-95e7-f28b2edc1c4e' -- CSE dept
)
SELECT 
    ls.code,
    ls.name,
    ls.lab_hours as required_hours,
    COUNT(sc.id) as scheduled_records,
    COUNT(CASE WHEN ts.duration_minutes = 60 THEN 1 END) as single_hour_slots,
    COUNT(CASE WHEN ts.duration_minutes = 120 THEN 1 END) as two_hour_slots,
    STRING_AGG(DISTINCT ts.day || ' ' || ts.start_time, ', ' ORDER BY ts.day || ' ' || ts.start_time) as time_slots_used,
    MAX(sc.is_continuation::int) as has_continuations
FROM lab_subjects ls
LEFT JOIN scheduled_classes sc ON ls.id = sc.subject_id 
    AND sc.timetable_id = (SELECT id FROM latest_tt)
LEFT JOIN time_slots ts ON sc.time_slot_id = ts.id
GROUP BY ls.id, ls.code, ls.name, ls.lab_hours
ORDER BY ls.code;

-- Also show what 120-minute slots are available but unused
SELECT 
    ts.day,
    ts.start_time,
    ts.end_time,
    ts.duration_minutes,
    COUNT(sc.id) as times_used
FROM time_slots ts
LEFT JOIN scheduled_classes sc ON ts.id = sc.time_slot_id
    AND sc.timetable_id = (SELECT id FROM generated_timetables ORDER BY created_at DESC LIMIT 1)
WHERE ts.duration_minutes = 120
    AND ts.college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
GROUP BY ts.id, ts.day, ts.start_time, ts.end_time, ts.duration_minutes
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
    ts.start_time;
