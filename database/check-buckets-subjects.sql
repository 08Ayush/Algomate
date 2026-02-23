-- Check specific faculty's batches and buckets
-- Replace 'afbcc29b-8b1c-40b9-baf7-e5a494aabe02' with your faculty's college_id if different
SELECT 
    b.id as batch_id,
    b.name as batch_name,
    b.semester,
    b.section,
    b.college_id as batch_college_id,
    c.code as course_code,
    c.title as course_title,
    eb.id as bucket_id,
    eb.bucket_name,
    COUNT(DISTINCT s.id) as subject_count_with_college_filter,
    STRING_AGG(s.code || ' (' || s.college_id || ')', ', ') as subjects_with_college
FROM batches b
LEFT JOIN courses c ON c.id = b.course_id
LEFT JOIN elective_buckets eb ON eb.batch_id = b.id
LEFT JOIN subjects s ON s.course_group_id = eb.id 
    AND s.is_active = true 
    AND s.college_id = 'afbcc29b-8b1c-40b9-baf7-e5a494aabe02'
WHERE b.is_active = true 
    AND b.college_id = 'afbcc29b-8b1c-40b9-baf7-e5a494aabe02'
GROUP BY b.id, b.name, b.semester, b.section, b.college_id, c.code, c.title, eb.id, eb.bucket_name
ORDER BY b.semester, b.section, eb.bucket_name;

-- Check subjects WITHOUT college filter to see if they exist with different college_id
SELECT 
    eb.bucket_name,
    eb.id as bucket_id,
    s.id as subject_id,
    s.code as subject_code,
    s.name as subject_name,
    s.course_group_id,
    s.college_id as subject_college_id,
    s.is_active
FROM elective_buckets eb
LEFT JOIN subjects s ON s.course_group_id = eb.id
WHERE eb.batch_id IN (
    SELECT id FROM batches 
    WHERE college_id = 'afbcc29b-8b1c-40b9-baf7-e5a494aabe02' 
    AND is_active = true
)
ORDER BY eb.bucket_name, s.code;

-- Detailed view of buckets
SELECT 
    b.name as batch_name,
    b.semester,
    b.section,
    eb.id as bucket_id,
    eb.bucket_name,
    eb.min_selection,
    eb.max_selection,
    COUNT(s.id) as subject_count,
    STRING_AGG(s.code || ': ' || s.name, ', ') as subjects
FROM batches b
LEFT JOIN elective_buckets eb ON eb.batch_id = b.id
LEFT JOIN subjects s ON s.course_group_id = eb.id AND s.is_active = true
WHERE b.is_active = true
GROUP BY b.id, b.name, b.semester, b.section, eb.id, eb.bucket_name, eb.min_selection, eb.max_selection
ORDER BY b.semester, b.section, eb.bucket_name;

-- Check if there are any elective buckets at all
SELECT COUNT(*) as total_buckets FROM elective_buckets;

-- Check if there are any subjects with course_group_id
SELECT COUNT(*) as subjects_in_buckets FROM subjects WHERE course_group_id IS NOT NULL;
