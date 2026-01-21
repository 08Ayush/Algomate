# Final Fix: Lab Continuation Display

## 🎯 Root Cause Identified

The issue was that **lab continuation slots were being saved to the database**, but the **view page couldn't identify them** because:

1. ❌ `scheduled_classes` table was missing `is_continuation`, `is_lab`, and `session_number` columns
2. ❌ View page was checking `notes` field (which wasn't being set properly)
3. ❌ Save endpoint wasn't saving the continuation flags

---

## ✅ Complete Solution Applied

### Fix 1: Add Database Columns

Created migration: `database/add-continuation-columns.sql`

**Columns Added:**
- `is_continuation` (BOOLEAN) - Marks if this is a continuation slot
- `is_lab` (BOOLEAN) - Marks if this is a lab/practical
- `session_number` (INT) - Tracks which session of a multi-session subject

### Fix 2: Update Save Endpoint

**File**: `src/app/api/hybrid-timetable/save/route.ts`

**Changes:**
- Now saves `is_continuation`, `is_lab`, `session_number` fields
- Sets proper notes based on continuation status
- Keeps continuation entries (doesn't filter them out)

### Fix 3: Update View Page

**File**: `src/app/faculty/timetables/view/[id]/page.tsx`

**Changes:**
- Selects the new columns from database
- Uses `is_continuation` flag to identify continuation slots
- Uses `is_lab` flag to identify lab classes
- Shows "2hr" badge for main lab entry
- Shows "↓" badge for continuation entry

---

## 🚀 How to Apply

### Step 1: Add Database Columns (REQUIRED)

Open **Supabase SQL Editor** and run:

```sql
-- Add is_continuation column
ALTER TABLE scheduled_classes 
ADD COLUMN IF NOT EXISTS is_continuation BOOLEAN DEFAULT FALSE;

-- Add is_lab column
ALTER TABLE scheduled_classes 
ADD COLUMN IF NOT EXISTS is_lab BOOLEAN DEFAULT FALSE;

-- Add session_number column
ALTER TABLE scheduled_classes 
ADD COLUMN IF NOT EXISTS session_number INT DEFAULT 1;
```

**Or use the migration file:**
- Open: `database/add-continuation-columns.sql`
- Copy entire contents
- Paste in Supabase SQL Editor
- Click **RUN**

✅ You should see: "Added is_continuation, is_lab, and session_number columns"

---

### Step 2: Restart Dev Server

```powershell
# Stop server (Ctrl+C)
npm run dev
```

---

### Step 3: Regenerate Timetable

**IMPORTANT**: Old timetables won't have the new columns filled. You MUST:

1. **Delete** existing Semester 5 timetable
2. **Generate** new timetable
3. **Save** timetable (this will populate the new columns)
4. **View** timetable

---

## 📊 Expected Results

### Before Fix ❌:
```
Monday:
├─ 09:00-10:00: [TSD Lab] 2hr  ← Main entry
├─ 10:00-11:00: [TSD Lab] 2hr  ← WRONG! Shows as separate lab
```

Both showing "2hr" badge (incorrect)

### After Fix ✅:
```
Monday:
├─ 09:00-10:00: [TSD Lab] 2hr  ← Main entry
├─ 10:00-11:00: [TSD Lab]  ↓   ← Continuation (correct!)
```

First slot: "2hr" badge
Second slot: "↓" badge

---

## 🔍 How It Works Now

### Generation Phase:
```typescript
// Generate creates both entries with flags
addScheduledClass(day, slot1, subject, faculty, lab, true, false, 1);  
// is_lab=true, is_continuation=false

addScheduledClass(day, slot2, subject, faculty, lab, true, true, 1);   
// is_lab=true, is_continuation=true
```

### Save Phase:
```typescript
{
  subject_id: '...',
  time_slot_id: '...',
  is_lab: true,
  is_continuation: false,  // Main entry
  session_number: 1
}

{
  subject_id: '...',
  time_slot_id: '...',
  is_lab: true,
  is_continuation: true,   // Continuation entry
  session_number: 1
}
```

### View Phase:
```typescript
const isLabContinuation = (classInfo) => {
  return classInfo.is_continuation;  // Uses the flag!
};

const isLabStart = (classInfo) => {
  return classInfo.is_lab && !classInfo.is_continuation;
};
```

---

## 🗄️ Database Structure

### scheduled_classes Table (Updated):

```sql
CREATE TABLE scheduled_classes (
    id UUID PRIMARY KEY,
    timetable_id UUID,
    batch_id UUID,
    subject_id UUID,
    faculty_id UUID,
    classroom_id UUID,
    time_slot_id UUID,
    class_type subject_type DEFAULT 'THEORY',
    session_duration INT DEFAULT 60,
    notes TEXT,
    
    -- NEW COLUMNS ✨
    is_continuation BOOLEAN DEFAULT FALSE,
    is_lab BOOLEAN DEFAULT FALSE,
    session_number INT DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎨 Visual Display

### Lab Main Entry (First Hour):
```
┌────────────────────────────┐
│ Technical Skill Dev - I    │  ← Subject name
│ 25CE505P              2hr  │  ← Code + "2hr" badge (purple)
│ 👤 Prof. Omesh Wadhwani    │  ← Faculty
│ 📍 BF03                    │  ← Classroom
└────────────────────────────┘
   Purple background
   is_lab = true
   is_continuation = false
```

### Lab Continuation (Second Hour):
```
┌────────────────────────────┐
│ Technical Skill Dev - I    │  ← Same subject
│ 25CE505P               ↓   │  ← Code + "↓" badge (purple)
│ 👤 Prof. Omesh Wadhwani    │  ← Same faculty
│ 📍 BF03                    │  ← Same classroom
└────────────────────────────┘
   Slightly different purple
   is_lab = true
   is_continuation = true
```

---

## 📝 Testing Checklist

### Step 1: Database Migration
- [ ] Run migration SQL in Supabase
- [ ] Verify columns added:
  ```sql
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'scheduled_classes' 
  AND column_name IN ('is_continuation', 'is_lab', 'session_number');
  ```
- [ ] Should see 3 rows

### Step 2: Regenerate Timetable
- [ ] Delete old Semester 5 timetable
- [ ] Generate new one
- [ ] Save it
- [ ] Check console logs show: "Continuation entries: 3"

### Step 3: Verify Display
- [ ] View timetable
- [ ] Monday 09:00: TSD Lab with "2hr" badge ✅
- [ ] Monday 10:00: TSD Lab with "↓" badge ✅
- [ ] Tuesday 09:00: English Lab with "2hr" badge ✅
- [ ] Tuesday 10:00: English Lab with "↓" badge ✅
- [ ] Wednesday 09:00: OS Lab with "2hr" badge ✅
- [ ] Wednesday 10:00: OS Lab with "↓" badge ✅

### Step 4: Verify Database
```sql
SELECT 
    sc.id,
    ts.day,
    ts.start_time,
    s.code,
    sc.is_lab,
    sc.is_continuation,
    sc.session_number
FROM scheduled_classes sc
JOIN time_slots ts ON sc.time_slot_id = ts.id
JOIN subjects s ON sc.subject_id = s.id
WHERE sc.timetable_id = 'your-timetable-id'
AND sc.is_lab = true
ORDER BY ts.day, ts.start_time;

-- Should see:
-- Monday 09:00, TSD, is_lab=true, is_continuation=false
-- Monday 10:00, TSD, is_lab=true, is_continuation=true
-- Tuesday 09:00, English, is_lab=true, is_continuation=false
-- Tuesday 10:00, English, is_lab=true, is_continuation=true
-- Wednesday 09:00, OS, is_lab=true, is_continuation=false
-- Wednesday 10:00, OS, is_lab=true, is_continuation=true
```

---

## 🐛 Troubleshooting

### Issue: Still showing both with "2hr" badge

**Cause**: Database columns not added yet.

**Solution**:
```sql
-- Verify columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'scheduled_classes' 
AND column_name IN ('is_continuation', 'is_lab', 'session_number');

-- If no results, run the migration SQL
```

---

### Issue: Old timetables still wrong

**Cause**: Old timetables don't have the new columns filled.

**Solution**: Delete and regenerate timetables created before the migration.

---

### Issue: Continuation slots showing as "Free"

**Cause**: Save endpoint still filtering them out (old code).

**Solution**: Verify line 300 in save/route.ts says:
```typescript
if (item.is_continuation) return true;  // KEEP them
```

Not:
```typescript
if (item.is_continuation) return false;  // DON'T do this
```

---

## 📁 Files Modified

### Created:
1. ✅ `database/add-continuation-columns.sql` - Migration SQL

### Modified:
2. ✅ `src/app/api/hybrid-timetable/save/route.ts`
   - Lines ~358-375: Added `is_continuation`, `is_lab`, `session_number` fields

3. ✅ `src/app/faculty/timetables/view/[id]/page.tsx`
   - Lines ~18-36: Updated ScheduledClass interface
   - Lines ~113-115: SELECT new columns
   - Lines ~151-164: Updated enrichedClasses mapping
   - Lines ~191-206: Updated isLabContinuation and isLabStart functions

---

## ✨ Summary

**Problem**: Lab continuation slots not displaying properly (both showing "2hr" instead of "2hr" + "↓")

**Root Cause**: Missing database columns to track continuation status

**Solution**: 
1. Added `is_continuation`, `is_lab`, `session_number` columns to database
2. Updated save endpoint to save these flags
3. Updated view page to read and use these flags

**Result**: Lab sessions now display properly with correct badges! 🎉

---

## 🚀 Quick Start

```bash
# 1. Run migration in Supabase SQL Editor
# (Copy database/add-continuation-columns.sql)

# 2. Restart dev server
npm run dev

# 3. Delete old timetables
# 4. Generate new ones
# 5. View and verify!
```

**Expected**: All 36 slots filled, labs show "2hr" for first slot and "↓" for second slot! ✅
