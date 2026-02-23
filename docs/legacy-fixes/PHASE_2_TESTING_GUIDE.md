# Phase 2 Testing Guide

## Quick Start Testing

### Prerequisites
1. Development server running: `npm run dev`
2. Supabase connection active
3. At least 2 departments with timetables

---

## Test Scenario 1: Faculty Conflict Detection

### Setup
1. Create a timetable for **Department A** (e.g., CSE)
2. Schedule faculty "Dr. John Smith" on **Monday 9:00-10:00 AM**
3. Save and submit for approval

### Test Steps
1. Create a timetable for **Department B** (e.g., IT)
2. Schedule the **same faculty "Dr. John Smith"** on **Monday 9:00-10:00 AM**
3. Save and submit for approval
4. Go to review queue and approve **Department A's timetable** first
5. Now try to approve **Department B's timetable**

### Expected Result
✅ **Conflict Dialog should appear** with:
- "Cross-Department Conflicts Detected"
- Resource Type: FACULTY
- Resource Name: Dr. John Smith
- Day: Monday
- Time: 09:00-10:00
- Shows both timetables in conflict list
- Publish is **BLOCKED**

### Manual Check
```sql
-- Check if Department A published to master registry
SELECT * FROM master_accepted_timetables WHERE is_active = true;

-- Check master scheduled classes
SELECT * FROM master_scheduled_classes 
WHERE faculty_id = 'dr-john-smith-id';

-- Check conflict records
SELECT * FROM cross_department_conflicts WHERE resolved = false;
```

---

## Test Scenario 2: Classroom Conflict Detection

### Setup
1. Create a timetable for **Department A**
2. Schedule **Room 301** on **Tuesday 2:00-3:00 PM**
3. Approve and publish

### Test Steps
1. Create a timetable for **Department B**
2. Schedule **same Room 301** on **Tuesday 2:00-3:00 PM**
3. Try to approve

### Expected Result
✅ **Conflict Dialog shows:**
- Resource Type: CLASSROOM
- Resource Name: Room 301
- Day: Tuesday
- Time: 14:00-15:00
- Severity: CRITICAL

---

## Test Scenario 3: No Conflicts (Should Pass)

### Setup
1. Create a timetable for **Department A**
2. Schedule Dr. Smith on **Monday 9:00 AM**

### Test Steps
1. Create a timetable for **Department B**
2. Schedule Dr. Smith on **Monday 11:00 AM** (different time)
3. Try to approve

### Expected Result
✅ **No conflicts, publish succeeds**
- Status changes to 'published'
- Master registry updated
- No conflict dialog appears

---

## Test Scenario 4: Multiple Conflicts

### Setup
Create Department B timetable with:
- Dr. Smith on Monday 9:00 AM (conflict with Dept A)
- Room 301 on Tuesday 2:00 PM (conflict with Dept A)
- Dr. Jones on Wednesday 10:00 AM (no conflict)

### Expected Result
✅ **Shows 2 conflicts**
- 1 FACULTY conflict
- 1 CLASSROOM conflict
- Displays all conflicting timetables

---

## API Testing

### Check for Conflicts (Manual)
```bash
curl -X POST http://localhost:3000/api/cross-department-conflicts \
  -H "Content-Type: application/json" \
  -d '{
    "timetable_id": "your-timetable-id",
    "store_conflicts": true
  }'
```

Expected Response (with conflicts):
```json
{
  "success": true,
  "data": {
    "hasConflicts": true,
    "conflicts": [...],
    "conflictCount": 2,
    "criticalCount": 2
  },
  "message": "Found 2 conflicts (2 critical)"
}
```

### Get Master Timetables
```bash
curl http://localhost:3000/api/master-timetables?college_id=YOUR_COLLEGE_ID
```

### Get Registry Statistics
```bash
curl "http://localhost:3000/api/master-timetables?action=stats&college_id=YOUR_COLLEGE_ID&academic_year=2025-26"
```

---

## Database Verification

### Check Master Registry
```sql
-- All published timetables
SELECT 
  id,
  title,
  department_id,
  published_at,
  is_active
FROM master_accepted_timetables
ORDER BY published_at DESC;

-- Count classes per timetable
SELECT 
  mat.title,
  COUNT(msc.id) as class_count
FROM master_accepted_timetables mat
LEFT JOIN master_scheduled_classes msc ON mat.id = msc.master_timetable_id
WHERE mat.is_active = true
GROUP BY mat.id, mat.title;
```

### Check Conflicts
```sql
-- All unresolved conflicts
SELECT 
  resource_type,
  severity,
  conflict_details->>'resource_name' as resource,
  conflict_details->>'day' as day,
  conflict_details->>'start_time' as time,
  created_at
FROM cross_department_conflicts
WHERE resolved = false
ORDER BY created_at DESC;
```

