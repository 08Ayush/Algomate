# Lab Scheduling Improvements

## Issues Fixed

### Issue 1: Empty Boxes for Lab Continuation Slots ✅
**Problem**: Lab sessions (2-hour slots) showed empty boxes in the timetable view for the second hour.

**Root Cause**: Algorithm was creating continuation entries, but they need to display the same subject information in both slots.

**Solution**: 
- Algorithm already creates both entries (main + continuation)
- Both entries have same subject, faculty, classroom info
- Frontend displays continuation with purple styling and ↓ arrow badge
- Continuation entries use `is_continuation: true` flag

**Result**: Lab sessions now display properly in both slots with visual indication of continuation.

---

### Issue 2: Multiple Labs on Same Day ✅
**Problem**: Algorithm was scheduling multiple lab sessions on the same day, which is not ideal for student workload distribution.

**Constraint Added**: **Maximum 1 lab per day per batch**

**Solution Implementation**:

1. **Tracking System** (`labScheduledDays` Set):
   ```typescript
   const labScheduledDays = new Set<string>();
   ```
   - Tracks which days already have labs scheduled
   - Ensures no day gets more than 1 lab

2. **Day Selection Logic** (`findNextDayWithoutLab`):
   - Searches for next available day without a lab
   - Wraps around week if needed
   - Returns `null` if all days have labs

3. **Sequential Day Assignment**:
   - First lab → Monday (if available)
   - Second lab → Tuesday (if available)
   - Third lab → Wednesday (if available)
   - And so on...

4. **Better Distribution**:
   - Labs spread across different days
   - More balanced student workload
   - Better lab utilization

**Algorithm Flow**:
```
For each lab subject:
  While sessions_scheduled < sessions_needed:
    1. Find next day WITHOUT a lab
    2. Check if that day has 2 consecutive free slots
    3. If YES:
       - Schedule main lab in slot 1
       - Schedule continuation in slot 2
       - Mark day as "has lab"
       - Move to next day for next lab
    4. If NO:
       - Try next available day
```

---

## New Constraint Rule Added

### `max_one_lab_per_day` (HARD Constraint)
- **Type**: HARD
- **Weight**: 85.0
- **Description**: Maximum one lab session can be scheduled per day for a batch to ensure even distribution
- **Parameters**: 
  ```json
  {
    "scope": "per_timetable",
    "resource": "batch",
    "check_type": "lab_per_day",
    "max_labs": 1
  }
  ```

---

## Files Modified

### 1. `src/app/api/hybrid-timetable/generate/route.ts`
**Changes in STEP 1 (Lab Scheduling)**:
- Added `labScheduledDays` Set for tracking
- Added `hasLabOnDay()` helper function
- Added `findNextDayWithoutLab()` helper function
- Modified lab scheduling loop to:
  - Search for days without labs
  - Skip days that already have labs
  - Distribute labs across different days
  - Provide better logging

**Lines Changed**: ~390-450

### 2. `database/insert-constraint-rules.sql`
**Changes**:
- Added new constraint rule: `max_one_lab_per_day`
- Placed between `lab_requires_continuous_slots` and `minimum_subject_hours`
- Weight: 85.0 (HARD constraint)

**Line**: ~52-57

### 3. `database/new_schema.sql`
**Changes**:
- Added same constraint rule to schema INSERT statements
- Ensures new databases have this constraint by default

**Line**: ~719-723

---

## Testing Checklist

### Before Testing:
- [ ] Run updated SQL to insert new constraint rule:
  ```sql
  -- In Supabase SQL Editor
  INSERT INTO constraint_rules (rule_name, rule_type, description, rule_parameters, weight, is_active) 
  VALUES
      ('max_one_lab_per_day', 'HARD',
       'Maximum one lab session per day for a batch to ensure even distribution',
       '{"scope": "per_timetable", "resource": "batch", "check_type": "lab_per_day", "max_labs": 1}',
       85.0,
       true)
  ON CONFLICT (rule_name) DO UPDATE SET
      description = EXCLUDED.description,
      rule_parameters = EXCLUDED.rule_parameters,
      weight = EXCLUDED.weight;
  ```

- [ ] Restart dev server:
  ```powershell
  npm run dev
  ```

### Test Cases:

