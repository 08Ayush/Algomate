-- ============================================================================
-- DIAGNOSTIC QUERIES FOR TIMETABLE SAVE DEBUGGING
-- Run these in Supabase SQL Editor to diagnose issues
-- ============================================================================

-- 1. CHECK BATCH DATA
-- This shows all details about your semester 3 batch
SELECT 
  b.id as batch_id,
  b.name as batch_name,
  b.semester,
  b.section,
  b.academic_year,
  b.expected_strength,
  b.actual_strength,
  b.is_active,
  d.id as department_id,
  d.name as department_name,
  d.code as dept_code,
  c.id as college_id,
  c.name as college_name,
  c.code as college_code
FROM batches b
JOIN departments d ON b.department_id = d.id
JOIN colleges c ON b.college_id = c.id
WHERE b.semester = 3 
  AND b.is_active = true
LIMIT 1;

-- 2. CHECK TIME SLOTS
-- Verify time slots exist for your college
SELECT 
  ts.id,
  ts.college_id,
  ts.day,
  ts.start_time,
  ts.end_time,
  ts.is_break_time,
  ts.is_lunch_time,
  ts.is_active
FROM time_slots ts
WHERE ts.is_active = true
ORDER BY 
  CASE ts.day
    WHEN 'Monday' THEN 1
    WHEN 'Tuesday' THEN 2
    WHEN 'Wednesday' THEN 3
    WHEN 'Thursday' THEN 4
    WHEN 'Friday' THEN 5
    WHEN 'Saturday' THEN 6
  END,
  ts.start_time
LIMIT 20;

-- 3. CHECK CLASSROOMS
-- Verify classrooms exist for your department
SELECT 
  cr.id,
  cr.name,
  cr.capacity,
  cr.has_projector,
  cr.has_lab_equipment,
  cr.is_available,
  d.name as department_name
FROM classrooms cr
JOIN departments d ON cr.department_id = d.id
WHERE cr.is_available = true
ORDER BY cr.name
LIMIT 10;

-- 4. CHECK SUBJECTS FOR SEMESTER 3
-- Verify subjects exist for the semester
SELECT 
  s.id,
  s.name,
  s.code,
  s.subject_type,
  s.credits_per_week,
  s.semester,
  s.is_active,
  d.name as department_name
FROM subjects s
JOIN departments d ON s.department_id = d.id
WHERE s.semester = 3
  AND s.is_active = true
ORDER BY s.name
LIMIT 20;

-- 5. CHECK FACULTY AND QUALIFICATIONS
-- Verify faculty are qualified for semester 3 subjects
SELECT 
  u.id as faculty_id,
  u.first_name || ' ' || u.last_name as faculty_name,
  u.email,
  COUNT(fqs.subject_id) as qualified_subjects_count,
  STRING_AGG(s.name, ', ') as qualified_for
FROM users u
JOIN faculty_qualified_subjects fqs ON u.id = fqs.faculty_id
JOIN subjects s ON fqs.subject_id = s.id
WHERE u.role = 'faculty'
  AND u.is_active = true
  AND s.semester = 3
GROUP BY u.id, u.first_name, u.last_name, u.email
ORDER BY qualified_subjects_count DESC
LIMIT 10;

-- 6. CHECK RECENT TIMETABLE GENERATION TASKS
-- See if any tasks were created recently
SELECT 
  tgt.id,
  tgt.task_name,
  tgt.status,
  tgt.current_phase,
  tgt.progress,
  tgt.current_message,
  tgt.created_by,
  tgt.created_at,
  tgt.error_details,
  b.name as batch_name
FROM timetable_generation_tasks tgt
LEFT JOIN batches b ON tgt.batch_id = b.id
ORDER BY tgt.created_at DESC
LIMIT 5;

-- 7. CHECK RECENT TIMETABLES
-- See if any timetables were created recently
SELECT 
  gt.id,
  gt.title,
  gt.semester,
  gt.status,
  gt.fitness_score,
  gt.created_at,
  gt.generation_task_id,
  b.name as batch_name,
  u.first_name || ' ' || u.last_name as created_by_name
FROM generated_timetables gt
LEFT JOIN batches b ON gt.batch_id = b.id
LEFT JOIN users u ON gt.created_by = u.id
ORDER BY gt.created_at DESC
LIMIT 5;

