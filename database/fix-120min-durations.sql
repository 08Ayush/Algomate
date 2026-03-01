-- Fix the NULL duration_minutes for 120-minute time slots
-- The generated column formula didn't work for these slots

UPDATE time_slots
SET duration_minutes = 120
WHERE (start_time = '09:00:00' AND end_time = '11:00:00')
   OR (start_time = '11:15:00' AND end_time = '13:15:00')
   OR (start_time = '14:15:00' AND end_time = '16:15:00');

-- Verify the fix
SELECT 
    day,
    start_time,
    end_time,
    duration_minutes,
    is_lab_slot
FROM time_slots
WHERE (start_time = '09:00:00' AND end_time = '11:00:00')
   OR (start_time = '11:15:00' AND end_time = '13:15:00')
   OR (start_time = '14:15:00' AND end_time = '16:15:00')
ORDER BY day, start_time;

-- Count 120-minute slots
SELECT COUNT(*) as total_120min_slots
FROM time_slots
WHERE duration_minutes = 120;
