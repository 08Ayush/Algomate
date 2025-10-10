-- Fix Permissions for workflow_approvals Table
-- This script grants all necessary permissions to authenticated and anon users

-- Grant SELECT, INSERT, UPDATE, DELETE permissions on workflow_approvals
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE workflow_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE workflow_approvals TO anon;

-- Grant USAGE on the sequence if it exists
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Enable Row Level Security (RLS) policies if needed
ALTER TABLE workflow_approvals ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to insert workflow records
CREATE POLICY "Allow authenticated users to insert workflow records"
ON workflow_approvals
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow authenticated users to select their own workflow records
CREATE POLICY "Allow authenticated users to select workflow records"
ON workflow_approvals
FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow authenticated users to select workflow records
CREATE POLICY "Allow anon users to select workflow records"
ON workflow_approvals
FOR SELECT
TO anon
USING (true);

-- Create policy to allow anon users to insert workflow records
CREATE POLICY "Allow anon users to insert workflow records"
ON workflow_approvals
FOR INSERT
TO anon
WITH CHECK (true);

-- Verify permissions
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'workflow_approvals';

-- Verify policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'workflow_approvals';
