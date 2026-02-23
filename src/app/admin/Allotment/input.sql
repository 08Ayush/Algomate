-- 1. Ordered Preferences (Bucket Selection) with Submission Timestamp
SELECT 
    scs.subject_id,
    s.name AS subject_name,
    s.course_group_id AS bucket_id,
    eb.bucket_name,
    scs.enrolled_at AS submission_timestamp
FROM student_course_selections scs
JOIN subjects s ON scs.subject_id = s.id
LEFT JOIN elective_buckets eb ON s.course_group_id = eb.id
WHERE scs.student_id = :student_id
  AND scs.semester = :semester
  AND scs.academic_year = :academic_year
ORDER BY scs.enrolled_at ASC; -- or by preference order if you store it

-- 2. Current Academic Standing (CGPA)
SELECT credit AS cgpa
FROM users
WHERE id = :student_id;

-- 3. Parent Department ID
SELECT department_id
FROM users
WHERE id = :student_id;