# Manual Timetable Lab Saving Fix + Lunch Break Display

## Issues Fixed

### 1. ✅ Lab Classes Not Saving in Manual Scheduling
**Problem**: When creating manual timetables with lab sessions (2-hour continuous slots), only theory classes were being saved to the database. Lab sessions were lost.

**Root Cause**: The save route (`/api/timetables/route.ts`) was not handling lab-specific fields:
- `is_lab`: Flag to mark lab classes
- `is_continuation`: Flag for the second hour of a lab
- `session_number`: Track which session of the subject this is

**Solution Applied**:
1. **Added Lab Detection Logic** (Line ~412):
   ```typescript
   const isLabAssignment = assignment.isLab || 
                          assignment.subject.requiresLab || 
                          (assignment.subject.subjectType && 
                           assignment.subject.subjectType.toLowerCase().includes('lab'));
   ```

2. **Updated Class Data Saving** (Lines ~412-432):
   - Set `class_type` to 'LAB' for lab assignments
   - Added `is_lab: true` flag
   - Added `is_continuation: false` for main lab slot
   - Added `session_number` tracking

3. **Created Continuation Slots** (Lines ~444-476):
   - Automatically creates a second database entry for the continuation hour
   - Links to the next time slot
   - Marks with `is_continuation: true`
   - Uses same faculty, classroom, and subject

### 2. ✅ Added Lunch Break Display (13:15-14:15)
**Problem**: Timetables were missing the lunch break row between 12:15-13:15 and 14:15-15:15, making it unclear when lunch occurs.

**Solution Applied**:

#### A. TimetableCreatorIntegrated.tsx (AI/Hybrid Display)
**Lines 69-87**: Added 'LUNCH' slot to time slots array and display mapping

**Lines 574-602**: Updated grid rendering to show lunch break:
```tsx
{time === 'LUNCH' ? (
  <td colSpan={days.length} className="bg-yellow-50">
    <div className="flex items-center justify-center">
      <span className="text-2xl">🍽️</span>
      <span className="font-semibold">LUNCH BREAK</span>
    </div>
  </td>
) : (
  // Regular time slot cells
)}
```

#### B. View Timetable Page (view/[id]/page.tsx)
**Lines 176-182**: Added 'LUNCH' to time slots array

**Lines 464-479**: Updated header to show lunch break with special styling:
```tsx
if (slot === 'LUNCH') {
  return (
    <th className="bg-yellow-50 text-yellow-700">
      <span className="text-2xl">🍽️</span>
      <span>1:15-2:15 Lunch Break</span>
    </th>
  );
}
```

**Lines 487-496**: Updated table cells to display lunch break for all days:
```tsx
if (slot === 'LUNCH') {
  return (
    <td className="bg-yellow-50">
      <div className="text-yellow-700">🍽️ Lunch</div>
    </td>
  );
}
```

## Files Modified

### 1. `/src/app/api/timetables/route.ts`
**Purpose**: Save manual timetable assignments to database

**Changes**:
- Lines ~412-432: Added lab detection and field mapping
- Lines ~444-476: Added continuation slot creation logic
- Added comprehensive logging for debugging

**Key Logic**:
```typescript
// Detect lab assignments
const isLabAssignment = assignment.isLab || 
                       assignment.subject.requiresLab || 
                       assignment.subject.subjectType.toLowerCase().includes('lab');

// Save main slot
const classData = {
  // ... other fields
  is_lab: isLabAssignment,
  is_continuation: false,
  session_number: assignment.session_number || 1,
  class_type: isLabAssignment ? 'LAB' : 'THEORY'
};

// If lab, create continuation slot
if (isLabAssignment && assignment.duration === 2) {
  const continuationData = {
    // ... same fields but with
    is_continuation: true,
    // ... points to next time slot
  };
  scheduledClasses.push(continuationData);
}
```

### 2. `/src/components/TimetableCreatorIntegrated.tsx`
**Purpose**: AI/Hybrid timetable creation and display

**Changes**:
- Lines 69-87: Added 'LUNCH' slot to arrays
- Lines 574-602: Conditional rendering for lunch break

**Visual Changes**:
- Lunch break row spans all 6 days
- Yellow background (bg-yellow-50)
- 🍽️ emoji and "LUNCH BREAK" text
- Time display: "1:15-2:15 (Lunch)"

### 3. `/src/app/faculty/timetables/view/[id]/page.tsx`
**Purpose**: View saved timetables

**Changes**:
- Lines 176-182: Added 'LUNCH' to time slots
- Lines 464-479: Special header rendering for lunch
- Lines 487-496: Special cell rendering for lunch

**Visual Changes**:
- Lunch column header with emoji and time
- Yellow background for lunch cells
- Consistent styling across all days

## Database Schema Requirements

The fix assumes these columns exist in `scheduled_classes` table:

```sql
ALTER TABLE scheduled_classes 
ADD COLUMN IF NOT EXISTS is_lab BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_continuation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS session_number INTEGER DEFAULT 1;
```

**Note**: These columns were added in a previous migration (`database/add-continuation-columns.sql`).

## How Lab Saving Works Now

### 1. Manual Scheduling Component
When a user drags a lab subject to a time slot:
```typescript
const assignment = {
  subject: { id, name, requiresLab: true, subjectType: 'LAB' },
  faculty: { id, firstName, lastName },
  timeSlot: { day: 'Monday', startTime: '14:15', slotIndex: 6 },
  classroom: { id, name },
  isLab: true,
  duration: 2,
  endSlotIndex: 7 // Next slot
};
```

