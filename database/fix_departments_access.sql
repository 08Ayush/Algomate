-- FIX: Enable departments table access for registration form
-- Run this in your Supabase SQL Editor

-- Option 1: Disable RLS on departments table (allows public read access)
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;

-- OR Option 2: Enable RLS with a policy for public read access
-- ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public read access to active departments" ON departments
--     FOR SELECT USING (is_active = true);

-- Verify the fix by checking if data is accessible
SELECT id, name, code, description FROM departments WHERE is_active = true ORDER BY name;