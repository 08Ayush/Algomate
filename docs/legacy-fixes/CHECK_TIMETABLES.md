# Timetable Troubleshooting Guide

## Issue
Student dashboard shows "No published timetables available"

## Diagnostic Steps

### 1. Check if any timetables exist in database
Run this query in Supabase SQL Editor:
```sql
SELECT 
    id, 
    title, 
    status, 
    batch_id,
    academic_year,
    semester,
    created_at,
    approved_at
FROM generated_timetables
ORDER BY created_at DESC
LIMIT 10;
```

### 2. Check published timetables specifically
```sql
SELECT 
    gt.id,
    gt.title,
    gt.status,
    gt.batch_id,
    gt.semester,
    b.name as batch_name,
    b.section,
    b.course_id,
    c.code as course_code,
    c.title as course_title
FROM generated_timetables gt
LEFT JOIN batches b ON b.id = gt.batch_id
LEFT JOIN courses c ON c.id = b.course_id
WHERE gt.status = 'published'
ORDER BY gt.approved_at DESC;
```

### 3. Check student's course and batch info
Open browser console and look for these logs when you load the student dashboard:
- `📥 Dashboard data received:` - Check the `user.course_id` value
- `📚 Published timetables received:` - Check if any timetables are returned

### 4. Check if there are scheduled classes for timetables
```sql
SELECT 
    gt.id,
    gt.title,
    COUNT(sc.id) as class_count
FROM generated_timetables gt
LEFT JOIN scheduled_classes sc ON sc.timetable_id = gt.id
WHERE gt.status = 'published'
GROUP BY gt.id, gt.title;
```

## Common Issues and Solutions

### Issue: No timetables at all
**Solution**: Generate a timetable first from the publisher dashboard

### Issue: Timetables exist but status is not 'published'
**Solution**: Publish the timetable from the publisher dashboard
```sql
-- Check current statuses
SELECT status, COUNT(*) 
FROM generated_timetables 
GROUP BY status;

-- If needed, manually publish a timetable (replace <timetable_id>)
UPDATE generated_timetables 
SET status = 'published', approved_at = NOW()
WHERE id = '<timetable_id>';
```

### Issue: Course ID mismatch
**Solution**: Verify student's course_id matches batch's course_id
```sql
-- Check student's course
SELECT id, first_name, last_name, course_id, current_semester
FROM users 
WHERE role = 'student' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check batches
SELECT id, name, section, course_id, semester
FROM batches
WHERE is_active = true;
```

### Issue: Batch not linked properly
**Solution**: Check if student's semester matches available batches
```sql
-- Find students without matching batches
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.course_id,
    u.current_semester,
    COUNT(b.id) as matching_batches
FROM users u
LEFT JOIN batches b ON b.course_id = u.course_id 
    AND b.semester = u.current_semester 
    AND b.is_active = true
WHERE u.role = 'student'
GROUP BY u.id, u.first_name, u.last_name, u.course_id, u.current_semester
HAVING COUNT(b.id) = 0;
```

## Quick Fix
If you need to quickly test, manually publish an existing timetable:
```sql
UPDATE generated_timetables 
SET status = 'published', 
    approved_at = NOW(),
    approved_by = created_by
WHERE status = 'draft'
LIMIT 1;
```

## Check Console Logs
After refreshing the student dashboard, check browser console for:
1. `📚 Fetching published timetables with params:` - Shows what courseId is being searched
2. `🔍 Debug: Sample timetables in DB:` - Shows if any timetables exist at all
3. `📊 Found X published timetables` - Shows how many match the query
4. `✅ X timetables match courseId` - Shows filtering results
