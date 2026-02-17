-- Summary of latest timetable generation
-- Shows counts and identifies what's missing

WITH latest_tt AS (
    SELECT id FROM generated_timetables 
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT subject_id) as unique_subjects,
    COUNT(CASE WHEN is_lab = true THEN 1 END) as lab_records,
    COUNT(CASE WHEN is_lab = false THEN 1 END) as theory_records,
    COUNT(CASE WHEN is_continuation = true THEN 1 END) as continuation_records,
    COUNT(CASE WHEN session_number = 1 THEN 1 END) as first_sessions,
    COUNT(CASE WHEN session_number = 2 THEN 1 END) as second_sessions
FROM scheduled_classes
WHERE timetable_id = (SELECT id FROM latest_tt);

-- Show which subjects were scheduled
SELECT 
    s.code,
    s.name,
    s.credits_per_week,
    s.lab_hours,
    s.is_lab,
    COUNT(sc.id) as scheduled_count,
    COUNT(CASE WHEN sc.is_continuation = true THEN 1 END) as continuation_count
FROM subjects s
LEFT JOIN scheduled_classes sc ON s.id = sc.subject_id 
    AND sc.timetable_id = (SELECT id FROM generated_timetables ORDER BY created_at DESC LIMIT 1)
WHERE s.semester = 4 AND s.department_id IN (
    SELECT department_id FROM batches WHERE id = (
        SELECT batch_id FROM scheduled_classes 
        WHERE timetable_id = (SELECT id FROM generated_timetables ORDER BY created_at DESC LIMIT 1)
        LIMIT 1
    )
)
GROUP BY s.id, s.code, s.name, s.credits_per_week, s.lab_hours, s.is_lab
ORDER BY s.code;
