-- Verify batches and classrooms count

-- Check batches by semester
SELECT 
  semester,
  COUNT(*) as batch_count,
  STRING_AGG(name, ', ') as batch_names
FROM batches
WHERE is_active = true
GROUP BY semester
ORDER BY semester;

-- Show detailed batch information
SELECT 
  b.id,
  b.name,
  b.semester,
  b.year,
  b.is_active,
  d.name as department_name,
  d.code as department_code,
  c.name as college_name
FROM batches b
JOIN departments d ON b.department_id = d.id
JOIN colleges c ON b.college_id = c.id
WHERE b.is_active = true
ORDER BY b.semester, b.name;

-- Check classrooms
SELECT 
  COUNT(*) as total_classrooms,
  COUNT(CASE WHEN is_available = true THEN 1 END) as available_classrooms
FROM classrooms;

-- Show classroom details
SELECT 
  id,
  room_number,
  building,
  capacity,
  room_type,
  is_available,
  is_lab
FROM classrooms
WHERE is_available = true
ORDER BY building, room_number;

-- Check time_slots count
SELECT 
  COUNT(*) as total_time_slots,
  COUNT(DISTINCT day) as unique_days,
  COUNT(DISTINCT start_time) as unique_start_times
FROM time_slots
WHERE is_active = true;

-- Show time_slots by day
SELECT 
  day,
  COUNT(*) as slots_per_day,
  STRING_AGG(CONCAT(start_time, '-', end_time), ', ' ORDER BY start_time) as time_ranges
FROM time_slots
WHERE is_active = true
GROUP BY day
ORDER BY 
  CASE day
    WHEN 'Monday' THEN 1
    WHEN 'Tuesday' THEN 2
    WHEN 'Wednesday' THEN 3
    WHEN 'Thursday' THEN 4
    WHEN 'Friday' THEN 5
    WHEN 'Saturday' THEN 6
    WHEN 'Sunday' THEN 7
  END;

-- Check subjects for each semester
SELECT 
  semester,
  COUNT(*) as subject_count,
  COUNT(CASE WHEN subject_type = 'THEORY' THEN 1 END) as theory_subjects,
  COUNT(CASE WHEN subject_type = 'LAB' THEN 1 END) as lab_subjects,
  COUNT(CASE WHEN subject_type = 'PRACTICAL' THEN 1 END) as practical_subjects
FROM subjects
WHERE is_active = true
GROUP BY semester
ORDER BY semester;

-- Summary for Manual Scheduling
SELECT 
  'Batches for Semester 3' as item,
  (SELECT COUNT(*) FROM batches WHERE semester = 3 AND is_active = true)::text as count
UNION ALL
SELECT 
  'Batches for Semester 5' as item,
  (SELECT COUNT(*) FROM batches WHERE semester = 5 AND is_active = true)::text as count
UNION ALL
SELECT 
  'Batches for Semester 7' as item,
  (SELECT COUNT(*) FROM batches WHERE semester = 7 AND is_active = true)::text as count
UNION ALL
SELECT 
  'Total Classrooms' as item,
  (SELECT COUNT(*) FROM classrooms WHERE is_available = true)::text as count
UNION ALL
SELECT 
  'Total Time Slots' as item,
  (SELECT COUNT(*) FROM time_slots WHERE is_active = true)::text as count
UNION ALL
SELECT 
  'Subjects for Sem 3' as item,
  (SELECT COUNT(*) FROM subjects WHERE semester = 3 AND is_active = true)::text as count
UNION ALL
SELECT 
  'Faculty Available' as item,
  (SELECT COUNT(*) FROM faculty WHERE is_active = true)::text as count;
