-- Check if duration_minutes is a generated column
SELECT 
    column_name,
    data_type,
    column_default,
    is_generated,
    generation_expression
FROM information_schema.columns
WHERE table_name = 'time_slots'
    AND column_name IN ('duration_minutes', 'start_time', 'end_time')
ORDER BY ordinal_position;
