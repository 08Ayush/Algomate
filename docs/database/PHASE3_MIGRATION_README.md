# Phase 3 Database Migration Guide

## 🚨 Important: Two-Step Migration Required

Due to PostgreSQL enum type limitations, this migration **must** be run in two separate steps.

---

## ✅ Option 1: Use Split Files (Recommended)

### Step 1: Run Enum Migration
In Supabase SQL Editor:
```sql
-- Copy and paste the entire contents of phase3_step1_enum.sql
```
Click "Run" and wait for confirmation: `Success. No rows returned`

### Step 2: Run Schema Migration
In Supabase SQL Editor:
```sql
-- Copy and paste the entire contents of phase3_step2_schema.sql
```
Click "Run" and wait for confirmation: `Success. No rows returned`

---

## ✅ Option 2: Manual Two-Step Execution

### Step 1: Add Enum Values
```sql
-- Add TEACHING_PRACTICE enum value
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TEACHING_PRACTICE' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'nep_category')
    ) THEN
        EXECUTE 'ALTER TYPE nep_category ADD VALUE ''TEACHING_PRACTICE''';
    END IF;
END $$;

-- Add DISSERTATION enum value
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'DISSERTATION' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'nep_category')
    ) THEN
        EXECUTE 'ALTER TYPE nep_category ADD VALUE ''DISSERTATION''';
    END IF;
END $$;
```
**Run this first and wait for completion.**

### Step 2: Add Columns and Objects
After Step 1 completes, run the rest of `phase3_schema_migration.sql` (everything after the BEGIN statement).

---

## 🧪 Verify Migration

After both steps complete, verify the migration:

```sql
-- Check new enum values exist
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'nep_category')
ORDER BY enumlabel;

-- Should include: TEACHING_PRACTICE, DISSERTATION

-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subjects' 
AND column_name IN ('block_start_week', 'block_end_week', 'time_restriction', 'is_special_event', 'special_event_notes');

-- Should return 5 rows

-- Check view exists
SELECT * FROM special_events LIMIT 1;

-- Should return empty result or existing special events
```

---

## 🎯 What Gets Created

### New Enum Values
- `TEACHING_PRACTICE` - For B.Ed teaching practice sessions
- `DISSERTATION` - For M.Ed/research dissertation work

### New Columns on `subjects`
- `block_start_week` (INTEGER) - Week number when internship starts
- `block_end_week` (INTEGER) - Week number when internship ends
- `time_restriction` (VARCHAR) - 'MORNING', 'AFTERNOON', 'EVENING', 'FULL_DAY', or NULL
- `is_special_event` (BOOLEAN) - Auto-set to TRUE for special categories
- `special_event_notes` (TEXT) - Additional notes about the event

### New Database Objects
- **View**: `special_events` - Easy access to internships, teaching practice, dissertations
- **Function**: `update_special_event_flag()` - Auto-marks special events
- **Trigger**: `set_special_event_flag` - Calls function on insert/update
- **Indexes**: Optimized queries for special events and block weeks

---

## ❌ Troubleshooting

### Error: "unsafe use of new value"
**Cause**: Tried to use enum value in same transaction as it was created  
**Solution**: Run Step 1 first, wait for completion, then run Step 2

### Error: "enum value already exists"
**Cause**: Enum value was already added in previous attempt  
**Solution**: Skip Step 1, only run Step 2

### Error: "column already exists"
**Cause**: Migration was partially run before  
**Solution**: Script uses `IF NOT EXISTS`, safe to re-run

---

## 📝 Files

- `phase3_step1_enum.sql` - Step 1: Add enum values
- `phase3_step2_schema.sql` - Step 2: Add columns, views, triggers
- `phase3_schema_migration.sql` - Combined file (requires manual two-step execution)

---

## ✅ Success Indicators

After successful migration, you should see:
- ✅ No errors in SQL Editor
- ✅ New enum values in `pg_enum` table
- ✅ 5 new columns in `subjects` table
- ✅ `special_events` view created
- ✅ Trigger and function created
- ✅ 2 new indexes created

---

*Last Updated: November 28, 2025*
