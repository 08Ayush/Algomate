# Faculty-Subject Qualification System - Complete Guide

## Problem Statement

When generating timetables using AI Assistant, you encountered:
```
Conflicts Detected (11)
• No qualified faculty found for Mathematics for Computer Engineering
• No qualified faculty found for Data Structure
• No qualified faculty found for Digital Circuits
... (and more)
```

This happens because the `faculty_qualified_subjects` table (which links faculty to subjects they can teach) was either:
1. Empty (no assignments)
2. Had incorrect/incomplete assignments
3. Had all faculty assigned to all subjects (causing conflicts)

## Root Cause

The AI timetable generation algorithm in `/api/ai-timetable/generate` queries:
```typescript
const { data: facultyQualifications } = await supabase
  .from('faculty_qualified_subjects')
  .select('*')
  .in('subject_id', subjectIds);
```

If this returns empty or has no qualified faculty for a subject, the algorithm can't assign anyone to teach it → **Conflict!**

## Solution Architecture

### 1. Database Table Structure

```sql
CREATE TABLE faculty_qualified_subjects (
    id UUID PRIMARY KEY,
    faculty_id UUID REFERENCES users(id),
    subject_id UUID REFERENCES subjects(id),
    proficiency_level INT (1-10),      -- How good they are at teaching this
    preference_score INT (1-10),        -- How much they want to teach this
    teaching_load_weight DECIMAL,       -- Load multiplier for algorithm
    is_primary_teacher BOOLEAN,         -- Preferred teacher for this subject
    can_handle_lab BOOLEAN,             -- Can teach lab sessions
    can_handle_tutorial BOOLEAN,        -- Can teach tutorials
    UNIQUE(faculty_id, subject_id)      -- One entry per faculty-subject pair
);
```

### 2. API Endpoint Created

**`/api/faculty/qualifications`**

**GET** - Fetch qualifications
- Query params: `faculty_id`, `department_id`
- Returns all faculty-subject mappings with full details

**POST** - Add new qualification
```json
{
  "faculty_id": "uuid",
  "subject_id": "uuid",
  "proficiency_level": 7,
  "preference_score": 5,
  "is_primary_teacher": false,
  "can_handle_lab": true,
  "can_handle_tutorial": true
}
```

**DELETE** - Remove qualification
- Query param: `id`

### 3. UI Page Created

**`/faculty/qualifications`**

Features:
- ✅ View all faculty-subject qualifications grouped by semester
- ✅ Search by faculty name or subject name
- ✅ Filter by semester
- ✅ Add new qualifications via modal
- ✅ Remove qualifications
- ✅ Visual proficiency indicators
- ✅ Capability badges (Primary, Lab, Tutorial)
- ✅ Statistics dashboard

### 4. Database Setup Script

**`database/setup-faculty-qualifications.sql`**

Provides:
1. **View Queries** - See current subjects and faculty
2. **Manual Assignment Template** - For custom assignments
3. **Automated Round-Robin Assignment** - Distributes subjects evenly across faculty
4. **Verification Queries** - Find gaps and conflicts
5. **Cleanup Scripts** - Remove duplicates

## How to Fix Your System

### Option A: Use the UI (Recommended)

1. **Navigate to Qualifications Page**
   ```
   http://localhost:3000/faculty/qualifications
   ```

2. **Check Current Status**
   - See if any qualifications exist
   - Note which subjects have no faculty assigned

3. **Add Qualifications**
   - Click "Add Qualification"
   - Select Faculty member
   - Select Subject
   - Set Proficiency (1-10)
   - Set Preference (1-10)
   - Check capabilities (Lab, Tutorial, Primary)
   - Click "Add"

4. **Repeat for All Subjects**
   - Ensure every subject has at least ONE qualified faculty member
   - Preferably 2-3 faculty per subject for flexibility

### Option B: Use SQL Script (Faster for Bulk)

1. **Open Supabase SQL Editor**
   ```
   https://supabase.com/dashboard/project/hwfdzrqfesebmuzgqmpe/sql
   ```

2. **Run Verification Query First**
   ```sql
   -- Find subjects without faculty
   SELECT 
       s.semester,
       s.code,
       s.name,
       s.subject_type
   FROM subjects s
   LEFT JOIN faculty_qualified_subjects fq ON s.id = fq.subject_id
   WHERE s.is_active = TRUE
     AND fq.id IS NULL
   ORDER BY s.semester, s.name;
   ```

3. **Run Auto-Assignment Script**
   - Copy the round-robin DO block from `setup-faculty-qualifications.sql`
   - Run it in SQL Editor
   - This will automatically assign subjects to faculty evenly

4. **Verify Assignments**
   ```sql
   -- Count assignments per semester
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

### Option C: API Integration (For Automation)

```javascript
// Example: Assign faculty to subject programmatically
const response = await fetch('/api/faculty/qualifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    faculty_id: 'faculty-uuid',
    subject_id: 'subject-uuid',
    proficiency_level: 8,
    preference_score: 7,
    is_primary_teacher: true,
    can_handle_lab: true,
    can_handle_tutorial: true
  })
});
```

## Testing AI Timetable Generation

### Before Fix
```
Conflicts Detected (11)
• No qualified faculty found for Subject A
• No qualified faculty found for Subject B
...
```

### After Fix
1. **Assign Faculty to All Subjects**
   - Use UI or SQL script
   - Ensure every subject has at least 1 qualified faculty

2. **Test AI Generation**
   - Go to `/faculty/ai-timetable-creator`
   - Enter prompt: "Create timetable for 3rd semester"
   - Should now generate without "no qualified faculty" conflicts

3. **Expected Result**
   ```
   ✅ Timetable Generated Successfully
   📊 45 classes scheduled
   👨‍🏫 8 faculty members assigned
   🏫 12 classrooms utilized
   ```

## How the AI Algorithm Uses Qualifications

From `/api/ai-timetable/generate/route.ts`:

```typescript
// 1. Fetch subjects for semester
const { data: subjects } = await supabase
  .from('subjects')
  .select('*')
  .eq('semester', semester);

