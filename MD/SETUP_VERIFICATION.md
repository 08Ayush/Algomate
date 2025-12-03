# System Setup Verification

## Your Current Setup

### Batches
- ✅ **1 batch** for Semester 3
- ✅ **1 batch** for Semester 5  
- ✅ **1 batch** for Semester 7

### Infrastructure
- ✅ **7 classrooms** available
- ✅ **Time slots** configured
- ✅ **Subjects** defined for each semester
- ✅ **Faculty** available

## Expected Workflow for Semester 3

### When You Create a Timetable for Semester 3:

1. **Frontend** (ManualSchedulingComponent):
   - User selects semester: `3`
   - User adds assignments (subject + faculty + time slot)
   - User enters timetable title
   - Click "Save Draft"

2. **API** (/api/timetables):
   - Receives request with `semester: 3`
   - Searches for active batch: `WHERE semester = 3 AND is_active = true`
   - **Finds 1 batch** (your semester 3 batch) ✅
   - Uses that batch's ID to link timetable
   - Creates timetable with `batch_id` FK
   - Creates scheduled classes linked to that batch

3. **Database**:
   ```
   generated_timetables
   ├── batch_id → (your semester 3 batch)
   └── scheduled_classes
       ├── batch_id → (same batch)
       ├── time_slot_id → (from your time slots)
       ├── classroom_id → (from your 7 classrooms)
       ├── subject_id → (from semester 3 subjects)
       └── faculty_id → (from assigned faculty)
   ```

## Verification Queries

Run these in Supabase SQL Editor to verify everything is ready:

### Query 1: Check Your Batches
```sql
SELECT 
  b.id,
  b.name,
  b.semester,
  b.year,
  d.name as department,
  d.code as dept_code,
  c.name as college
FROM batches b
JOIN departments d ON b.department_id = d.id
JOIN colleges c ON b.college_id = c.id
WHERE b.is_active = true
ORDER BY b.semester;
```

**Expected Result:**
```
| id        | name           | semester | year | department       | dept_code | college |
|-----------|----------------|----------|------|------------------|-----------|---------|
| uuid-sem3 | CSE Sem 3 Batch| 3        | 2    | Computer Science | CSE       | SVPCET  |
| uuid-sem5 | CSE Sem 5 Batch| 5        | 3    | Computer Science | CSE       | SVPCET  |
| uuid-sem7 | CSE Sem 7 Batch| 7        | 4    | Computer Science | CSE       | SVPCET  |
```

**Copy the `id` for Semester 3!** You'll need it.

### Query 2: Check Your Classrooms
```sql
SELECT 
  id,
  room_number,
  building,
  capacity,
  room_type,
  is_lab
FROM classrooms
WHERE is_available = true
ORDER BY building, room_number;
```

**Expected:** 7 rows

### Query 3: Check Time Slots
```sql
SELECT 
  day,
  COUNT(*) as slots_count
FROM time_slots
WHERE is_active = true
GROUP BY day
ORDER BY 
  CASE day
    WHEN 'Monday' THEN 1
    WHEN 'Tuesday' THEN 2
    WHEN 'Wednesday' THEN 3
    WHEN 'Thursday' THEN 4
    WHEN 'Friday' THEN 5
    WHEN 'Saturday' THEN 6
  END;
```

**Expected:** At least 5-8 time slots per day

### Query 4: Check Semester 3 Subjects
```sql
SELECT 
  s.id,
  s.name,
  s.code,
  s.subject_type,
  s.credits_per_week
FROM subjects s
WHERE s.semester = 3 AND s.is_active = true
ORDER BY s.code;
```

**Expected:** Multiple subjects (theory + labs)

### Query 5: Check Your User
```sql
-- Replace with your actual email
SELECT 
  u.id,
  u.email,
  u.role,
  u.department_id,
  u.college_id,
  d.name as department,
  c.name as college
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN colleges c ON u.college_id = c.id
WHERE u.email = 'your-email@example.com';
```

**Important Checks:**
- ✅ `department_id` should match the department of your batches
- ✅ `college_id` should match the college of your batches
- ⚠️ If NULL, you need to update (see QUICK_FIX.md)

## Test Case for Semester 3

