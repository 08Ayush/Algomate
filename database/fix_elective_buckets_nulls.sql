-- ============================================================================
-- Fix NULL values in elective_buckets table
-- This script populates college_id, course, and semester from the linked batch
-- Run this once to fix existing data
-- ============================================================================

-- Step 1: Update college_id from batches table
UPDATE elective_buckets eb
SET college_id = b.college_id
FROM batches b
WHERE eb.batch_id = b.id
  AND eb.college_id IS NULL;

-- Step 2: Update semester from batches table  
UPDATE elective_buckets eb
SET semester = b.semester
FROM batches b
WHERE eb.batch_id = b.id
  AND eb.semester IS NULL;

-- Step 3: Update course code from courses table via batches
UPDATE elective_buckets eb
SET course = c.code
FROM batches b
JOIN courses c ON b.course_id = c.id
WHERE eb.batch_id = b.id
  AND eb.course IS NULL;

-- Step 4: For any remaining NULLs (where course_id in batch is null), use course title
UPDATE elective_buckets eb
SET course = c.title
FROM batches b
JOIN courses c ON b.course_id = c.id
WHERE eb.batch_id = b.id
  AND eb.course IS NULL;

-- Step 5: Verify the fix - show any remaining NULL values
SELECT 
    eb.id,
    eb.bucket_name,
    eb.batch_id,
    eb.college_id,
    eb.course,
    eb.semester,
    b.name as batch_name,
    b.college_id as batch_college_id,
    b.semester as batch_semester,
    c.code as course_code
FROM elective_buckets eb
LEFT JOIN batches b ON eb.batch_id = b.id
LEFT JOIN courses c ON b.course_id = c.id
WHERE eb.college_id IS NULL 
   OR eb.course IS NULL 
   OR eb.semester IS NULL;

-- If the above returns no rows, all NULL values have been fixed!

-- ============================================================================
-- OPTIONAL: Set default values for any orphaned buckets (no batch)
-- ============================================================================

-- For buckets without a valid batch_id, you may need to manually assign values
-- or delete them if they are orphaned:

-- Option A: Delete orphaned buckets (uncomment to run)
-- DELETE FROM elective_buckets WHERE batch_id IS NULL;

-- Option B: View orphaned buckets for manual review
SELECT * FROM elective_buckets WHERE batch_id IS NULL;