### Check Resource Occupation
```sql
-- Faculty with most classes
SELECT 
  faculty_id,
  COUNT(*) as class_count
FROM master_scheduled_classes
GROUP BY faculty_id
ORDER BY class_count DESC
LIMIT 10;

-- Classroom utilization
SELECT 
  classroom_id,
  COUNT(*) as class_count
FROM master_scheduled_classes
GROUP BY classroom_id
ORDER BY class_count DESC
LIMIT 10;
```

---

## Console Log Verification

When approving a timetable, you should see:

```
🔍 Checking for cross-department conflicts...
📋 Checking cross-department conflicts for timetable: abc-123
✅ Conflict check complete: 2 conflicts found (2 critical)
⚠️ Found 2 conflicts (2 critical)
✅ Stored 2 conflicts in database
```

If no conflicts:
```
🔍 Checking for cross-department conflicts...
✅ Conflict check complete: 0 conflicts found (0 critical)
✅ No conflicts detected, proceeding with approval
📋 Publishing timetable to master registry...
✅ Created master timetable entry: xyz-789
✅ Published 45 classes to master registry
```

---

## Browser Console Testing

Open browser console (F12) and run:

```javascript
// Check for conflicts manually
fetch('/api/cross-department-conflicts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    timetable_id: 'your-timetable-id',
    store_conflicts: true
  })
})
.then(r => r.json())
.then(data => console.log('Conflicts:', data));

// Get master timetables
fetch('/api/master-timetables?college_id=your-college-id')
.then(r => r.json())
.then(data => console.log('Master Timetables:', data));

// Check resource availability
fetch('/api/master-timetables?action=check_availability&resource_type=faculty&resource_id=faculty-id&time_slot_id=slot-id')
.then(r => r.json())
.then(data => console.log('Available:', data));
```

---

## Error Scenarios to Test

### 1. Master Registry Failure
- Simulate database error
- Verify rollback occurs
- Check timetable status reverts to 'pending_approval'

### 2. Partial Conflicts
- Some resources conflict, others don't
- Verify all conflicts are detected
- Check UI shows complete list

### 3. Resolved Conflicts
- Mark conflicts as resolved
- Try to republish
- Verify resolved conflicts don't block

---

## Success Criteria

✅ **Phase 2 is working if:**

1. **Conflict Detection:**
   - Faculty double-booking detected
   - Classroom double-booking detected
   - Conflicts stored in database
   - Publish is blocked when conflicts exist

2. **Master Registry:**
   - Approved timetables copied to master_accepted_timetables
   - All classes copied to master_scheduled_classes
   - is_active flag works correctly
   - Unpublish removes from master registry

3. **UI/UX:**
   - Conflict dialog appears on 409 response
   - All conflict details visible
   - Resource names displayed correctly
   - Department/batch/subject info shown

4. **API:**
   - All endpoints return correct data
   - Error handling works
   - Status codes appropriate (409 for conflicts)

5. **Database:**
   - All tables populated correctly
   - Foreign keys maintained
   - No orphaned records

---

## Troubleshooting

### Issue: Conflicts not detected
**Check:**
- Is master_scheduled_classes populated?
- Are faculty_id and classroom_id correct?
- Is time_slot_id matching?

### Issue: Publish fails silently
**Check:**
- Browser console for errors
- Server logs for exceptions
- Database permissions

### Issue: Conflict dialog not showing
**Check:**
- Response status is 409
- conflicts array in response
- ConflictResolutionDialog imported

### Issue: Master registry empty
**Check:**
- Approve action completed
- publishToMasterRegistry called
- Database insert succeeded

---

## Test Data Cleanup

After testing, clean up:

```sql
-- Remove test conflicts
DELETE FROM cross_department_conflicts WHERE created_at > NOW() - INTERVAL '1 hour';

-- Unpublish test timetables
UPDATE master_accepted_timetables SET is_active = false WHERE title LIKE '%TEST%';

-- Remove test master classes
DELETE FROM master_scheduled_classes WHERE master_timetable_id IN (
  SELECT id FROM master_accepted_timetables WHERE is_active = false
);

-- Reset timetable status
UPDATE generated_timetables SET status = 'draft' WHERE title LIKE '%TEST%';
```

---

## Next Steps After Testing

1. ✅ Verify all test scenarios pass
2. ✅ Check database integrity
3. ✅ Review console logs for errors
4. ✅ Test with real user workflows
5. ✅ Document any issues found
6. ✅ Deploy to staging environment
7. ✅ User acceptance testing
8. ✅ Production deployment

---

**Testing Completed By:** _______________  
**Date:** _______________  
**Status:** [ ] Pass [ ] Fail [ ] Needs Fixes  
**Notes:** _______________
