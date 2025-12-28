-- Migration: Restructure Batches to Follow Academic Year-Based System
-- Option 1: Track Current Semester in Batch

-- Add new columns to track batch cohort
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS admission_year INTEGER,
ADD COLUMN IF NOT EXISTS batch_year VARCHAR(20);

-- Update existing batches to follow new structure
-- This assumes batches were created for 2025-26 academic year

-- For existing batches, calculate admission year based on semester
-- Semester 1-2 = Year 1 (admitted 2025)
-- Semester 3-4 = Year 2 (admitted 2024)
-- Semester 5-6 = Year 3 (admitted 2023)
-- Semester 7-8 = Year 4 (admitted 2022)

UPDATE batches
SET 
  admission_year = CASE 
    WHEN semester IN (1, 2) THEN 2025
    WHEN semester IN (3, 4) THEN 2024
    WHEN semester IN (5, 6) THEN 2023
    WHEN semester IN (7, 8) THEN 2022
    ELSE 2025
  END,
  batch_year = CASE 
    WHEN semester IN (1, 2) THEN '2025'
    WHEN semester IN (3, 4) THEN '2024'
    WHEN semester IN (5, 6) THEN '2023'
    WHEN semester IN (7, 8) THEN '2022'
    ELSE '2025'
  END,
  name = CASE 
    WHEN departments.code IS NOT NULL THEN 
      departments.code || ' Batch ' || 
      CASE 
        WHEN semester IN (1, 2) THEN '2025'
        WHEN semester IN (3, 4) THEN '2024'
        WHEN semester IN (5, 6) THEN '2023'
        WHEN semester IN (7, 8) THEN '2022'
        ELSE '2025'
      END || ' - Sem ' || semester || ' (' || academic_year || ')'
    ELSE batches.name
  END
FROM departments
WHERE batches.department_id = departments.id;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_batches_admission_year ON batches(admission_year);
CREATE INDEX IF NOT EXISTS idx_batches_batch_year ON batches(batch_year);

-- Add comment to explain the new structure
COMMENT ON COLUMN batches.admission_year IS 'Year when students were admitted (e.g., 2025)';
COMMENT ON COLUMN batches.batch_year IS 'Batch cohort year (e.g., ''2025'' for Batch 2025)';
COMMENT ON COLUMN batches.semester IS 'Current semester the batch is studying (1-8)';
COMMENT ON COLUMN batches.academic_year IS 'Current academic year (e.g., ''2025-26'')';

-- Example of how batches should look after migration:
-- Name: "CSE Batch 2025 - Sem 1 (2025-26)"
-- admission_year: 2025
-- batch_year: "2025"
-- semester: 1 (will be updated to 2, then 3, 4, etc. as they progress)
-- academic_year: "2025-26" (will be updated to "2026-27", etc. as they progress)
