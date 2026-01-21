# 🚨 QUICK FIX: Workflow Permission Error

## Problem
```
❌ Failed to update workflow: permission denied for table workflow_approvals
```

## Solution (5 Steps - 2 Minutes)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com
2. Login to your project
3. Select project: `hwfdzrqfesebmuzgqmpe`

### Step 2: Open SQL Editor
1. Click "SQL Editor" in left sidebar
2. Click "New Query"

### Step 3: Copy & Paste This SQL
```sql
-- Grant permissions on workflow_approvals
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE workflow_approvals TO authenticated, anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- Enable RLS
ALTER TABLE workflow_approvals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all workflow operations" ON workflow_approvals FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Also fix audit_logs (common issue)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE audit_logs TO authenticated, anon;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all audit operations" ON audit_logs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
```

### Step 4: Run the Query
Click the green "Run" button (or press Ctrl+Enter)

### Step 5: Test It
1. Go back to your app
2. Click "Submit for Review" on a timetable
3. Should work now! ✅

---

## If You Want to Fix ALL Tables (Recommended)

Instead of the above SQL, paste the entire contents of:
**`FIX_ALL_PERMISSIONS_COMPLETE.sql`**

This prevents future permission errors on ANY table.

---

## Expected Result

After running the SQL:
- ✅ Submit for Review works
- ✅ Approve works
- ✅ Reject works
- ✅ No more permission errors

## Still Getting Errors?

Check if policies were created:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'workflow_approvals';
```

Should show: `"Allow all workflow operations"`

---

**Quick Checklist:**
- [ ] Opened Supabase SQL Editor
- [ ] Pasted the SQL code
- [ ] Clicked Run
- [ ] Tested Submit for Review button
- [ ] Works! 🎉
