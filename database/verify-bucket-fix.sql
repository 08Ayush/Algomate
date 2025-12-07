-- FIX: Remove redundant fields from elective_buckets table
-- The table should only use batch_id, not store duplicate college/course/semester info

-- Check current elective_buckets structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'elective_buckets' 
ORDER BY ordinal_position;

-- If there are old college_id, course, semester columns, they should be removed
-- (This is just for verification - the schema should only have batch_id)

-- Verify the fix worked by showing buckets with their batch information
SELECT 
    eb.id,
    eb.bucket_name,
    eb.batch_id,
    b.name as batch_name,
    b.semester,
    b.college_id,
    c.name as college_name,
    COUNT(s.id) as subject_count
FROM elective_buckets eb
JOIN batches b ON eb.batch_id = b.id
JOIN colleges c ON b.college_id = c.id
LEFT JOIN subjects s ON s.course_group_id = eb.id
WHERE eb.id = 'fd279320-ca26-417a-a38c-dcbd88e5ef61'
GROUP BY eb.id, eb.bucket_name, eb.batch_id, b.name, b.semester, b.college_id, c.name;