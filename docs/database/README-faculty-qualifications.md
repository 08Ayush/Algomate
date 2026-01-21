# Faculty Qualifications Database Setup

## Purpose
This script sets up the many-to-many relationship between faculty and subjects, which is **critical** for AI timetable generation.

## Problem It Solves
Without faculty-subject qualifications, the AI algorithm cannot assign teachers to classes, resulting in:
```
❌ No qualified faculty found for [Subject Name]
```

## What This Script Does

### 1. View Current Data
Shows you:
- All subjects that need faculty assignment
- All available faculty members
- Current qualifications (if any)

### 2. Auto-Assign Faculty to Subjects
Uses a **round-robin algorithm** to:
- Distribute subjects evenly across faculty
- Respect department boundaries
- Set reasonable defaults (proficiency, preference)
- Handle lab/tutorial capabilities
- Mark assignments as primary teachers

### 3. Verify Assignments
Provides queries to:
- Count assignments per semester
- Find subjects without faculty (critical!)
- Check faculty workload distribution
- Generate detailed reports

### 4. Cleanup (if needed)
- Remove duplicate qualifications
- Fix data inconsistencies

## How to Use

### Option 1: Run in Supabase SQL Editor (Recommended)

1. **Open SQL Editor:**
   ```
   https://supabase.com/dashboard/project/hwfdzrqfesebmuzgqmpe/sql
   ```

2. **Copy the script:**
   - Open `setup-faculty-qualifications.sql`
   - Copy the entire "Round-robin assignment" DO block (starting around line 200)

3. **Paste and Run:**
   - Paste in SQL Editor
   - Click "Run" button
   - Wait for completion

4. **Verify:**
   - Run the verification queries at the end
   - Check that all subjects have faculty assigned

### Option 2: Use UI Instead (No SQL Required)

Navigate to:
```
http://localhost:3000/faculty/qualifications
```

Use the web interface to manually assign faculty to subjects.

## Expected Results

### Before Running
```sql
-- Query: Find subjects without faculty
SELECT COUNT(*) FROM subjects s
LEFT JOIN faculty_qualified_subjects fq ON s.id = fq.subject_id
WHERE s.is_active = TRUE AND fq.id IS NULL;
```
**Result:** Many subjects (could be 40+)

### After Running
```sql
-- Same query as above
```
**Result:** 0 subjects (all have faculty assigned)

## Verification Queries

### 1. Check Coverage
```sql
SELECT 
    s.semester,
    COUNT(DISTINCT s.id) as total_subjects,
    COUNT(fq.id) as total_assignments
FROM subjects s
LEFT JOIN faculty_qualified_subjects fq ON s.id = fq.subject_id
WHERE s.is_active = TRUE
GROUP BY s.semester
ORDER BY s.semester;
```

**Expected:** Every semester should have `total_assignments > 0`

### 2. Find Missing Assignments
```sql
SELECT s.semester, s.code, s.name
FROM subjects s
LEFT JOIN faculty_qualified_subjects fq ON s.id = fq.subject_id
WHERE s.is_active = TRUE AND fq.id IS NULL;
```

**Expected:** Zero rows (no missing assignments)

### 3. Check Faculty Workload
```sql
SELECT 
    u.first_name || ' ' || u.last_name as faculty,
    COUNT(*) as subject_count
FROM users u
JOIN faculty_qualified_subjects fq ON u.id = fq.faculty_id
GROUP BY u.id, u.first_name, u.last_name
ORDER BY subject_count DESC;
```

**Expected:** Workload relatively evenly distributed

## Algorithm Explanation

### Round-Robin Distribution

```
Department 1 (CSE) has 3 faculty: A, B, C
Department 1 has 9 subjects: S1-S9

Assignment:
S1 → Faculty A
S2 → Faculty B
S3 → Faculty C
S4 → Faculty A
S5 → Faculty B
S6 → Faculty C
S7 → Faculty A
S8 → Faculty B
S9 → Faculty C
```

This ensures **fair distribution** of teaching load.

### Default Values Set

```sql
proficiency_level: 7/10  -- Competent level
preference_score: 6/10   -- Slightly positive preference
teaching_load_weight: 1.0 -- Standard load
is_primary_teacher: TRUE  -- Primary for this subject
can_handle_lab: TRUE      -- If subject is LAB type
can_handle_tutorial: TRUE -- Can handle tutorials
```

You can adjust these later via the UI.

## Troubleshooting

### Issue: No faculty found for department

**Cause:** Department has no active faculty members

**Solution:**
1. Add faculty to that department first
2. Then run this script again

### Issue: Script runs but still seeing conflicts

**Cause:** Subjects may have been added after running script

**Solution:**
1. Run verification query to find missing subjects
2. Use UI to assign faculty manually: `/faculty/qualifications`

### Issue: Uneven workload distribution

**Cause:** Different numbers of faculty per department

**Solution:**
- Use UI to manually redistribute
- Adjust `teaching_load_weight` for heavy-loaded faculty

## Important Notes

### ON CONFLICT Handling
```sql
ON CONFLICT (faculty_id, subject_id) DO UPDATE SET
    is_primary_teacher = TRUE,
    proficiency_level = 7;
```

This means:
- If a qualification already exists, it will be updated
- Won't create duplicates
- Safe to run multiple times

### Data Preservation
- Does NOT delete existing qualifications
- Only inserts new ones or updates existing
- Safe to run on production data

### Rollback (if needed)
If you need to start over:
```sql
-- WARNING: This deletes ALL qualifications
TRUNCATE TABLE faculty_qualified_subjects CASCADE;
```

## Integration with AI Generation

The AI algorithm (`/api/ai-timetable/generate`) uses this data:

```typescript
// 1. Fetch subjects for semester
const subjects = await fetchSubjects(semester);

// 2. Query qualifications
const qualifications = await fetchQualifications(subjectIds);

// 3. For each subject, find qualified faculty
for (const subject of subjects) {
  const qualified = qualifications.filter(q => 
    q.subject_id === subject.id
  );
  
  if (qualified.length === 0) {
    // ❌ CONFLICT! No faculty for this subject
    conflicts.push(`No qualified faculty for ${subject.name}`);
    continue;
  }
  
  // ✅ Select best faculty and assign
  const best = selectBestFaculty(qualified);
  assignToTimeSlot(subject, best);
}
```

## Success Metrics

After running this script:

✅ All subjects have ≥1 qualified faculty
✅ Zero "no qualified faculty" conflicts
✅ AI timetable generation works
✅ Faculty workload reasonably distributed

## Next Steps

1. Run this script in SQL Editor
2. Verify with verification queries
3. Test AI generation for each semester
4. Use UI for fine-tuning: `/faculty/qualifications`
5. Maintain as faculty/subjects change

## Support

- **Full Guide:** `FACULTY_QUALIFICATION_SYSTEM.md`
- **Quick Fix:** `QUICK_FIX_AI_CONFLICTS.md`
- **Checklist:** `FIX_CHECKLIST.md`
- **UI:** `/faculty/qualifications`

---

**Status:** Production-ready
**Safety:** Safe to run multiple times
**Duration:** ~2 seconds (depends on data volume)
**Impact:** Critical - Enables AI timetable generation
