-- Migration to add CGPA column to users table
-- Run this in your Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cgpa NUMERIC(4,2) CHECK (cgpa >= 0.00 AND cgpa <= 10.00);

-- Optional: Ensure only students have CGPA
ALTER TABLE users
ADD CONSTRAINT check_cgpa_student_only 
CHECK (
    (role = 'student') OR (cgpa IS NULL)
);

-- Comment to explain the column
COMMENT ON COLUMN users.cgpa IS 'Cumulative Grade Point Average (0.00 to 10.00) for students';
