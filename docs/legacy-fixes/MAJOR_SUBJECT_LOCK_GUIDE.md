# MAJOR Subject Lock Implementation Guide

## Overview
This implementation enforces a **hard constraint** that once a student selects a MAJOR subject in **Semester 3**, they **CANNOT change** it in any subsequent semesters. The system automatically maps progression of subjects within the same domain.

**MINOR subjects remain flexible** - students can change them in any semester.

---

## 🎯 Key Features

### 1. **MAJOR Lock from Semester 3**
- Once a student selects a MAJOR subject in Semester 3, it becomes **permanently locked**
- All future semester MAJOR subjects must be from the **same domain/track**
- Student cannot switch to a different MAJOR domain in Semesters 4, 5, 6, 7, or 8

### 2. **Domain-Based Progression**
- Subjects are organized by `subject_domain` (e.g., "Computer Vision", "Network Security", "AI/ML")
- Each domain has a progression sequence across semesters
- System automatically suggests next-level subjects in the same domain

### 3. **MINOR Flexibility**
- MINOR subjects can be changed in **any semester**
- No lock applies to MINOR selections
- Students have complete freedom to explore different MINORs

### 4. **Visual Indicators**
- Locked MAJOR subjects show 🔒 icon
- Continuation subjects show ↗️ arrow
- MINOR subjects show ♻️ changeable icon

---

## 📋 Database Changes

### New Columns in `student_course_selections`

```sql
selection_type VARCHAR(20)  -- 'MAJOR', 'MINOR', 'ELECTIVE', 'CORE'
is_locked BOOLEAN           -- TRUE for locked MAJORs
locked_at TIMESTAMPTZ       -- When the MAJOR was locked
continuation_of UUID        -- Links to previous semester's selection
```

### New Columns in `subjects`

```sql
subject_domain VARCHAR(100)      -- Domain/Track name (e.g., "Computer Vision")
domain_sequence INTEGER          -- Sequence in progression (3,4,5,6,7,8)
prerequisite_subject_id UUID     -- Previous semester subject in same domain
```

---

## 🚀 Setup Instructions

### Step 1: Run the Migration Script

```bash
# Connect to your Supabase database and run:
psql -h <your-db-host> -U postgres -d postgres -f database/major_subject_lock_constraint.sql
```

Or in Supabase Dashboard → SQL Editor:
1. Copy contents of `database/major_subject_lock_constraint.sql`
2. Paste and execute

### Step 2: Update Subject Domains

You need to populate the `subject_domain` field for your subjects. Example:

```sql
-- Semester 3 subjects
UPDATE subjects SET subject_domain = 'Computer Vision', domain_sequence = 3 
WHERE code = '2SCE303T' AND name = 'Computer Vision';

UPDATE subjects SET subject_domain = 'Computer Architecture', domain_sequence = 3 
WHERE code = '2SCE304T' AND name = 'Computer Architecture';

-- Semester 4 subjects (continuations)
UPDATE subjects SET 
  subject_domain = 'Computer Vision', 
  domain_sequence = 4,
  prerequisite_subject_id = (SELECT id FROM subjects WHERE code = '2SCE303T')
WHERE code = '2SCE407T' AND name = 'Advanced computer vision';

UPDATE subjects SET 
  subject_domain = 'Computer Architecture', 
  domain_sequence = 4,
  prerequisite_subject_id = (SELECT id FROM subjects WHERE code = '2SCE304T')
WHERE code = '2SCE408T' AND name = 'Advanced Computer Architecture';

-- Repeat for semesters 5, 6, 7, 8...
```

### Step 3: Update API Integration

The API has been updated with new endpoints:

**1. Get Available Subjects (with lock filtering)**
```
GET /api/student/available-subjects?studentId={id}&semester={sem}
```

**2. Add Subject Selection (enforces lock)**
```
POST /api/student/selections
Body: {
  student_id, subject_id, semester, academic_year
}
```

**3. Delete Subject Selection (prevents locked deletion)**
```
DELETE /api/student/selections
Body: { student_id, subject_id }
```

---

## 🎨 Frontend Integration Guide

### Example: Display Available Subjects

