# 🚀 MANUAL FIX INSTRUCTIONS - STEP BY STEP

Since automatic application isn't available, follow these steps to apply the fix manually:

---

## Step 1: Open Supabase Dashboard

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: **Academic Compass**
3. Click on **SQL Editor** in the left sidebar

---

## Step 2: Copy the SQL Fix

Open the file: **`database/fix-constraints-timetable-specific.sql`**

Or copy this complete SQL script:

```sql
-- ============================================================================
-- FIX: Make Scheduling Constraints Timetable-Specific
-- ============================================================================

BEGIN;

-- Step 1: Drop the global exclusion constraints
ALTER TABLE scheduled_classes DROP CONSTRAINT IF EXISTS no_batch_time_conflict;
ALTER TABLE scheduled_classes DROP CONSTRAINT IF EXISTS no_faculty_time_conflict;
ALTER TABLE scheduled_classes DROP CONSTRAINT IF EXISTS no_classroom_time_conflict;

-- Step 2: Add timetable-specific exclusion constraints
ALTER TABLE scheduled_classes
ADD CONSTRAINT no_batch_time_conflict_per_timetable
    EXCLUDE USING gist (timetable_id WITH =, batch_id WITH =, time_slot_id WITH =);

ALTER TABLE scheduled_classes
ADD CONSTRAINT no_faculty_time_conflict_per_timetable
    EXCLUDE USING gist (timetable_id WITH =, faculty_id WITH =, time_slot_id WITH =);

ALTER TABLE scheduled_classes
ADD CONSTRAINT no_classroom_time_conflict_per_timetable
    EXCLUDE USING gist (timetable_id WITH =, classroom_id WITH =, time_slot_id WITH =);

-- Step 3: Add performance index
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_timetable_conflicts 
ON scheduled_classes(timetable_id, time_slot_id, batch_id, faculty_id, classroom_id);

COMMIT;

-- Verification: Check that constraints were updated
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'scheduled_classes'::regclass
    AND conname LIKE '%conflict%'
ORDER BY conname;
```

---

## Step 3: Run the SQL

1. **Paste** the SQL script into the Supabase SQL Editor
2. Click **"RUN"** (or press Ctrl+Enter)
3. Wait for completion (should take 2-5 seconds)

---

## Step 4: Verify Success

You should see output showing:
```
✅ no_batch_time_conflict_per_timetable
✅ no_faculty_time_conflict_per_timetable  
✅ no_classroom_time_conflict_per_timetable
```

All should include `timetable_id` in their definition.

---

## Step 5: Restart Dev Server

Back in your terminal:

```powershell
# Stop the server (if running)
Ctrl+C

# Restart
npm run dev
```

---

## Step 6: Test

1. Navigate to **Hybrid Scheduler**
2. **Generate timetable for Semester 3** → Click "View Timetable" → Should save ✅
3. **Generate timetable for Semester 5** → Click "View Timetable" → Should save ✅
4. **Generate timetable for Semester 7** → Click "View Timetable" → Should save ✅

All should work now! 🎉

---

## Troubleshooting

### ❌ "Constraint already exists"
- **Solution**: Ignore this - it means part of the fix was already applied

### ❌ "Permission denied"
- **Solution**: Make sure you're logged in as the database owner/admin in Supabase

### ❌ Still getting save conflicts
- **Solution**: 
  1. Verify constraints were applied (run verification query)
  2. Clear old drafts:
     ```sql
     DELETE FROM scheduled_classes WHERE timetable_id IN (
         SELECT id FROM generated_timetables WHERE status = 'draft'
     );
     DELETE FROM generated_timetables WHERE status = 'draft';
     ```
  3. Restart dev server
  4. Try again

---

## Need Help?

Run this to check your database status:
```powershell
node check-constraints.js
```

This will show you:
- Current timetables
- Existing conflicts
- Constraint status
- Recommendations
