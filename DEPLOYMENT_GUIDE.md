# Database Schema Deployment Guide

## Issue: Department Dropdown Empty

The registration form is not showing departments because:
1. The new schema hasn't been deployed to Supabase yet
2. The database is giving "permission denied for schema public" errors
3. No departments exist in the current database

## Solution: Deploy the New Schema

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: https://hwfdzrqfesebmuzgqmpe.supabase.co
3. Navigate to the SQL Editor

### Step 2: Deploy the Schema
1. Open the SQL Editor in Supabase Dashboard
2. Copy the entire content from `database/new_schema.sql`
3. Run the SQL script to create all tables and sample data

### Step 3: Verify Deployment
After running the schema, you should have:
- All required tables created
- Sample departments populated
- Proper permissions set

### Step 4: Test the Application
1. Restart the development server: `npm run dev`
2. Visit http://localhost:3000/register
3. The department dropdown should now show departments

## Alternative: Quick Fix with Sample Departments

If you can't access the Supabase dashboard right now, you can:

1. Visit: http://localhost:3000/api/departments
2. Use POST method to create sample departments
3. Then test the registration form

## Current Schema Status
- ✅ Schema file exists: `database/new_schema.sql` (879 lines)
- ❌ Not deployed to Supabase database yet
- ❌ No departments in database
- ❌ Permission issues with current database

## Next Steps
Deploy the new schema to fix the department loading issue.