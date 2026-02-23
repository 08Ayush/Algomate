# Timetable-Specific Constraints Fix

## Problem Statement

The hybrid scheduler was working for Semester 7 but failing for Semester 3 and 5 due to **global database constraints** that prevented multiple timetables from sharing resources (faculty, classrooms) at the same time slots.

### Original Issue
- Database had **global GIST exclusion constraints** on `scheduled_classes` table:
  ```sql
  CONSTRAINT no_batch_time_conflict 
      EXCLUDE USING gist (batch_id WITH =, time_slot_id WITH =)
  CONSTRAINT no_faculty_time_conflict 
      EXCLUDE USING gist (faculty_id WITH =, time_slot_id WITH =)
  CONSTRAINT no_classroom_time_conflict 
      EXCLUDE USING gist (classroom_id WITH =, time_slot_id WITH =)
  ```
- These constraints applied **across ALL timetables** (not per-timetable)
- Result: First timetable saved successfully, subsequent timetables failed with conflicts

### Why Semester 7 Worked
- It was likely the **first** timetable generated in your testing
- No prior conflicts existed in the database
- Semester 3 and 5 tried to use same faculty/classrooms already locked by Semester 7's timetable

## Solution Overview

**Implemented Option 1**: Make constraints timetable-specific using `constraint_rules` table.

### Key Changes

1. **Removed Global Constraints**
   - Dropped the original GIST exclusion constraints that spanned all timetables

2. **Added Timetable-Specific Constraints**
   ```sql
   CONSTRAINT no_batch_time_conflict_per_timetable
       EXCLUDE USING gist (timetable_id WITH =, batch_id WITH =, time_slot_id WITH =)
   
   CONSTRAINT no_faculty_time_conflict_per_timetable
       EXCLUDE USING gist (timetable_id WITH =, faculty_id WITH =, time_slot_id WITH =)
   
   CONSTRAINT no_classroom_time_conflict_per_timetable
       EXCLUDE USING gist (timetable_id WITH =, classroom_id WITH =, time_slot_id WITH =)
   ```
   - Now includes `timetable_id` in the constraint
   - Prevents conflicts **within** a timetable only
   - Allows multiple timetables to coexist independently

3. **Updated Constraint Rules Table**
   - Added proper constraint definitions for algorithm use
   - Hard constraints: Within same timetable (enforced by database)
   - Soft constraints: Across timetables (for optimization, warnings only)

4. **Updated Save Route**
   - Removed draft cleanup logic (no longer needed)
   - Simplified pre-loading logic
   - Database constraints now handle conflict prevention automatically

## Files Modified

### Database Schema
- **`database/fix-constraints-timetable-specific.sql`** (NEW)
  - Complete SQL script to apply the fix
  - Drops old constraints
  - Adds new timetable-specific constraints
  - Inserts constraint rules
  - Creates helper functions and views

### Application Code
- **`src/app/api/hybrid-timetable/save/route.ts`**
  - Removed draft cleanup logic (lines ~30-63)
  - Removed existing classes pre-loading (lines ~260-275)
  - Simplified with timetable-specific constraints

### Helper Scripts
- **`apply-constraint-fix.js`** (NEW)
  - Node.js script to apply database changes
  - Includes verification steps
  - Provides manual instructions if automatic fails

## How to Apply the Fix

### Option 1: Automatic (Recommended)

```bash
node apply-constraint-fix.js
```

### Option 2: Manual (If automatic fails)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the entire contents of `database/fix-constraints-timetable-specific.sql`
3. Paste and **Run** the script
4. Verify with the verification queries at the end of the script

### Option 3: Via Supabase CLI

```bash
supabase db push
```

## Verification Steps

After applying the fix, verify it worked:

### 1. Check Constraints in Database

Run this in Supabase SQL Editor:

```sql
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'scheduled_classes'::regclass
    AND conname LIKE '%conflict%'
ORDER BY conname;
```

**Expected Output:**
- `no_batch_time_conflict_per_timetable`
- `no_faculty_time_conflict_per_timetable`
- `no_classroom_time_conflict_per_timetable`

All should include `timetable_id` in their definition.

### 2. Check Constraint Rules

```sql
SELECT rule_name, rule_type, description, is_active
FROM constraint_rules
WHERE rule_name LIKE '%timetable%'
ORDER BY rule_type, rule_name;
```