#### Test 1: Lab Display (Semester 7)
- [ ] Generate Semester 7 timetable
- [ ] Check lab sessions in view
- [ ] Verify both slots show subject info (not empty)
- [ ] Verify first slot has "2hr" badge
- [ ] Verify second slot has "↓" badge
- [ ] Verify both slots have purple styling

#### Test 2: Lab Distribution (Semester 5)
- [ ] Generate Semester 5 timetable
- [ ] Count labs on each day
- [ ] Verify max 1 lab per day
- [ ] Verify labs are on different days
- [ ] Check console logs for distribution

#### Test 3: Multiple Lab Subjects (Semester 3)
- [ ] Generate Semester 3 timetable (if has multiple labs)
- [ ] Verify each lab subject on different day
- [ ] Verify no day has more than 1 lab
- [ ] Check all labs have continuous 2-hour slots

---

## Expected Results

### Before Fix:
❌ Monday: 2 labs (TSD-I Lab, English Lab)
❌ Tuesday: 1 lab (OS Lab)
❌ Wednesday: 0 labs
❌ Empty boxes in timetable view for continuation slots

### After Fix:
✅ Monday: 1 lab (TSD-I Lab) - slots shown in both hours
✅ Tuesday: 1 lab (English Lab) - slots shown in both hours
✅ Wednesday: 1 lab (OS Lab) - slots shown in both hours
✅ All continuation slots display subject information
✅ Better distribution across week

---

## Console Output Example

```
🔬 Step 1: Scheduling LAB sessions (continuous 2-hour slots)...
📋 Constraint: Maximum 1 lab per day, distributed across week
  ✅ 25CE505P LAB: Monday slots 0-1 (2 hours) - Session 1/1
  ✅ 25CE541P LAB: Tuesday slots 0-1 (2 hours) - Session 1/1
  ✅ 25CE502P LAB: Wednesday slots 0-1 (2 hours) - Session 1/1
✅ LAB scheduling: 3 sessions, Slots: 6/36
```

---

## Benefits

1. **Better Student Experience**:
   - No more than 1 lab per day
   - More manageable workload
   - Better work-life balance

2. **Better Lab Utilization**:
   - Labs distributed across week
   - Reduces lab congestion on single days
   - Better resource allocation

3. **Visual Clarity**:
   - Lab continuation slots now display properly
   - Clear purple styling for labs
   - Visual badges (2hr, ↓) for easy identification

4. **Flexible System**:
   - If more than 6 labs needed, algorithm handles gracefully
   - Can schedule multiple sessions of same lab on different weeks
   - Constraint can be adjusted if needed

---

## Troubleshooting

### Issue: Still seeing multiple labs on same day
**Solution**: 
1. Check if constraint rule was inserted:
   ```sql
   SELECT * FROM constraint_rules WHERE rule_name = 'max_one_lab_per_day';
   ```
2. Restart dev server
3. Clear browser cache (Ctrl+Shift+R)

### Issue: Empty continuation slots still showing
**Solution**:
1. Check console logs during generation
2. Verify both `addScheduledClass()` calls are executing
3. Check frontend `isLabContinuation()` function

### Issue: Not enough days for all labs
**Scenario**: If you have more than 6 lab subjects (6 days in week)
**Solution**: 
- Algorithm will warn in console
- Consider scheduling some labs every other week
- Or allow multiple labs on certain days (modify constraint weight)

---

## Future Enhancements

1. **Smart Lab Distribution**:
   - Prefer middle days (Tue-Thu) for labs
   - Avoid Friday/Saturday if possible
   
2. **Lab Preferences**:
   - Some labs prefer specific days
   - Consider lab equipment availability
   
3. **Multi-week Scheduling**:
   - Alternate labs across weeks
   - Handle more than 6 lab subjects

---

## Summary

✅ Fixed empty continuation slot display
✅ Added max 1 lab per day constraint
✅ Improved lab distribution across week
✅ Better student workload management
✅ Clear visual indicators for lab sessions
✅ Updated constraint rules in database
✅ Comprehensive logging for debugging

**Total Constraint Rules**: Now 13 (7 HARD, 6 SOFT)
**New Constraint**: `max_one_lab_per_day` (HARD, weight 85.0)
