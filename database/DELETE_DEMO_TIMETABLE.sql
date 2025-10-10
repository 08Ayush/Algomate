-- ============================================================================
-- DELETE DEMO TIMETABLE
-- This script will help you delete a specific timetable and all related data
-- ============================================================================

-- OPTION 1: Delete by Timetable ID (if you know the ID)
-- ============================================================================

-- First, view all your timetables to find the one to delete
SELECT 
    id,
    title,
    status,
    academic_year,
    semester,
    created_at,
    (SELECT name FROM batches WHERE id = generated_timetables.batch_id) as batch_name,
    (SELECT COUNT(*) FROM scheduled_classes WHERE timetable_id = generated_timetables.id) as class_count
FROM generated_timetables
ORDER BY created_at DESC;

-- Copy the ID of the timetable you want to delete, then run this:
-- Replace 'YOUR-TIMETABLE-ID-HERE' with the actual UUID

/*
DELETE FROM generated_timetables 
WHERE id = 'YOUR-TIMETABLE-ID-HERE';
*/

-- Note: This will automatically delete related records due to CASCADE:
-- - scheduled_classes (all classes for this timetable)
-- - workflow_approvals (all workflow records)
-- - timetable_access_control (all access records)
-- - notifications (related notifications)


-- ============================================================================
-- OPTION 2: Delete ALL Published Timetables (CAREFUL!)
-- ============================================================================

-- First, see what will be deleted
SELECT 
    id,
    title,
    status,
    created_at
FROM generated_timetables
WHERE status = 'published';

-- If you want to delete all published timetables, uncomment and run:
/*
DELETE FROM generated_timetables 
WHERE status = 'published';
*/


-- ============================================================================
-- OPTION 3: Delete Demo/Test Timetables by Title Pattern
-- ============================================================================

-- See timetables with "demo", "test", or "temp" in the title
SELECT 
    id,
    title,
    status,
    created_at
FROM generated_timetables
WHERE LOWER(title) LIKE '%demo%' 
   OR LOWER(title) LIKE '%test%' 
   OR LOWER(title) LIKE '%temp%';

-- Delete them (uncomment to run):
/*
DELETE FROM generated_timetables 
WHERE LOWER(title) LIKE '%demo%' 
   OR LOWER(title) LIKE '%test%' 
   OR LOWER(title) LIKE '%temp%';
*/


-- ============================================================================
-- OPTION 4: Delete by Date (e.g., today's test timetables)
-- ============================================================================

-- See timetables created today
SELECT 
    id,
    title,
    status,
    created_at
FROM generated_timetables
WHERE created_at::date = CURRENT_DATE;

-- Delete today's timetables (uncomment to run):
/*
DELETE FROM generated_timetables 
WHERE created_at::date = CURRENT_DATE;
*/


-- ============================================================================
-- OPTION 5: Delete Specific Timetable with Details
-- ============================================================================

-- Find your timetable by title
SELECT 
    gt.id,
    gt.title,
    gt.status,
    gt.created_at,
    b.name as batch_name,
    u.first_name || ' ' || u.last_name as creator_name,
    COUNT(sc.id) as class_count
FROM generated_timetables gt
LEFT JOIN batches b ON gt.batch_id = b.id
LEFT JOIN users u ON gt.created_by = u.id
LEFT JOIN scheduled_classes sc ON gt.id = sc.timetable_id
WHERE gt.title ILIKE '%your-timetable-name%'  -- Replace with part of your title
GROUP BY gt.id, b.name, u.first_name, u.last_name;

-- Once you confirm it's the right one, delete it:
/*
DELETE FROM generated_timetables 
WHERE title ILIKE '%your-timetable-name%';
*/


-- ============================================================================
-- SAFE DELETION PROCEDURE (Step by Step)
-- ============================================================================

-- Step 1: View the timetable details
DO $$
DECLARE
    tt_id UUID := 'YOUR-TIMETABLE-ID-HERE'; -- Replace with actual ID
    tt_record RECORD;
BEGIN
    SELECT 
        gt.id,
        gt.title,
        gt.status,
        b.name as batch_name,
        u.first_name || ' ' || u.last_name as creator,
        COUNT(sc.id) as classes
    INTO tt_record
    FROM generated_timetables gt
    LEFT JOIN batches b ON gt.batch_id = b.id
    LEFT JOIN users u ON gt.created_by = u.id
    LEFT JOIN scheduled_classes sc ON gt.id = sc.timetable_id
    WHERE gt.id = tt_id
    GROUP BY gt.id, b.name, u.first_name, u.last_name;
    
    RAISE NOTICE '════════════════════════════════════════';
    RAISE NOTICE 'Timetable to Delete:';
    RAISE NOTICE '  ID: %', tt_record.id;
    RAISE NOTICE '  Title: %', tt_record.title;
    RAISE NOTICE '  Status: %', tt_record.status;
    RAISE NOTICE '  Batch: %', tt_record.batch_name;
    RAISE NOTICE '  Creator: %', tt_record.creator;
    RAISE NOTICE '  Classes: %', tt_record.classes;
    RAISE NOTICE '════════════════════════════════════════';
    RAISE NOTICE 'To delete, uncomment the DELETE statement below';
END $$;

-- Step 2: Uncomment this to actually delete
/*
DELETE FROM generated_timetables 
WHERE id = 'YOUR-TIMETABLE-ID-HERE';
*/


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- After deletion, verify it's gone
SELECT COUNT(*) as remaining_timetables
FROM generated_timetables;

-- Check for orphaned records (should be 0 due to CASCADE)
SELECT COUNT(*) as orphaned_classes
FROM scheduled_classes
WHERE timetable_id NOT IN (SELECT id FROM generated_timetables);

SELECT COUNT(*) as orphaned_workflows
FROM workflow_approvals
WHERE timetable_id NOT IN (SELECT id FROM generated_timetables);


-- ============================================================================
-- QUICK DELETE FOR MOST RECENT TIMETABLE
-- ============================================================================

-- This deletes the most recently created timetable (BE CAREFUL!)
/*
DELETE FROM generated_timetables 
WHERE id = (
    SELECT id 
    FROM generated_timetables 
    ORDER BY created_at DESC 
    LIMIT 1
);
*/


-- ============================================================================
-- CLEAN UP ALL TEST DATA (NUCLEAR OPTION - BE VERY CAREFUL!)
-- ============================================================================

-- This will delete ALL timetables and start fresh
-- ONLY use this if you want to completely reset the timetables
/*
TRUNCATE TABLE generated_timetables CASCADE;
-- This also clears: scheduled_classes, workflow_approvals, etc.
*/


-- ============================================================================
-- RECOMMENDED APPROACH
-- ============================================================================

-- 1. First, list all timetables
SELECT 
    id,
    title,
    status,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created,
    (SELECT COUNT(*) FROM scheduled_classes WHERE timetable_id = generated_timetables.id) as classes
FROM generated_timetables
ORDER BY created_at DESC;

-- 2. Copy the ID of the timetable you want to delete

-- 3. Delete it (replace the ID):
-- DELETE FROM generated_timetables WHERE id = 'paste-id-here';

-- 4. Verify deletion:
-- SELECT * FROM generated_timetables ORDER BY created_at DESC;
