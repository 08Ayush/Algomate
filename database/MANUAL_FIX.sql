-- MANUAL FIX: Create B.Ed batch and link existing bucket
-- Copy and paste this into Supabase SQL Editor

-- Step 1: Create B.Ed batch
DO $$ 
DECLARE
    new_batch_id UUID;
BEGIN
    -- Insert the batch and capture the ID
    INSERT INTO batches (
        id, name, college_id, department_id, semester, academic_year,
        expected_strength, actual_strength, section, is_active
    ) VALUES (
        gen_random_uuid(),
        'B.Ed - Semester 1',
        'afbcc29b-8b1c-40b9-baf7-e5a494aabe02'::UUID,
        'f95bcc58-1758-4c34-ba97-936175b4ca91'::UUID,
        1,
        '2025-26',
        30,
        25,
        'A',
        true
    ) 
    ON CONFLICT (college_id, department_id, semester, section, academic_year) 
    DO NOTHING
    RETURNING id INTO new_batch_id;

    -- If batch already exists, get its ID
    IF new_batch_id IS NULL THEN
        SELECT id INTO new_batch_id 
        FROM batches 
        WHERE college_id = 'afbcc29b-8b1c-40b9-baf7-e5a494aabe02'::UUID
        AND department_id = 'f95bcc58-1758-4c34-ba97-936175b4ca91'::UUID
        AND semester = 1
        AND section = 'A'
        AND academic_year = '2025-26';
    END IF;

    -- Step 2: Update existing bucket to link to batch
    UPDATE elective_buckets 
    SET batch_id = new_batch_id
    WHERE id = 'fd279320-ca26-417a-a38c-dcbd88e5ef61'::UUID;

    -- Step 3: Verify the fix
    RAISE NOTICE 'Batch ID: %', new_batch_id;
END $$;

-- Verification query
SELECT 
    eb.bucket_name,
    eb.batch_id,
    b.name as batch_name,
    b.semester,
    COUNT(s.id) as subject_count
FROM elective_buckets eb
LEFT JOIN batches b ON eb.batch_id = b.id
LEFT JOIN subjects s ON s.course_group_id = eb.id
WHERE eb.id = 'fd279320-ca26-417a-a38c-dcbd88e5ef61'
GROUP BY eb.id, eb.bucket_name, eb.batch_id, b.name, b.semester;