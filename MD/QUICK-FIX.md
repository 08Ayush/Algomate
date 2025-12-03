# 🎯 QUICK FIX - 5 MINUTES

## The Problem
- ✅ Semester 7 works
- ❌ Semester 3 fails  
- ❌ Semester 5 fails

## The Solution (3 Easy Steps)

### 📋 Step 1: Copy the SQL

**Open this file in VS Code:**
```
database/quick-fix.sql
```

**Or copy from here:**
```sql
BEGIN;

ALTER TABLE scheduled_classes DROP CONSTRAINT IF EXISTS no_batch_time_conflict;
ALTER TABLE scheduled_classes DROP CONSTRAINT IF EXISTS no_faculty_time_conflict;
ALTER TABLE scheduled_classes DROP CONSTRAINT IF EXISTS no_classroom_time_conflict;

ALTER TABLE scheduled_classes
ADD CONSTRAINT no_batch_time_conflict_per_timetable
    EXCLUDE USING gist (timetable_id WITH =, batch_id WITH =, time_slot_id WITH =);

ALTER TABLE scheduled_classes
ADD CONSTRAINT no_faculty_time_conflict_per_timetable
    EXCLUDE USING gist (timetable_id WITH =, faculty_id WITH =, time_slot_id WITH =);

ALTER TABLE scheduled_classes
ADD CONSTRAINT no_classroom_time_conflict_per_timetable
    EXCLUDE USING gist (timetable_id WITH =, classroom_id WITH =, time_slot_id WITH =);

CREATE INDEX IF NOT EXISTS idx_scheduled_classes_timetable_conflicts 
ON scheduled_classes(timetable_id, time_slot_id, batch_id, faculty_id, classroom_id);

COMMIT;
```

### 🌐 Step 2: Run in Supabase

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click: **SQL Editor** (left sidebar)
4. Click: **New Query**
5. **Paste** the SQL from Step 1
6. Click: **RUN** (or press Ctrl+Enter)

### ✅ Step 3: Restart & Test

```powershell
# In your terminal (press Ctrl+C first if server is running)
npm run dev
```

Then test:
1. Generate Semester 3 → Save ✅
2. Generate Semester 5 → Save ✅  
3. Generate Semester 7 → Save ✅

## Done! 🎉

All semesters should now work independently!

---

## Still Having Issues?

### Quick Cleanup (if needed):
Run this in Supabase SQL Editor to clear old drafts:

```sql
DELETE FROM scheduled_classes WHERE timetable_id IN (
    SELECT id FROM generated_timetables WHERE status = 'draft'
);
DELETE FROM generated_timetables WHERE status = 'draft';
```

Then try generating timetables again.

---

## What Changed?

**Before:** Global constraints
- "No faculty at 10 AM across ANY timetable" ❌

**After:** Per-timetable constraints  
- "No faculty at 10 AM twice in SAME timetable" ✅
- Multiple timetables can coexist independently ✅