-- 8. CHECK SCHEDULED CLASSES
-- See if any classes were created recently
SELECT 
  sc.id,
  sc.timetable_id,
  sc.credit_hour_number,
  sc.class_type,
  sc.session_duration,
  s.name as subject_name,
  u.first_name || ' ' || u.last_name as faculty_name,
  cr.name as classroom_name,
  sc.created_at
FROM scheduled_classes sc
LEFT JOIN subjects s ON sc.subject_id = s.id
LEFT JOIN users u ON sc.faculty_id = u.id
LEFT JOIN classrooms cr ON sc.classroom_id = cr.id
ORDER BY sc.created_at DESC
LIMIT 10;

-- 9. CHECK WORKFLOW APPROVALS
-- See recent workflow activities
SELECT 
  wa.id,
  wa.timetable_id,
  wa.workflow_step,
  wa.performed_by,
  wa.comments,
  wa.created_at,
  u.first_name || ' ' || u.last_name as performed_by_name
FROM workflow_approvals wa
LEFT JOIN users u ON wa.performed_by = u.id
ORDER BY wa.created_at DESC
LIMIT 5;

-- 10. CHECK USER DETAILS
-- Verify your user has all required fields
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  u.faculty_type,
  u.department_id,
  u.college_id,
  u.is_active,
  d.name as department_name,
  c.name as college_name
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN colleges c ON u.college_id = c.id
WHERE u.role = 'faculty'
  AND u.is_active = true
ORDER BY u.created_at DESC
LIMIT 5;

-- ============================================================================
-- CLEANUP QUERIES (Use only if needed to clear test data)
-- ============================================================================

-- Delete recent test timetables (CAREFUL! This deletes data)
/*
DELETE FROM scheduled_classes 
WHERE timetable_id IN (
  SELECT id FROM generated_timetables 
  WHERE created_at > NOW() - INTERVAL '1 hour'
);

DELETE FROM generated_timetables 
WHERE created_at > NOW() - INTERVAL '1 hour';

DELETE FROM timetable_generation_tasks 
WHERE created_at > NOW() - INTERVAL '1 hour';

DELETE FROM workflow_approvals 
WHERE created_at > NOW() - INTERVAL '1 hour';
*/

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================

/*
QUERY 1 (Batch): Should return 1 row with batch details including IDs
QUERY 2 (Time Slots): Should return 40-50 rows (8 slots per day × 6 days)
QUERY 3 (Classrooms): Should return multiple classrooms
QUERY 4 (Subjects): Should return subjects for semester 3
QUERY 5 (Faculty): Should return faculty qualified for semester 3 subjects
QUERY 6-9: Will show recent activity (may be empty initially)
QUERY 10 (Users): Should show your user with department_id and college_id

IF ANY OF THESE RETURN 0 ROWS, THAT'S YOUR PROBLEM!
*/

-- ============================================================================
-- QUICK FIX: CREATE MISSING DATA
-- ============================================================================

-- If time_slots is empty, create them
/*
DO $$
DECLARE
  v_college_id UUID;
  v_days TEXT[] := ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  v_day TEXT;
BEGIN
  -- Get first active college
  SELECT id INTO v_college_id FROM colleges WHERE is_active = true LIMIT 1;
  
  -- Create time slots for each day
  FOREACH v_day IN ARRAY v_days
  LOOP
    INSERT INTO time_slots (college_id, day, start_time, end_time, slot_number, is_break_time, is_lunch_time, is_active)
    VALUES
      (v_college_id, v_day::day_of_week, '09:00:00', '10:00:00', 1, false, false, true),
      (v_college_id, v_day::day_of_week, '10:00:00', '11:00:00', 2, false, false, true),
      (v_college_id, v_day::day_of_week, '11:00:00', '11:20:00', 3, true, false, true),
      (v_college_id, v_day::day_of_week, '11:20:00', '12:20:00', 4, false, false, true),
      (v_college_id, v_day::day_of_week, '12:20:00', '13:20:00', 5, false, false, true),
      (v_college_id, v_day::day_of_week, '13:20:00', '14:20:00', 6, false, true, true),
      (v_college_id, v_day::day_of_week, '14:20:00', '15:20:00', 7, false, false, true),
      (v_college_id, v_day::day_of_week, '15:20:00', '16:20:00', 8, false, false, true);
  END LOOP;
  
  RAISE NOTICE 'Created % time slots', (SELECT COUNT(*) FROM time_slots);
END $$;
*/
