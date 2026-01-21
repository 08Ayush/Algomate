# 🎯 COMPLETE DATABASE SETUP - Step by Step

## Current Status
✅ You've already updated the constraints (timetable-specific)
❌ You haven't inserted the constraint rules yet

## What You Need to Do

### Step 1: Insert Constraint Rules (2 minutes)

**Option A - Using the Clean SQL File (Recommended):**

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open file: `database/insert-constraint-rules.sql`
3. Copy ALL contents
4. Paste in SQL Editor
5. Click **RUN**

**Option B - Using the Full Fix File:**

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open file: `database/fix-constraints-timetable-specific.sql`
3. Copy **ONLY** from line 49 onwards (starting with `INSERT INTO constraint_rules...`)
4. Paste in SQL Editor
5. Click **RUN**

### Step 2: Verify Rules Were Inserted

After running the SQL, you should see output like:

```
✅ 12 rules inserted
- 6 HARD constraints
- 6 SOFT constraints
```

### Step 3: Restart Dev Server

```powershell
# Stop current server
Ctrl+C

# Restart
npm run dev
```

### Step 4: Test Timetable Generation

1. Navigate to **Hybrid Scheduler**
2. Generate timetable for **Semester 7**
3. Click **"View Timetable"**
4. Check that:
   - ✅ All 36 slots are filled
   - ✅ Labs are in continuous 2-hour blocks
   - ✅ No continuous theory by same faculty

## What the Constraint Rules Do

### HARD Constraints (Must be satisfied):
1. ✅ `no_batch_overlap_per_timetable` - Batch can't attend 2 classes at once
2. ✅ `no_faculty_overlap_per_timetable` - Faculty can't teach 2 classes at once
3. ✅ `no_classroom_overlap_per_timetable` - Classroom can't host 2 classes at once
4. ✅ `no_continuous_theory_same_faculty` - **NEW** - No back-to-back theory by same faculty
5. ✅ `lab_requires_continuous_slots` - **NEW** - Labs must be 2 continuous hours
6. ✅ `minimum_subject_hours` - Each subject meets credit requirements

### SOFT Constraints (Preferences):
7. ✅ `distribute_subjects_evenly` - Spread subjects across week
8. ✅ `faculty_preferred_time_slots` - Respect faculty preferences
9. ✅ `avoid_first_last_slot_labs` - Don't schedule labs at extremes
10. ✅ `lunch_break_consideration` - Respect lunch breaks
11. ✅ `faculty_cross_timetable_preference` - Minimize cross-timetable faculty conflicts
12. ✅ `classroom_cross_timetable_preference` - Minimize cross-timetable classroom conflicts

## Verification Checklist

After Step 1, verify in Supabase:

```sql
-- Check constraint rules exist
SELECT COUNT(*) as total_rules 
FROM constraint_rules;
-- Should return: 12

-- Check hard constraints
SELECT COUNT(*) as hard_constraints 
FROM constraint_rules 
WHERE rule_type = 'HARD';
-- Should return: 6

-- Check soft constraints
SELECT COUNT(*) as soft_constraints 
FROM constraint_rules 
WHERE rule_type = 'SOFT';
-- Should return: 6
```

## Troubleshooting

### Error: "relation constraint_rules does not exist"
**Cause**: Your database doesn't have the constraint_rules table yet.
**Solution**: You need to run the full schema first (`database/new_schema.sql`)

### Error: "duplicate key value violates unique constraint"
**Cause**: Rules already exist in the table.
**Solution**: This is OK! The SQL uses `ON CONFLICT DO UPDATE`, so it will update existing rules.

### No error, but can't see rules
**Cause**: Wrong database/schema selected.
**Solution**: Make sure you're connected to the correct Supabase project.

## Quick Verification Commands

```powershell
# Check database constraints
node check-constraints.js

# Or check directly in Supabase SQL Editor:
SELECT * FROM constraint_rules;
```

## Files You Need

1. **To Insert Rules**: `database/insert-constraint-rules.sql` (clean, focused)
2. **Complete Fix**: `database/fix-constraints-timetable-specific.sql` (includes everything)
3. **Schema**: `database/new_schema.sql` (if you need to recreate tables)

---

**Ready?** Start with **Step 1** - insert the constraint rules! 🚀

After that, you'll have:
- ✅ Timetable-specific constraints (already done)
- ✅ Constraint rules in database (Step 1)
- ✅ Improved generation algorithm (already in code)
- ✅ Complete 36-slot timetables (after Step 3)
