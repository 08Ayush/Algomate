-- Migration: Add assigned_lab_id to batch_subjects table
-- This allows faculty assignments to also include lab room assignments for practical/lab subjects

-- Add the assigned_lab_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'batch_subjects' 
        AND column_name = 'assigned_lab_id'
    ) THEN
        ALTER TABLE batch_subjects 
        ADD COLUMN assigned_lab_id UUID REFERENCES classrooms(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Column assigned_lab_id added to batch_subjects table';
    ELSE
        RAISE NOTICE 'Column assigned_lab_id already exists in batch_subjects table';
    END IF;
END $$;

-- Add index for faster lab assignment lookups
CREATE INDEX IF NOT EXISTS idx_batch_subjects_assigned_lab 
ON batch_subjects(assigned_lab_id) 
WHERE assigned_lab_id IS NOT NULL;

-- Comment explaining the column
COMMENT ON COLUMN batch_subjects.assigned_lab_id IS 'The lab/classroom assigned for practical/lab subjects';
