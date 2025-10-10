# Fix: Permission Denied for workflow_approvals

## Error
```
Failed to update workflow: permission denied for table workflow_approvals
```

## Root Cause
The database user (authenticated/anon roles) doesn't have INSERT permissions on the `workflow_approvals` table.

## Solution

### Option 1: Quick Fix (Workflow Table Only)
Run `FIX_WORKFLOW_PERMISSIONS.sql` in Supabase SQL Editor:
```bash
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Paste contents of FIX_WORKFLOW_PERMISSIONS.sql
4. Click "Run"
```

### Option 2: Complete Fix (All Tables)
Run `FIX_ALL_PERMISSIONS_COMPLETE.sql` for comprehensive permission fix:
```bash
1. Open Supabase Dashboard
2. Go to SQL Editor  
3. Paste contents of FIX_ALL_PERMISSIONS_COMPLETE.sql
4. Click "Run"
```

**Recommended: Use Option 2** to prevent future permission errors on other tables.

## What Gets Fixed

### ✅ Table Permissions
- `workflow_approvals` - Full CRUD access
- `audit_logs` - Full CRUD access
- `generated_timetables` - Full CRUD access
- `scheduled_classes` - Full CRUD access
- `notifications` - Full CRUD access
- All other tables - Full CRUD access

### ✅ RLS Policies
- Workflow approvals can be inserted by any authenticated/anon user
- Audit logs can be inserted by triggers
- Timetables can be managed by creators
- All policies allow necessary operations

### ✅ Sequence Permissions
- Auto-increment IDs work correctly
- UUID generation works

## Verification

After running the SQL script, test:

1. **Submit Timetable for Review**
   ```bash
   - Go to Timetables page
   - Click "Submit for Review" on a draft
   - Should succeed without errors
   ```

2. **Check Permissions in Database**
   ```sql
   SELECT table_name, grantee, privilege_type 
   FROM information_schema.role_table_grants 
   WHERE table_name = 'workflow_approvals';
   ```

   Should show:
   ```
   table_name          | grantee        | privilege_type
   --------------------|----------------|---------------
   workflow_approvals  | authenticated  | SELECT
   workflow_approvals  | authenticated  | INSERT
   workflow_approvals  | authenticated  | UPDATE
   workflow_approvals  | authenticated  | DELETE
   workflow_approvals  | anon          | SELECT
   workflow_approvals  | anon          | INSERT
   workflow_approvals  | anon          | UPDATE
   workflow_approvals  | anon          | DELETE
   ```

3. **Check RLS Policies**
   ```sql
   SELECT policyname, cmd 
   FROM pg_policies 
   WHERE tablename = 'workflow_approvals';
   ```

   Should show policies for INSERT, SELECT, UPDATE operations.

## Why This Happens

Supabase uses Row Level Security (RLS) by default. When you create a table, it:
1. ✅ Creates the table structure
2. ❌ Does NOT grant permissions automatically
3. ❌ Does NOT create RLS policies

You must manually:
1. Grant permissions (`GRANT INSERT, SELECT, UPDATE, DELETE`)
2. Enable RLS if needed (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
3. Create policies (`CREATE POLICY ...`)

## Files Created

1. **FIX_WORKFLOW_PERMISSIONS.sql** - Quick fix for workflow_approvals only
2. **FIX_ALL_PERMISSIONS_COMPLETE.sql** - Complete fix for all tables

## Common Permission Errors

| Error Message | Table | Fix |
|--------------|-------|-----|
| permission denied for table workflow_approvals | workflow_approvals | Run FIX_WORKFLOW_PERMISSIONS.sql |
| permission denied for table audit_logs | audit_logs | Run FIX_ALL_PERMISSIONS_COMPLETE.sql |
| permission denied for sequence | Any table | Grant USAGE on sequences |
| permission denied for schema public | public | Grant USAGE on schema |

## Prevention

To prevent future permission errors:

1. **Always Grant Permissions** when creating new tables:
   ```sql
   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE your_table 
   TO authenticated, anon;
   ```

2. **Set up RLS properly**:
   ```sql
   ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Allow all operations"
   ON your_table FOR ALL TO authenticated, anon
   USING (true) WITH CHECK (true);
   ```

3. **Test After Creating Tables**:
   - Try inserting a record from your app
   - Check permissions with verification queries
   - Fix immediately if errors occur

## Next Steps

1. ✅ Run `FIX_ALL_PERMISSIONS_COMPLETE.sql` in Supabase
2. ✅ Test "Submit for Review" button
3. ✅ Test "Approve" and "Reject" in Review Queue
4. ✅ Verify no more permission errors

---

**Date:** October 10, 2025  
**Priority:** HIGH - Blocks workflow functionality  
**Impact:** Submit, Approve, Reject operations fail without this fix