```typescript
// Fetch subjects for student
const response = await fetch(
  `/api/student/available-subjects?studentId=${studentId}&semester=4`
);
const { subjects, locked_major } = await response.json();

// Display locked MAJOR info
{locked_major && (
  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
    <p className="font-semibold">🔒 Your MAJOR is locked</p>
    <p>Domain: {locked_major.domain}</p>
    <p>Locked since Semester {locked_major.locked_semester}</p>
  </div>
)}

// Display subjects
{subjects.map(subject => (
  <div key={subject.id} className={subject.is_selectable ? '' : 'opacity-50'}>
    <h3>{subject.name}</h3>
    
    {subject.selection_type === 'MAJOR' && subject.is_priority && (
      <span className="text-green-600">↗️ Continuation</span>
    )}
    
    {!subject.is_selectable && (
      <span className="text-red-600">❌ Not available</span>
    )}
    
    <p className="text-sm text-gray-600">{subject.reason}</p>
    
    <button 
      disabled={!subject.is_selectable}
      onClick={() => selectSubject(subject.id)}
    >
      Select
    </button>
  </div>
))}
```

### Example: Handle Selection with Lock Warning

```typescript
const selectSubject = async (subjectId: string) => {
  try {
    const response = await fetch('/api/student/selections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        subject_id: subjectId,
        semester: currentSemester,
        academic_year: '2024-25'
      })
    });

    const data = await response.json();
    
    if (data.is_locked && data.selection_type === 'MAJOR') {
      alert(`⚠️ This MAJOR subject is now LOCKED. You must continue with this domain in all future semesters.`);
    }
    
    if (!response.ok) {
      throw new Error(data.error);
    }
    
    // Success
    toast.success(data.message);
    
  } catch (error) {
    toast.error(error.message);
  }
};
```

---

## 🔍 Database Functions

### Get Available Subjects for Student

```sql
SELECT * FROM get_available_subjects_for_student(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,  -- student_id
  4,                                              -- semester
  '2024-25'                                       -- academic_year
);
```

Returns:
- `subject_id`, `subject_code`, `subject_name`
- `is_selectable` - TRUE if student can select it
- `selection_type` - 'MAJOR', 'MINOR', 'ELECTIVE', 'CORE'
- `reason` - Explanation why selectable/not selectable

### Check if Can Delete Selection

```sql
SELECT * FROM can_student_delete_selection(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,  -- student_id
  '987fcdeb-51a2-43f7-b8d9-123456789abc'::UUID   -- subject_id
);
```

Returns:
- `can_delete` - TRUE/FALSE
- `reason` - Explanation

### View Student's MAJOR Progression

```sql
SELECT * FROM student_major_progression
WHERE student_id = '123e4567-e89b-12d3-a456-426614174000'::UUID;
```

Shows complete MAJOR progression with lock status.

---

## 📊 Example Domain Setup

### Computer Science Department - Semester 3 to 8 Progression

#### **Computer Vision Track**
- Sem 3: Computer Vision (2SCE303T)
- Sem 4: Advanced Computer Vision (2SCE407T)
- Sem 5: Deep Learning (2SCE508T)
- Sem 6: Medical Image Analysis (2SCE6xxT)
- Sem 7: 3D Vision (2SCE7xxT)
- Sem 8: Vision Capstone (2SCE8xxT)

#### **Network Security Track**
- Sem 3: Computer Architecture (2SCE304T)
- Sem 4: Advanced Computer Architecture (2SCE408T)
- Sem 5: Advanced Computer Network (2SCE509T)
- Sem 6: Cloud Security (2SCE6xxT)
- Sem 7: Penetration Testing (2SCE7xxT)
- Sem 8: Security Capstone (2SCE8xxT)

SQL to set this up:

```sql
-- Computer Vision Track
UPDATE subjects SET subject_domain = 'Computer Vision', domain_sequence = 3 WHERE code = '2SCE303T';
UPDATE subjects SET subject_domain = 'Computer Vision', domain_sequence = 4 WHERE code = '2SCE407T';
UPDATE subjects SET subject_domain = 'Computer Vision', domain_sequence = 5 WHERE code = '2SCE508T';

-- Network Security Track
UPDATE subjects SET subject_domain = 'Network Security', domain_sequence = 3 WHERE code = '2SCE304T';
UPDATE subjects SET subject_domain = 'Network Security', domain_sequence = 4 WHERE code = '2SCE408T';
UPDATE subjects SET subject_domain = 'Network Security', domain_sequence = 5 WHERE code = '2SCE509T';
```

---

## ⚠️ Important Constraints

### MAJOR Lock Rules
1. ✅ Student can select any MAJOR in Semester 3
2. 🔒 Once selected in Sem 3, it's **locked forever**
3. ❌ Cannot change to different domain in Sem 4+
4. ✅ Must continue with same domain subjects
5. ❌ Cannot delete locked MAJOR selections

### MINOR Freedom Rules
1. ✅ Can select any MINOR in any semester
2. ♻️ Can change MINOR every semester if desired
3. ✅ Can delete MINOR selections anytime
4. 🔓 No lock applies to MINORs