### 2. Save API Processing
The API route (`/api/timetables`) now:

**Step 1**: Detects it's a lab
```typescript
const isLabAssignment = true; // From multiple checks
```

**Step 2**: Creates main entry
```typescript
{
  time_slot_id: '...', // Maps to 14:15-15:15
  is_lab: true,
  is_continuation: false,
  session_number: 1,
  class_type: 'LAB'
}
```

**Step 3**: Creates continuation entry
```typescript
{
  time_slot_id: '...', // Maps to 15:15-16:15
  is_lab: true,
  is_continuation: true, // ⭐ Key difference
  session_number: 1, // Same session
  class_type: 'LAB'
}
```

### 3. Database Result
Two rows in `scheduled_classes`:
```
| subject_id | day    | time  | is_lab | is_continuation | display       |
|------------|--------|-------|--------|-----------------|---------------|
| CS505      | Monday | 14:15 | true   | false           | Lab + "2hr"   |
| CS505      | Monday | 15:15 | true   | true            | Lab + "↓"     |
```

### 4. View Page Display
The view page reads both entries and shows:
- **Slot 1** (14:15): Purple box with subject info + "2hr" badge
- **Slot 2** (15:15): Purple box with subject info + "↓" badge

## Testing Instructions

### Test 1: Manual Timetable with Labs
1. Go to Manual Scheduling page
2. Select a lab subject (e.g., "Computer Lab-I")
3. Drag it to a time slot (e.g., Monday 14:15-15:15)
4. The component should show it occupying TWO consecutive slots
5. Click "Save Draft"
6. **Expected**: Both slots saved to database
7. Go to view page
8. **Expected**: See lab in both slots with "2hr" and "↓" badges

### Test 2: Lunch Break Display
1. Generate an AI or Hybrid timetable
2. **Expected**: See lunch break row between 12:15-13:15 and 14:15-15:15
3. **Expected**: Yellow background with 🍽️ emoji
4. Save and view the timetable
5. **Expected**: Lunch break also visible in view page

### Test 3: Mixed Theory and Lab
1. Create manual timetable with:
   - Theory class at 09:00-10:00
   - Lab at 14:15-16:15 (2 hours)
   - Another theory at 12:15-13:15
2. Save and view
3. **Expected**:
   - Theory classes: Blue boxes, single slot
   - Lab: Purple boxes, two slots (2hr + ↓)
   - Lunch: Yellow row at 13:15-14:15

## Verification Queries

### Check if labs are saved correctly
```sql
SELECT 
  s.name as subject,
  sc.class_type,
  sc.is_lab,
  sc.is_continuation,
  sc.session_number,
  ts.day,
  ts.start_time
FROM scheduled_classes sc
JOIN subjects s ON sc.subject_id = s.id
JOIN time_slots ts ON sc.time_slot_id = ts.id
WHERE sc.timetable_id = 'YOUR_TIMETABLE_ID'
  AND sc.is_lab = true
ORDER BY ts.day, ts.start_time;
```

**Expected Output**:
```
| subject     | class_type | is_lab | is_continuation | session | day    | start_time |
|-------------|------------|--------|-----------------|---------|--------|------------|
| Computer Lab| LAB        | true   | false           | 1       | Monday | 14:15      |
| Computer Lab| LAB        | true   | true            | 1       | Monday | 15:15      |
```

### Check lunch break in time slots
```sql
SELECT * FROM time_slots 
WHERE start_time = '13:15' AND end_time = '14:15';
```

**Note**: The lunch "slot" is not an actual time_slot in the database - it's a UI-only display feature.

## Common Issues & Solutions

### Issue 1: Labs still not appearing in view
**Check**: Console logs in save API
**Look for**: "✅ Added lab continuation slot"
**Solution**: Ensure frontend is sending `isLab: true` and `duration: 2`

### Issue 2: Only one lab slot showing
**Check**: Database has both entries (main + continuation)
**Solution**: Verify continuation slot mapping logic found next time slot

### Issue 3: Lunch break not showing
**Check**: Browser console for errors
**Solution**: Clear cache and refresh, ensure time slots array includes 'LUNCH'

### Issue 4: Time slot mapping fails
**Check**: Console log "No database time slot found for X"
**Solution**: Verify time_slots table has entries for all time ranges

## Future Enhancements

1. **Break Time Display**: Add 11:00-11:15 break (similar to lunch)
2. **Lab Room Validation**: Ensure labs are assigned to lab-equipped classrooms
3. **Session Tracking**: Show "Session 1", "Session 2" for multiple lab sessions
4. **Conflict Detection**: Prevent scheduling overlapping labs
5. **Bulk Operations**: Allow scheduling multiple labs at once

## Related Documentation

- `AI-TIMETABLE-LAB-CONSTRAINT-FIX.md` - Max 1 lab per day constraint
- `database/add-continuation-columns.sql` - Database migration
- `DEPLOYMENT_GUIDE.md` - Full deployment instructions

## Success Criteria

✅ Manual timetable labs save to database with both slots  
✅ View page displays labs with "2hr" and "↓" badges  
✅ Lunch break visible in AI/Hybrid timetable generation  
✅ Lunch break visible in saved timetable view  
✅ Console logs show "Added lab continuation slot"  
✅ Database has correct is_lab, is_continuation flags  
✅ No conflicts between lab slots and other classes  
✅ UI matches expected design (purple for labs, yellow for lunch)
