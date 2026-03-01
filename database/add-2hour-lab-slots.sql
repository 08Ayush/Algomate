-- Create 2-hour (120-minute) time slots for lab sessions
-- These will allow the algorithm to assign labs to proper 2-hour blocks

-- First, check what college_id to use
DO $$
DECLARE
    v_college_id UUID;
BEGIN
    SELECT id INTO v_college_id FROM colleges LIMIT 1;
    
    -- Create 2-hour lab slots for each day
    -- Assumes labs run from 9:00-11:00, 11:15-13:15, and 14:15-16:15
    
    -- Monday 9:00-11:00 (2 hours)
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Monday', '09:00:00', '11:00:00', true, true)
    ON CONFLICT DO NOTHING;
    
    -- Monday 11:15-13:15 (2 hours)
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Monday', '11:15:00', '13:15:00', true, true)
    ON CONFLICT DO NOTHING;
    
    -- Monday 14:15-16:15 (2 hours)
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Monday', '14:15:00', '16:15:00', true, true)
    ON CONFLICT DO NOTHING;
    
    -- Repeat for other days (Tuesday through Saturday)
    -- Tuesday
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Tuesday', '09:00:00', '11:00:00', true, true)
    ON CONFLICT DO NOTHING;
    
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Tuesday', '11:15:00', '13:15:00', true, true)
    ON CONFLICT DO NOTHING;
    
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Tuesday', '14:15:00', '16:15:00', true, true)
    ON CONFLICT DO NOTHING;
    
    -- Wednesday
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Wednesday', '09:00:00', '11:00:00', true, true)
    ON CONFLICT DO NOTHING;
    
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Wednesday', '11:15:00', '13:15:00', true, true)
    ON CONFLICT DO NOTHING;
    
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Wednesday', '14:15:00', '16:15:00', true, true)
    ON CONFLICT DO NOTHING;
    
    -- Thursday
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Thursday', '09:00:00', '11:00:00', true, true)
    ON CONFLICT DO NOTHING;
    
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Thursday', '11:15:00', '13:15:00', true, true)
    ON CONFLICT DO NOTHING;
    
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Thursday', '14:15:00', '16:15:00', true, true)
    ON CONFLICT DO NOTHING;
    
    -- Friday
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Friday', '09:00:00', '11:00:00', true, true)
    ON CONFLICT DO NOTHING;
    
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Friday', '11:15:00', '13:15:00', true, true)
    ON CONFLICT DO NOTHING;
    
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Friday', '14:15:00', '16:15:00', true, true)
    ON CONFLICT DO NOTHING;
    
    -- Saturday
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Saturday', '09:00:00', '11:00:00', true, true)
    ON CONFLICT DO NOTHING;
    
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Saturday', '11:15:00', '13:15:00', true, true)
    ON CONFLICT DO NOTHING;
    
    INSERT INTO time_slots (id, college_id, day, start_time, end_time, is_lab_slot, is_active)
    VALUES (gen_random_uuid(), v_college_id, 'Saturday', '14:15:00', '16:15:00', true, true)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Created 2-hour lab time slots for college %', v_college_id;
END $$;

-- Verify the new slots
SELECT 
    day,
    start_time,
    end_time,
    duration_minutes,
    is_lab_slot
FROM time_slots
WHERE duration_minutes = 120
ORDER BY day, start_time;
