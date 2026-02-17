-- Check if the 2-hour slots were inserted (without duration filter)
SELECT 
    id,
    day,
    start_time,
    end_time,
    duration_minutes,
    is_lab_slot
FROM time_slots
WHERE start_time = '09:00:00' AND end_time = '11:00:00'
   OR start_time = '11:15:00' AND end_time = '13:15:00'
   OR start_time = '14:15:00' AND end_time = '16:15:00'
ORDER BY day, start_time
LIMIT 20;

-- Check the schema to see if duration_minutes is a generated column
SELECT 
    column_name,
    data_type,
    is_generated,
    generation_expression
FROM information_schema.columns
WHERE table_name = 'time_slots'
    AND column_name = 'duration_minutes';
