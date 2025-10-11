# Timetable Generation Algorithm Improvements

## Issues Identified

1. **Only 20 classes generated** instead of filling all 36 slots (6 days × 6 slots)
2. **Lab sessions not properly continuous** - 2-hour labs should be in consecutive slots
3. **No constraint on continuous theory lectures** - same faculty teaching back-to-back theory
4. **Uneven distribution** - some days/slots empty while subjects not evenly distributed

## Solution Strategy

### Phase 1: Schedule Labs First (2-hour continuous blocks)
- Find 2 consecutive available slots
- Assign lab to qualified faculty
- Mark both slots as taken
- Ensure faculty not teaching continuous theory before/after

### Phase 2: Fill Remaining Slots with Theory
- Calculate slots per subject (even distribution)
- Round-robin assignment across all theory subjects
- Ensure no faculty teaches continuous theory slots
- Fill ALL remaining slots until grid is complete

### Phase 3: Optimization (Optional)
- Balance subject distribution across days
- Respect faculty preferences
- Avoid first/last slot labs

## Implementation Steps

1. ✅ Update `new_schema.sql` with new constraints
2. ⏳ Rewrite generation algorithm in `generate/route.ts`
3. ⏳ Test with Semester 3, 5, 7
4. ⏳ Verify all 36 slots filled
5. ⏳ Verify constraints satisfied

## Algorithm Pseudo code

```
totalSlots = 36 (6 days × 6 slots)
scheduledSlots = Set()
facultyDaySlots = Map()  // track faculty slots per day

// Step 1: Schedule all LAB sessions
FOR EACH lab_subject:
    sessionsNeeded = credits_per_week / 2
    FOR day IN days:
        find 2 consecutive empty slots
        IF found:
            schedule main lab session in slot1
            schedule continuation in slot2
            mark both slots as taken
            track faculty usage
            
// Step 2: Fill remaining slots with theory
remainingSlots = totalSlots - scheduledSlots.size
slotsPerSubject = remainingSlots / number_of_theory_subjects

currentSubject = 0
WHILE scheduledSlots.size < totalSlots:
    subject = theorySubjects[currentSubject]
    find next empty slot WHERE:
        - slot is empty
        - faculty NOT teaching in previous/next slot (if THEORY)
    IF found:
        schedule theory class
        mark slot as taken
        track faculty usage
    
    move to next subject (round-robin)
    IF all subjects covered AND slots remaining:
        restart from first subject

// Step 3: Verify
ASSERT scheduledSlots.size == totalSlots
ASSERT all labs are 2-hour continuous
ASSERT no faculty has continuous theory slots
```

## Testing Checklist

- [ ] Apply SQL fix (constraints)
- [ ] Apply new generation algorithm  
- [ ] Generate Semester 7 timetable
  - [ ] Verify 36 slots filled
  - [ ] Verify labs are continuous 2-hour blocks
  - [ ] Verify no continuous theory by same faculty
  - [ ] Check subject distribution
  
- [ ] Generate Semester 5 timetable
  - [ ] Same checks as above
  
- [ ] Generate Semester 3 timetable
  - [ ] Same checks as above
  
- [ ] Verify all 3 timetables saved successfully (no conflicts)

## Success Criteria

✅ All 36 time slots filled (no empty slots)
✅ Lab sessions scheduled in continuous 2-hour blocks
✅ No faculty teaching continuous theory lectures
✅ Even distribution of subjects across week
✅ All subject credit requirements met
✅ Multiple timetables can coexist (timetable-specific constraints)