// 2. Fetch qualified faculty for these subjects
const { data: facultyQualifications } = await supabase
  .from('faculty_qualified_subjects')
  .select(`
    *,
    faculty:users(*),
    subject:subjects(*)
  `)
  .in('subject_id', subjectIds);

// 3. For each subject, find best faculty
const qualifiedFaculty = facultyQualifications.filter(
  fq => fq.subject_id === subject.id
);

if (qualifiedFaculty.length === 0) {
  conflicts.push({
    type: 'no_faculty',
    subject: subject.name,
    message: `No qualified faculty found for ${subject.name}`
  });
  continue; // Skip this subject → CONFLICT!
}

// 4. Select best faculty based on:
// - Proficiency level (higher is better)
// - Current workload (less loaded preferred)
// - Preference score (higher preference wins)
// - is_primary_teacher flag (primary gets priority)
```

## Best Practices

### 1. Qualification Guidelines

- **Proficiency Level (1-10)**
  - 1-3: Novice (can teach basics)
  - 4-6: Competent (regular teaching)
  - 7-8: Proficient (expert level)
  - 9-10: Master (subject expert)

- **Preference Score (1-10)**
  - 1-3: Prefer not to teach
  - 4-6: Neutral
  - 7-8: Prefer to teach
  - 9-10: Highly prefer

- **Primary Teacher Flag**
  - Set for the BEST/PREFERRED faculty for each subject
  - Algorithm prioritizes primary teachers

### 2. Assignment Strategy

**Minimum:** 1 faculty per subject (prevents conflicts)
**Recommended:** 2-3 faculty per subject (provides flexibility)
**Maximum:** No hard limit, but 4-5 is reasonable

**Distribution:**
```
Subject A → Faculty 1 (Primary), Faculty 2 (Secondary)
Subject B → Faculty 2 (Primary), Faculty 3 (Secondary)
Subject C → Faculty 3 (Primary), Faculty 1 (Secondary)
```

### 3. Maintenance

- Review qualifications each semester
- Update when faculty changes
- Remove qualifications for inactive faculty/subjects
- Use the UI dashboard to monitor coverage

## Troubleshooting

### Issue: Still getting "No qualified faculty" errors

**Solution:**
```sql
-- Find the problematic subjects
SELECT s.name, s.code, s.semester
FROM subjects s
LEFT JOIN faculty_qualified_subjects fq ON s.id = fq.subject_id
WHERE s.is_active = TRUE AND fq.id IS NULL;

-- Assign them manually via UI or SQL
```

### Issue: Algorithm assigns same faculty to overlapping slots

**Solution:**
- The algorithm checks for conflicts automatically
- Ensure faculty have reasonable `max_hours_per_day` set in users table
- Adjust `teaching_load_weight` to distribute load

### Issue: Lab subjects not being scheduled properly

**Solution:**
```sql
-- Ensure faculty have can_handle_lab = TRUE for lab subjects
UPDATE faculty_qualified_subjects
SET can_handle_lab = TRUE
WHERE subject_id IN (
  SELECT id FROM subjects 
  WHERE subject_type = 'LAB' OR requires_lab = TRUE
);
```

## API Integration Examples

### Get All Qualifications
```javascript
const response = await fetch('/api/faculty/qualifications');
const data = await response.json();
console.log(data.qualifications); // Array of all mappings
```

### Get Qualifications for Specific Faculty
```javascript
const response = await fetch(`/api/faculty/qualifications?faculty_id=${facultyId}`);
const data = await response.json();
console.log(data.qualifications); // This faculty's subjects
```

### Add Qualification
```javascript
const response = await fetch('/api/faculty/qualifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    faculty_id: 'uuid',
    subject_id: 'uuid',
    proficiency_level: 8,
    preference_score: 7,
    is_primary_teacher: true
  })
});
```

### Delete Qualification
```javascript
const response = await fetch(`/api/faculty/qualifications?id=${qualificationId}`, {
  method: 'DELETE'
});
```

## Summary

**What was created:**
1. ✅ API endpoint: `/api/faculty/qualifications` (GET, POST, DELETE)
2. ✅ UI page: `/faculty/qualifications` (full management interface)
3. ✅ SQL script: `database/setup-faculty-qualifications.sql` (automated setup)
4. ✅ Documentation: This guide

**Next steps:**
1. Run the SQL script to auto-assign faculty to subjects
2. OR use the UI to manually assign faculty
3. Verify all subjects have at least 1 qualified faculty
4. Test AI timetable generation again
5. Should now work without "no qualified faculty" conflicts! ✅

**Navigation:**
```
Dashboard → Qualifications (or go directly to /faculty/qualifications)
```
