# AI Timetable Lab Constraint Fix

## Problem Statement
The AI timetable generator was scheduling multiple labs (2-hour slots) on the same day for a batch, which caused:
- Overload on single days (e.g., 3 labs on Monday)
- Inefficient distribution of practical sessions
- Student fatigue from back-to-back labs

## Solution Applied
Added "Maximum 1 Lab Per Day" constraint to the AI timetable generator, matching the hybrid timetable implementation.

## Implementation Details

### 1. Lab Tracking Mechanism
Added a `Set` to track which days already have labs scheduled:

```typescript
const labScheduledDays = new Set<string>();
```

### 2. Phase 1 Constraint (Priority Scheduling)
**Location**: Line ~269 in `generateOptimalTimetable()`

**Before Scheduling Check**:
```typescript
if (isLab && labScheduledDays.has(day)) {
  console.log(`⏭️ Skipping ${day} for ${subject.name} lab (already has a lab)`);
  continue;
}
```

**After Scheduling Marking**:
```typescript
labScheduledDays.add(day);
console.log(`✅ ${subject.code} LAB: ${day} slots ${slotIdx}-${slotIdx + 1} (2 hours)`);
```

### 3. Phase 2 Constraint (Filling Remaining Slots)
**Location**: Line ~548 in Phase 2 loop

**Before Scheduling Check**:
```typescript
// CONSTRAINT: Max 1 lab per day - check in Phase 2 as well
if (isLab && labScheduledDays.has(day)) {
  console.log(`⏭️ Phase 2: Skipping ${day} for ${subject.name} lab (already has a lab this day)`);
  continue; // Skip this subject, try next eligible subject
}
```

**After Scheduling Marking**:
```typescript
// Mark this day as having a lab
labScheduledDays.add(day);
```

## How It Works

### Phase 1: Priority Scheduling (Lines 151-400)
1. Schedules high-priority subjects first (labs, subjects with many hours)
2. **Before scheduling a lab**: Checks if `labScheduledDays.has(day)`
3. **If day has lab**: Skips to next day
4. **If day free**: Schedules lab + continuation slot
5. **After scheduling**: Adds day to `labScheduledDays` Set

### Phase 2: Fill Remaining Slots (Lines 450-650)
1. Fills empty slots with subjects still needing hours
2. **Before scheduling a lab**: Checks if `labScheduledDays.has(day)`
3. **If day has lab**: Skips this subject, tries next eligible subject
4. **If day free**: Schedules lab (2-hour if possible, 1-hour otherwise)
5. **After scheduling**: Marks day in `labScheduledDays` Set

## Expected Behavior

### Before Fix ❌
```
Monday:    [Lab A] [Lab A cont.] [Lab B] [Lab B cont.] [Theory X] [Theory Y]
Tuesday:   [Theory A] [Theory B] [Theory C] [Theory D] [Theory E] [Theory F]
Wednesday: [Theory G] [Theory H] [Theory I] [Lab C] [Lab C cont.] [Theory J]
```
- Monday has 2 labs (4 hours of practicals)
- Tuesday has no labs
- Uneven distribution

### After Fix ✅
```
Monday:    [Lab A] [Lab A cont.] [Theory X] [Theory Y] [Theory Z] [Theory W]
Tuesday:   [Lab B] [Lab B cont.] [Theory A] [Theory B] [Theory C] [Theory D]
Wednesday: [Lab C] [Lab C cont.] [Theory E] [Theory F] [Theory G] [Theory H]
```
- Each day has exactly 1 lab (2 hours)
- Labs distributed evenly across Mon/Tue/Wed
- Better balance of theory and practical sessions

## Testing Checklist

### 1. Generate AI Timetable
```bash
# In browser: Navigate to AI Timetable Generator
http://localhost:3000/admin/ai-timetable

# Select: Semester 5, Batch, Department
# Click: Generate Timetable
```

### 2. Verify Lab Distribution
Check console logs for:
- ✅ `[Lab Name] LAB: Monday slots X-Y (2 hours)`
- ⏭️ `Skipping Tuesday for [Lab Name] lab (already has a lab)`
- ✅ `[Lab Name] LAB: Wednesday slots X-Y (2 hours)`