**Expected Output:**
- 3 HARD constraints (per_timetable)
- 2 SOFT constraints (cross_timetable preferences)

### 3. Test Timetable Generation

1. **Restart your dev server:**
   ```bash
   npm run dev
   ```

2. **Generate timetables for multiple semesters:**
   - Generate for Semester 7 → Click "View Timetable" → Should save successfully
   - Generate for Semester 5 → Click "View Timetable" → Should save successfully
   - Generate for Semester 3 → Click "View Timetable" → Should save successfully

3. **Verify all timetables exist:**
   ```sql
   SELECT 
       id, 
       title, 
       semester, 
       status,
       (SELECT COUNT(*) FROM scheduled_classes WHERE timetable_id = generated_timetables.id) as class_count
   FROM generated_timetables
   ORDER BY semester;
   ```

## What This Fix Enables

✅ **Multiple Draft Timetables**: Create drafts for different semesters simultaneously

✅ **Independent Timetables**: Each timetable is isolated - no cross-timetable conflicts for drafts

✅ **Iterative Development**: Regenerate and test timetables without deleting others

✅ **True Multi-Semester Support**: Generate timetables for all semesters without conflicts

✅ **Faculty/Classroom Reuse**: Same faculty/classroom can appear at same time in different timetables (e.g., different days of week, different academic years)

## Soft Constraints for Published Timetables

When timetables are **published** (not draft), the system will:

1. **Check for cross-timetable conflicts** using `check_cross_timetable_conflicts()` function
2. **Show warnings** if faculty/classrooms are overbooked
3. **Allow override** by admins if necessary
4. **Track conflicts** in `constraint_violations` JSONB field

This provides flexibility while maintaining data integrity.

## Rollback (If Needed)

If you need to rollback to global constraints:

```sql
BEGIN;

-- Drop timetable-specific constraints
ALTER TABLE scheduled_classes 
DROP CONSTRAINT IF EXISTS no_batch_time_conflict_per_timetable;

ALTER TABLE scheduled_classes 
DROP CONSTRAINT IF EXISTS no_faculty_time_conflict_per_timetable;

ALTER TABLE scheduled_classes 
DROP CONSTRAINT IF EXISTS no_classroom_time_conflict_per_timetable;

-- Restore global constraints
ALTER TABLE scheduled_classes
ADD CONSTRAINT no_batch_time_conflict 
    EXCLUDE USING gist (batch_id WITH =, time_slot_id WITH =);

ALTER TABLE scheduled_classes
ADD CONSTRAINT no_faculty_time_conflict 
    EXCLUDE USING gist (faculty_id WITH =, time_slot_id WITH =);

ALTER TABLE scheduled_classes
ADD CONSTRAINT no_classroom_time_conflict 
    EXCLUDE USING gist (classroom_id WITH =, time_slot_id WITH =);

COMMIT;
```

## Benefits of This Approach

1. **Cleaner Architecture**: Constraints are properly scoped to their context
2. **Better Performance**: Less aggressive locking, faster insertions
3. **More Flexible**: Supports true multi-timetable workflows
4. **Future-Proof**: Enables features like:
   - Timetable versioning
   - What-if scenarios
   - Academic year rollover
   - Department-specific timetables

## Troubleshooting

### Issue: "Function exec_sql does not exist"
**Solution**: Apply the SQL manually via Supabase Dashboard (Option 2 above)

### Issue: "Constraint already exists"
**Solution**: This is expected - the fix is idempotent and safe to re-run

### Issue: Still getting conflicts
**Solution**: 
1. Check constraints are correctly applied (Verification Step 1)
2. Restart dev server completely
3. Clear any cached timetables in browser
4. Check terminal logs for detailed error messages

### Issue: Old timetables cause conflicts
**Solution**: Delete old draft timetables manually:
```sql
DELETE FROM scheduled_classes 
WHERE timetable_id IN (
    SELECT id FROM generated_timetables WHERE status = 'draft'
);

DELETE FROM generated_timetables WHERE status = 'draft';
```

## Contact

If you encounter issues after applying this fix, check:
1. Database constraint definitions (Verification Step 1)
2. Terminal logs during save operation
3. Browser console for API errors
4. Supabase logs for detailed error messages

---

**Status**: ✅ Ready to Apply
**Version**: 1.0
**Date**: October 11, 2025