---

## 🧪 Testing Scenarios

### Scenario 1: First-time MAJOR Selection (Sem 3)
```
1. Student enters Semester 3
2. Views available subjects
3. Selects "Computer Vision" (MAJOR)
4. ✅ Selection succeeds
5. 🔒 Subject is marked as locked
6. Alert: "This MAJOR is now locked"
```

### Scenario 2: Continuation in Same Domain (Sem 4)
```
1. Student (with locked CV major) enters Semester 4
2. Views available subjects
3. "Advanced Computer Vision" shows: ↗️ Continuation
4. Other MAJOR domains show: ❌ Not available
5. Selects "Advanced Computer Vision"
6. ✅ Selection succeeds
```

### Scenario 3: Attempt to Change MAJOR (Sem 4) - BLOCKED
```
1. Student (with locked CV major) tries to select "Network Security"
2. ❌ API returns 403 error
3. Error: "Cannot change MAJOR. You selected Computer Vision in Semester 3"
4. Selection is prevented
```

### Scenario 4: MINOR Flexibility (Any Semester)
```
1. Student selects "Data Analytics" (MINOR) in Sem 4
2. In Sem 5, changes mind
3. Deletes "Data Analytics"
4. ✅ Deletion succeeds
5. Selects "Business Management" (MINOR)
6. ✅ Selection succeeds
```

---

## 🔧 Troubleshooting

### Issue: Student can't select any MAJOR subjects

**Solution:** Check if they already have a locked MAJOR
```sql
SELECT * FROM student_course_selections
WHERE student_id = '<student-id>'
  AND selection_type = 'MAJOR'
  AND is_locked = TRUE;
```

### Issue: Domain progression not working

**Solution:** Verify `subject_domain` is set
```sql
SELECT code, name, subject_domain, domain_sequence, semester
FROM subjects
WHERE nep_category IN ('MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR')
ORDER BY semester, subject_domain;
```

### Issue: Trigger not firing

**Solution:** Check trigger exists
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('enforce_major_lock', 'prevent_major_deletion');
```

---

## 📝 API Response Examples

### Available Subjects Response
```json
{
  "subjects": [
    {
      "id": "abc-123",
      "code": "2SCE407T",
      "name": "Advanced computer vision",
      "subject_domain": "Computer Vision",
      "nep_category": "MAJOR",
      "is_selectable": true,
      "selection_type": "MAJOR",
      "reason": "Continuation of your MAJOR in Computer Vision",
      "is_priority": true
    },
    {
      "id": "def-456",
      "code": "2SCE408T",
      "name": "Advanced Computer Architecture",
      "subject_domain": "Network Security",
      "nep_category": "MAJOR",
      "is_selectable": false,
      "selection_type": "MAJOR",
      "reason": "Cannot select. You have a locked MAJOR in Computer Vision domain",
      "is_priority": false
    }
  ],
  "locked_major": {
    "domain": "Computer Vision",
    "locked_semester": 3,
    "locked_at": "2024-08-15T10:30:00Z",
    "subject_name": "Computer Vision"
  },
  "count": 10,
  "selectable_count": 5
}
```

### Error Response (Attempt to Change MAJOR)
```json
{
  "error": "Cannot change MAJOR subject. You selected a MAJOR in Semester 3 from Computer Vision domain. You must continue with subjects from the same domain.",
  "locked_domain": "Computer Vision",
  "locked_semester": 3
}
```

---

## ✅ Checklist for Implementation

- [ ] Run migration SQL script
- [ ] Populate `subject_domain` for all MAJOR subjects
- [ ] Set `domain_sequence` for progression (3-8)
- [ ] Link `prerequisite_subject_id` for continuations
- [ ] Test MAJOR lock in Semester 3
- [ ] Test domain continuation in Semester 4+
- [ ] Test MINOR flexibility
- [ ] Update frontend to show lock status
- [ ] Add warning alerts for MAJOR lock
- [ ] Test deletion prevention for locked MAJORs
- [ ] Verify triggers are working

---

## 🎓 Summary

This implementation provides:
- ✅ **Hard constraint** preventing MAJOR changes after Semester 3
- ✅ **Domain-based progression** ensuring students continue in their chosen track
- ✅ **MINOR flexibility** allowing exploration across semesters
- ✅ **Database-level enforcement** via triggers (cannot be bypassed)
- ✅ **API-level validation** with clear error messages
- ✅ **Frontend guidance** showing available/locked options

Students get clarity on their academic path while maintaining flexibility where it matters (MINORs and electives).
