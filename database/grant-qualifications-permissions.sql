-- ================================================================
-- GRANT PERMISSIONS FOR FACULTY_QUALIFIED_SUBJECTS TABLE
-- ================================================================
-- This script grants necessary permissions for the qualifications feature
-- Run this in Supabase SQL Editor
-- ================================================================

-- Grant SELECT permission (read qualifications)
GRANT SELECT ON faculty_qualified_subjects TO anon, authenticated;

-- Grant INSERT permission (add new qualifications)
GRANT INSERT ON faculty_qualified_subjects TO authenticated;

-- Grant UPDATE permission (modify qualifications)
GRANT UPDATE ON faculty_qualified_subjects TO authenticated;

-- Grant DELETE permission (remove qualifications)
GRANT DELETE ON faculty_qualified_subjects TO authenticated;

-- Grant usage on the ID sequence (required for INSERT to work)
GRANT USAGE, SELECT ON SEQUENCE faculty_qualified_subjects_id_seq TO authenticated;

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================
-- These policies ensure users can only manage qualifications in their department

-- Enable RLS on the table
ALTER TABLE faculty_qualified_subjects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to view qualifications from their department
CREATE POLICY "Users can view qualifications from their department"
ON faculty_qualified_subjects
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'faculty'
    AND (
      users.department_id = (
        SELECT department_id FROM users WHERE users.id = faculty_qualified_subjects.faculty_id
      )
      OR
      users.department_id = (
        SELECT department_id FROM subjects WHERE subjects.id = faculty_qualified_subjects.subject_id
      )
    )
  )
);

-- Policy: Allow faculty creators to insert qualifications in their department
CREATE POLICY "Faculty creators can add qualifications in their department"
ON faculty_qualified_subjects
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'faculty'
    AND users.faculty_type IN ('creator', 'publisher')
    AND (
      -- Faculty must be from same department
      users.department_id = (
        SELECT department_id FROM users WHERE users.id = faculty_qualified_subjects.faculty_id
      )
      AND
      -- Subject must be from same department
      users.department_id = (
        SELECT department_id FROM subjects WHERE subjects.id = faculty_qualified_subjects.subject_id
      )
    )
  )
);

-- Policy: Allow faculty creators to update qualifications in their department
CREATE POLICY "Faculty creators can update qualifications in their department"
ON faculty_qualified_subjects
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'faculty'
    AND users.faculty_type IN ('creator', 'publisher')
    AND users.department_id = (
      SELECT department_id FROM users WHERE users.id = faculty_qualified_subjects.faculty_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'faculty'
    AND users.faculty_type IN ('creator', 'publisher')
    AND users.department_id = (
      SELECT department_id FROM users WHERE users.id = faculty_qualified_subjects.faculty_id
    )
  )
);

-- Policy: Allow faculty creators to delete qualifications in their department
CREATE POLICY "Faculty creators can delete qualifications in their department"
ON faculty_qualified_subjects
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'faculty'
    AND users.faculty_type IN ('creator', 'publisher')
    AND users.department_id = (
      SELECT department_id FROM users WHERE users.id = faculty_qualified_subjects.faculty_id
    )
  )
);

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================
-- Run these to verify permissions are set correctly

-- Check table permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'faculty_qualified_subjects';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'faculty_qualified_subjects';

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'faculty_qualified_subjects';

-- ================================================================
-- CLEANUP (if you need to rerun this script)
-- ================================================================
-- Uncomment these lines only if you need to remove old policies and reapply

-- DROP POLICY IF EXISTS "Users can view qualifications from their department" ON faculty_qualified_subjects;
-- DROP POLICY IF EXISTS "Faculty creators can add qualifications in their department" ON faculty_qualified_subjects;
-- DROP POLICY IF EXISTS "Faculty creators can update qualifications in their department" ON faculty_qualified_subjects;
-- DROP POLICY IF EXISTS "Faculty creators can delete qualifications in their department" ON faculty_qualified_subjects;