### 3. Verify Timetable View
Each day should show:
- **First slot**: Lab badge "2hr" + lab name
- **Second slot**: Continuation badge "↓" + lab name
- **No day** should have more than one 2-hour lab block

### 4. Check Database Entries
```sql
SELECT 
  day, 
  time,
  subject_name,
  is_lab,
  is_continuation,
  session_number
FROM scheduled_classes
WHERE timetable_id = '[generated_id]'
  AND is_lab = true
ORDER BY day, time;
```

Expected:
- 1 main lab entry per day (is_continuation = false)
- 1 continuation entry per day (is_continuation = true)
- No day has 2 main lab entries

## Console Output Examples

### Successful Lab Scheduling
```
🔄 Attempting to schedule: CS509 - Data Science Lab (LAB) - 4 hours needed
✅ CS509 LAB: Monday slots 0-1 (2 hours)
⏭️ Skipping Tuesday for CS509 - Data Science Lab lab (already has a lab)
✅ CS509 LAB: Wednesday slots 2-3 (2 hours)
```

### Phase 2 Skipping
```
⏭️ Phase 2: Skipping Monday for CS508 - Machine Learning Lab lab (already has a lab this day)
✅ Added 2-hour lab #35,36: CS508 - Machine Learning Lab on Tuesday 10:30-11:30 with Dr. Smith in Lab-2
```

## Related Files

### Modified Files
- `src/app/api/ai-timetable/generate/route.ts` - Added constraint logic

### Supporting Files (Already Fixed)
- `database/add-continuation-columns.sql` - Database migration
- `src/app/api/hybrid-timetable/save/route.ts` - Save endpoint with continuation support
- `src/app/faculty/timetables/view/[id]/page.tsx` - View page with continuation display

## Constraint Logic Pseudo-Code

```
INITIALIZE labScheduledDays = empty Set

FOR each subject in priority order:
  IF subject is LAB:
    FOR each day in ['Monday', 'Tuesday', 'Wednesday']:
      IF labScheduledDays.contains(day):
        SKIP to next day  // Constraint enforced!
      ENDIF
      
      IF can schedule 2 consecutive slots on day:
        Schedule main lab slot
        Schedule continuation slot
        ADD day to labScheduledDays  // Mark day as occupied
        BREAK  // Move to next subject
      ENDIF
    ENDFOR
  ENDIF
ENDFOR
```

## Troubleshooting

### Issue: Still seeing multiple labs on same day
**Check**: Console logs for "Skipping" messages
**Solution**: Verify `labScheduledDays.add(day)` is called after scheduling

### Issue: Labs not scheduling at all
**Check**: Are there enough free days? (Mon/Tue/Wed)
**Solution**: Reduce number of lab subjects or increase available days

### Issue: Single-hour lab slots appearing
**Check**: Are consecutive slots available?
**Cause**: Both Phase 1 and Phase 2 will fall back to 1-hour slots if no consecutive slots found

### Issue: Continuation slots showing "Free"
**Check**: Database has `is_continuation`, `is_lab`, `session_number` columns
**Solution**: Run `database/add-continuation-columns.sql` migration

## Success Criteria

✅ **Distribution**: Maximum 1 lab per day
✅ **Continuity**: Labs show in 2 consecutive slots
✅ **Display**: First slot shows "2hr" badge, second shows "↓" badge
✅ **Console**: "Skipping" logs appear for days with existing labs
✅ **Balance**: Theory classes distributed around labs
✅ **Completion**: All 36 slots filled (6 days × 6 slots)

## Next Steps

1. **Run Database Migration**: Execute `add-continuation-columns.sql` in Supabase
2. **Restart Dev Server**: `npm run dev`
3. **Test AI Generation**: Generate timetable for Semester 5
4. **Verify Console Logs**: Check for constraint enforcement
5. **Inspect Timetable View**: Verify lab display with badges
6. **Check Database**: Confirm continuation flags saved correctly

## Notes

- This fix mirrors the hybrid timetable implementation for consistency
- Both Phase 1 (priority) and Phase 2 (filling) enforce the constraint
- The Set data structure ensures O(1) lookup performance
- Console logs help debug constraint enforcement
- Falls back to 1-hour slots if consecutive slots unavailable (rare edge case)
