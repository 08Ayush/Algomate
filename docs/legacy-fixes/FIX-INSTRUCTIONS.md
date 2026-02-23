# QUICK START: Fix Timetable Conflicts

## The Problem
✅ Semester 7 timetable generation: **WORKS**  
❌ Semester 3 timetable generation: **FAILS**  
❌ Semester 5 timetable generation: **FAILS**

**Root Cause**: Database constraints were **global** (across all timetables) instead of **per-timetable**

## The Solution
Change constraints from:
- ❌ "No faculty can teach at 10:00 AM across **ANY** timetable"
- ✅ "No faculty can teach at 10:00 AM **twice in the SAME** timetable"

## How to Fix (3 Steps)

### Step 1: Apply Database Changes

**Option A - Automatic** (Recommended):
```bash
node apply-constraint-fix.js
```

**Option B - Manual** (If automatic fails):
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy contents of: `database/fix-constraints-timetable-specific.sql`
3. Paste and click **RUN**

**Option C - Quick Batch** (Windows):
```bash
apply-fix.bat
```

### Step 2: Restart Development Server
```bash
# In terminal running dev server:
Ctrl+C

# Restart:
npm run dev
```

### Step 3: Test
1. Generate timetable for **Semester 7** → Click "View Timetable" ✅
2. Generate timetable for **Semester 5** → Click "View Timetable" ✅
3. Generate timetable for **Semester 3** → Click "View Timetable" ✅

All should succeed and save independently!

## What Changed

### Database
- **Dropped**: 3 global constraints
- **Added**: 3 timetable-specific constraints
- **Created**: Constraint rules in `constraint_rules` table
- **Added**: Helper functions for cross-timetable conflict checking

### Code
- **Removed**: Draft cleanup logic (no longer needed)
- **Simplified**: Save route constraint handling
- **Updated**: Logging to reflect new approach

## Verification

After applying, check in Supabase SQL Editor:

```sql
-- Should show 3 constraints with "timetable_id" in definition
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint
WHERE conrelid = 'scheduled_classes'::regclass
  AND conname LIKE '%per_timetable%';
```

Expected result:
```
no_batch_time_conflict_per_timetable
no_faculty_time_conflict_per_timetable  
no_classroom_time_conflict_per_timetable
```

## Files to Reference

📄 **database/fix-constraints-timetable-specific.sql** - The SQL fix  
📄 **database/README-constraint-fix.md** - Detailed documentation  
📄 **apply-constraint-fix.js** - Automatic application script  
📄 **apply-fix.bat** - Windows batch helper  

## Troubleshooting

**Still getting conflicts?**
1. Verify constraints applied (query above)
2. Restart dev server completely
3. Check terminal logs during save
4. Delete old drafts: `DELETE FROM generated_timetables WHERE status = 'draft'`

**"exec_sql function not found"?**
- Use Manual Option (Step 1, Option B)

**Want to start fresh?**
```sql
-- Clear all drafts
DELETE FROM scheduled_classes WHERE timetable_id IN (
    SELECT id FROM generated_timetables WHERE status = 'draft'
);
DELETE FROM generated_timetables WHERE status = 'draft';
```

## What You Can Do Now

✅ Generate multiple timetables simultaneously  
✅ Create drafts for different semesters  
✅ Same faculty/classroom in different timetables  
✅ Iterate on timetables without conflicts  
✅ True multi-semester support  

---

**Ready?** Run: `node apply-constraint-fix.js` or `apply-fix.bat`
