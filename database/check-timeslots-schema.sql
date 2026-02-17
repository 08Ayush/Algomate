-- Check if duration_minutes column exists in time_slots table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'time_slots' 
AND table_schema = 'public'
ORDER BY ordinal_position;
