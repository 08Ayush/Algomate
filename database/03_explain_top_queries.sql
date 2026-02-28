-- ============================================================================
-- EXPLAIN ANALYZE for top application queries
-- Replace placeholder UUIDs/values before running, or set via psql variables
-- ============================================================================

-- 1) User lookup by email
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM users WHERE email = 'replace_email@example.com';

-- 2) Notifications: unread recent
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id FROM notifications WHERE recipient_id = '00000000-0000-0000-0000-000000000000' AND is_read = FALSE ORDER BY created_at DESC LIMIT 20;

-- 3) Generated timetables: published list for college
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM generated_timetables WHERE college_id = '00000000-0000-0000-0000-000000000000' AND status = 'published' ORDER BY created_at DESC LIMIT 20;

-- 4) Scheduled classes for a faculty
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM scheduled_classes WHERE faculty_id = '00000000-0000-0000-0000-000000000000' ORDER BY time_slot_id, start_time LIMIT 200;

-- 5) Subjects by department + semester
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, code, name FROM subjects WHERE department_id = '00000000-0000-0000-0000-000000000000' AND semester = 1 AND is_active = TRUE ORDER BY code LIMIT 200;

-- 6) Assignments published for a batch
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM assignments WHERE batch_id = '00000000-0000-0000-0000-000000000000' AND is_published = TRUE ORDER BY created_at DESC LIMIT 50;

-- 7) Events listing by department + status
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM events WHERE department_id = '00000000-0000-0000-0000-000000000000' AND status = 'approved' ORDER BY created_at DESC LIMIT 50;

-- 8) Assignment submissions for a student
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, assignment_id, submission_status, submitted_at FROM assignment_submissions WHERE student_id = '00000000-0000-0000-0000-000000000000' AND submission_status = 'SUBMITTED' ORDER BY submitted_at DESC LIMIT 100;

-- 9) Student course selections (NEP)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM student_course_selections WHERE student_id = '00000000-0000-0000-0000-000000000000' AND semester = 1;

-- 10) Elective buckets for batch (student view)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM elective_buckets WHERE batch_id = '00000000-0000-0000-0000-000000000000' AND is_live_for_students = TRUE AND is_published = TRUE LIMIT 50;

-- End of EXPLAIN set
