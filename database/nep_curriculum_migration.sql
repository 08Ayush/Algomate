-- ============================================================================
-- NEP Curriculum Builder Migration
-- Add course and semester columns to elective_buckets for college-level curriculum
-- ============================================================================

-- Step 1: Add new columns to elective_buckets table
ALTER TABLE elective_buckets 
ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS course VARCHAR(50),
ADD COLUMN IF NOT EXISTS semester INTEGER CHECK (semester BETWEEN 1 AND 8);

-- Step 2: Make batch_id nullable (for backwards compatibility)
ALTER TABLE elective_buckets 
ALTER COLUMN batch_id DROP NOT NULL;

-- Step 3: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_elective_buckets_college_course_semester 
ON elective_buckets(college_id, course, semester);

CREATE INDEX IF NOT EXISTS idx_elective_buckets_batch 
ON elective_buckets(batch_id) 
WHERE batch_id IS NOT NULL;

-- Step 4: Add a check constraint to ensure either batch_id OR (college_id + course + semester) is provided
ALTER TABLE elective_buckets
ADD CONSTRAINT elective_buckets_reference_check 
CHECK (
  (batch_id IS NOT NULL) OR 
  (college_id IS NOT NULL AND course IS NOT NULL AND semester IS NOT NULL)
);

-- Step 5: Add unique constraint for college-course-semester-bucket_name combination
ALTER TABLE elective_buckets
ADD CONSTRAINT unique_college_course_semester_bucket 
UNIQUE (college_id, course, semester, bucket_name);

-- Step 6: Add program/course column to subjects table if not exists
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS program VARCHAR(50);

-- Step 7: Create an index on subjects for course filtering
CREATE INDEX IF NOT EXISTS idx_subjects_program_semester 
ON subjects(college_id, program, semester) 
WHERE program IS NOT NULL;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

/*
This migration allows the elective_buckets table to work in two modes:

1. BATCH-BASED (Old Way):
   - batch_id is provided
   - Used for department-specific curriculum tied to batches

2. COLLEGE-BASED (New NEP Way):
   - college_id, course, and semester are provided
   - Used for college-wide curriculum management
   - Supports ITEP, B.Ed, M.Ed programs

USAGE EXAMPLE:

-- Insert a college-based elective bucket (NEP 2020)
INSERT INTO elective_buckets (college_id, course, semester, bucket_name, is_common_slot, min_selection, max_selection)
VALUES (
  'your-college-uuid',
  'ITEP',
  1,
  'Semester 1 Major Pool',
  true,
  1,
  1
);

-- Query buckets for a specific course and semester
SELECT * FROM elective_buckets
WHERE college_id = 'your-college-uuid'
  AND course = 'B.Ed'
  AND semester = 3;

-- Update subjects to add program information
UPDATE subjects 
SET program = 'ITEP'
WHERE code LIKE 'ITEP%' OR name LIKE '%ITEP%';

UPDATE subjects 
SET program = 'B.Ed'
WHERE code LIKE 'BED%' OR name LIKE '%B.Ed%';

UPDATE subjects 
SET program = 'M.Ed'
WHERE code LIKE 'MED%' OR name LIKE '%M.Ed%';

*/

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

/*
-- To rollback this migration:

DROP INDEX IF EXISTS idx_elective_buckets_college_course_semester;
DROP INDEX IF EXISTS idx_elective_buckets_batch;
DROP INDEX IF EXISTS idx_subjects_program_semester;

ALTER TABLE elective_buckets
DROP CONSTRAINT IF EXISTS elective_buckets_reference_check,
DROP CONSTRAINT IF EXISTS unique_college_course_semester_bucket,
DROP COLUMN IF EXISTS college_id,
DROP COLUMN IF EXISTS course,
DROP COLUMN IF EXISTS semester;

ALTER TABLE elective_buckets
ALTER COLUMN batch_id SET NOT NULL;

ALTER TABLE subjects
DROP COLUMN IF EXISTS program;
*/