After fixing the "Missing: college ID" error, here's a complete test:

### Step 1: Navigate
Go to: `/faculty/manual-scheduling`

### Step 2: Select Semester
Choose: **Semester 3**

### Step 3: Add Assignment
1. **Subject**: Select any subject from semester 3 (e.g., "Data Structures")
2. **Faculty**: Select any faculty member
3. **Time Slot**: Select any available slot (e.g., Monday 9:00-10:00)
4. **Classroom**: Select any of your 7 classrooms
5. **Duration**: 1 hour
6. Click "Add Assignment"

### Step 4: Enter Title
Title: "CSE Semester 3 Timetable - Week 1"

### Step 5: Save
Click **"Save Draft"**

### Expected Console Logs (F12):
```
📤 Sending timetable save request: {
  assignments: [ { ... } ],
  createdBy: "your-user-id",
  semester: 3,
  academicYear: "2025-26",
  title: "CSE Semester 3 Timetable - Week 1"
}

API:
🔍 No batch_id provided, searching for existing batch...
✅ Found existing batch: [your-sem-3-batch-id]
📝 Creating generation task...
✅ Created generation task: [task-uuid]
💾 Creating timetable with data: { ... }
✅ Created timetable: [timetable-uuid]
📝 Creating 1 scheduled classes...
✅ Successfully created 1 scheduled classes
✅ Workflow approval record created
```

### Expected Alert:
```
✅ Timetable saved successfully! You can now submit it for review.
```

### Step 6: Verify in Database
```sql
-- Check the timetable was created
SELECT 
  gt.id,
  gt.title,
  gt.status,
  b.name as batch_name,
  b.semester,
  gt.created_at,
  (SELECT COUNT(*) FROM scheduled_classes WHERE timetable_id = gt.id) as classes
FROM generated_timetables gt
JOIN batches b ON gt.batch_id = b.id
WHERE gt.title = 'CSE Semester 3 Timetable - Week 1';
```

**Expected:** 1 row showing your timetable with status='draft' and classes=1

```sql
-- Check the scheduled class
SELECT 
  sc.id,
  s.name as subject,
  s.code,
  CONCAT(f.first_name, ' ', f.last_name) as faculty,
  ts.day,
  ts.start_time,
  ts.end_time,
  c.room_number as classroom,
  sc.class_type,
  sc.session_duration
FROM scheduled_classes sc
JOIN subjects s ON sc.subject_id = s.id
LEFT JOIN faculty f ON sc.faculty_id = f.id
JOIN time_slots ts ON sc.time_slot_id = ts.id
LEFT JOIN classrooms c ON sc.classroom_id = c.id
JOIN generated_timetables gt ON sc.timetable_id = gt.id
WHERE gt.title = 'CSE Semester 3 Timetable - Week 1';
```

**Expected:** 1 row showing the assignment you created

## Common Issues & Solutions

### Issue 1: "No active batch found for semester 3"
**Cause:** Batch is inactive or doesn't exist
**Fix:** 
```sql
-- Check batch status
SELECT id, name, semester, is_active FROM batches WHERE semester = 3;

-- If exists but inactive, activate it
UPDATE batches SET is_active = true WHERE semester = 3;
```

### Issue 2: "User information is incomplete. Missing: college ID"
**Cause:** Frontend validation (we just fixed this!)
**Fix:** Refresh browser (Ctrl+F5) to load updated code

### Issue 3: "Failed to create scheduled classes"
**Cause:** Invalid subject_id, faculty_id, time_slot_id, or classroom_id
**Fix:** Verify the IDs in your assignments match actual database records

### Issue 4: "No time_slot_id found for day-time combination"
**Cause:** Time slots not populated or mismatched format
**Fix:** Run diagnostic queries to check time_slots table

## Summary

✅ **1 batch per semester** (3, 5, 7) - Perfect for single-section departments
✅ **7 classrooms** - Enough for multiple simultaneous classes
✅ **Time slots configured** - Ready for scheduling
✅ **Frontend fix applied** - No longer requires user.college_id
✅ **API ready** - Will automatically find the batch for semester 3

**Next Step:** Refresh your browser and try the test case above! 🚀
