# NEP Curriculum Builder - Quick Start Guide for Creators

## Access Instructions

### Step 1: Login as Creator Faculty
```
Email: creator@college.edu
Role: faculty
Faculty Type: creator
```

### Step 2: Navigate to Faculty Dashboard
- After login, you'll be redirected to `/faculty/dashboard`
- Look for the green **"NEP Curriculum Builder"** button

### Step 3: Click "NEP Curriculum Builder"
- First button in the action row (green color)
- Icon: Book/Library symbol

## Creating Elective Buckets

### Step 4: Select Filters
```
┌─────────────────────────────────────────────────────────┐
│  Select Course / Program     Your Department 🔒          │
│  ┌─────────────────────┐    ┌─────────────────────┐    │
│  │ ITEP ▼              │    │ Computer Science     │    │
│  └─────────────────────┘    └─────────────────────┘    │
│                              (Locked to your dept)      │
│  Select Semester                                         │
│  ┌─────────────────────┐                                │
│  │ Semester 3 ▼        │                                │
│  └─────────────────────┘                                │
└─────────────────────────────────────────────────────────┘

🔒 SECURITY: Department is locked to your assigned department.
You can only create buckets for your own department.
```

### Step 5: Create Bucket
```
┌─────────────────────────────────────────────────────────┐
│  Create New Bucket                                       │
│  ┌─────────────────────────────────────────────┐        │
│  │ Enter Bucket Name (e.g., "Major Pool")     │  [+]   │
│  └─────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

**Common Bucket Names:**
- "Major Pool" - For major subjects
- "Minor Pool" - For minor subjects
- "Open Elective" - For open elective choices
- "MDM (Multi-Disciplinary)" - For multi-disciplinary subjects
- "AEC Pool" - For Ability Enhancement Courses
- "VAC Pool" - For Value Added Courses

### Step 6: Drag & Drop Subjects
```
┌──────────────────────┐        ┌──────────────────────┐
│ Available Subjects   │   →    │ Major Pool          │
├──────────────────────┤        ├──────────────────────┤
│ ☰ Subject A (4cr)   │        │ ✓ Subject B (4cr)   │
│ ☰ Subject C (3cr)   │        │ ✓ Subject D (3cr)   │
│ ☰ Subject E (2cr)   │        │                      │
└──────────────────────┘        └──────────────────────┘
        Drag →                      Drop here
```

### Step 7: Configure Bucket Settings
```
┌─────────────────────────────────────────────────────────┐
│  Major Pool                                    [Delete] │
├─────────────────────────────────────────────────────────┤
│  ☑ Common Time Slot                                     │
│  (All subjects in this bucket run simultaneously)       │
│                                                          │
│  Min Selection: [1] ▼    Max Selection: [1] ▼          │
│  (Students must choose between 1-1 subjects)            │
└─────────────────────────────────────────────────────────┘
```

## What Happens Behind the Scenes

### Automatic Batch Creation
```
When you create a bucket, the system:

1. Checks if a batch exists for:
   - Your college
   - Selected course (ITEP)
   - Selected department (Computer Science)
   - Selected semester (3)

2. If NO batch exists:
   ✓ Creates new batch automatically
   ✓ Names it: "ITEP - Semester 3"
   ✓ Links to your department
   ✓ Sets semester to 3

3. If batch EXISTS:
   ✓ Uses existing batch
   ✓ Links bucket to this batch

4. Links bucket to batch via batch_id
```

### Database Relationships
```
College
  └─ Department (Computer Science)
      └─ Course (ITEP)
          └─ Batch (ITEP - Semester 3)
              └─ Elective Bucket (Major Pool)
                  ├─ Subject 1 (via course_group_id)
                  ├─ Subject 2 (via course_group_id)
                  └─ Subject 3 (via course_group_id)
```

## Example Workflow

### Scenario: Creating Major Pool for ITEP Semester 3

1. **Login** as Creator Faculty
2. **Navigate** to Faculty Dashboard
3. **Click** "NEP Curriculum Builder" (green button)
4. **Select**:
   - Course: "Integrated Teacher Education Programme (ITEP)"
   - Department: "Education (EDU)"
   - Semester: 3
5. **Create Bucket**: Enter "Major Pool" → Click [+]
6. **Drag Subjects**:
   - Drag "Educational Psychology (4 credits)"
   - Drag "Curriculum Development (3 credits)"
   - Drag "Teaching Methods (4 credits)"
7. **Configure**:
   - ☑ Common Time Slot: ON
   - Min Selection: 1
   - Max Selection: 1
8. **Save**: Auto-saved ✓

### Result
- Batch created: "ITEP - Semester 3" (if didn't exist)
- Bucket created: "Major Pool" linked to batch
- 3 subjects assigned to bucket
- Students can now choose 1 major from this pool

## Tips & Best Practices

### 1. Bucket Naming Convention
```
✓ Good: "Major Pool", "Minor Pool", "Open Elective"
✗ Bad: "Bucket 1", "xyz", "temp"
```

### 2. Subject Organization
```
Group subjects logically:
- Major Pool: Core major subjects
- Minor Pool: Supporting minor subjects
- Open Elective: Free choice subjects
- MDM: Cross-disciplinary subjects
```

### 3. Common Time Slot Usage
```
☑ Enable when: All subjects should run at same time
  (Students choose one, all happen simultaneously)

☐ Disable when: Subjects can run at different times
  (Students can take multiple from same bucket)
```

### 4. Selection Limits
```
Min=1, Max=1: Choose exactly 1 (typical for major/minor)
Min=0, Max=2: Optional, up to 2 choices
Min=1, Max=3: Mandatory, choose 1-3 subjects
```

## Security Features

### 🔒 Department-Level Access Control

**What it means:**
- You can ONLY create buckets for your assigned department
- Department dropdown is disabled (gray, cannot be changed)
- API validates all requests against your `users.department_id`

**Why it matters:**
- Prevents accidental cross-department bucket creation
- Ensures data integrity and department isolation
- Maintains proper curriculum ownership

**What happens if you try to bypass:**
```
❌ Attempt to access different department's subjects
   → 403 Forbidden (Access Denied)

❌ Attempt to create bucket for different department
   → 403 Forbidden (Access Denied)

❌ Manual API call with different departmentId
   → 403 Forbidden (Access Denied)
```

**Verification:**
```sql
-- Check your assigned department
SELECT email, department_id, faculty_type FROM users WHERE email = 'your@email.com';

-- Verify buckets you created
SELECT eb.bucket_name, b.department_id, d.name as dept_name
FROM elective_buckets eb
JOIN batches b ON eb.batch_id = b.id
JOIN departments d ON b.department_id = d.id
WHERE eb.created_at > NOW() - INTERVAL '7 days';
```

## Troubleshooting

### Problem: Department dropdown is disabled
**This is NORMAL**: For security, you can only manage your assigned department
- Check your user profile: `SELECT department_id FROM users WHERE email = 'your@email.com'`
- Only admins can assign you to a different department

### Problem: No subjects appearing
**Solution**: Check filters
- Is course selected correctly?
- Is your department correct (should be auto-selected)?
- Is semester correct?
- Are subjects created in database for this combination with your department_id?

### Problem: Cannot create bucket (403 Forbidden)
**Solution**: Check department ownership
- Are you trying to create bucket for your own department?
- Department dropdown shows your assigned department (cannot change)
- Contact admin if you need access to different department

### Problem: Subjects not saving to bucket
**Solution**: Check drag & drop
- Ensure you're dragging from left to right panel
- Wait for auto-save confirmation
- Check browser console for errors

## Support

For issues or questions:
1. Check browser console (F12) for errors
2. Verify user role: `faculty_type = 'creator'`
3. Verify database has subjects for selected filters
4. Contact system administrator

## Screenshots Reference

### Faculty Dashboard Button
```
┌────────────────────────────────────────────────────────┐
│  Welcome to Academic Compass                            │
├────────────────────────────────────────────────────────┤
│                                                          │
│  [📚 NEP Curriculum Builder]  [🤖 AI Timetable]       │
│  [⚡ Hybrid Scheduler]                                  │
│                                                          │
└────────────────────────────────────────────────────────┘
     Green Button - Click here!
```

### NEP Curriculum Builder Page
```
┌────────────────────────────────────────────────────────┐
│  ← Back to Faculty Dashboard                            │
│                                                          │
│  NEP 2020 Curriculum Builder                            │
│  Create elective buckets for Choice-Based Credit System │
├────────────────────────────────────────────────────────┤
│  Course: [ITEP ▼]  Department: [EDU ▼]  Sem: [3 ▼]   │
├────────────────────────────────────────────────────────┤
│  Available Subjects        │  Buckets                   │
│  ┌──────────────────────┐ │  ┌──────────────────────┐ │
│  │ ☰ Subject A         │ │  │ Major Pool          │ │
│  │ ☰ Subject B         │ │  │ ☑ Common Time Slot  │ │
│  │ ☰ Subject C         │ │  │ Min: 1  Max: 1      │ │
│  └──────────────────────┘ │  │ ✓ Subject D         │ │
│                            │  │ ✓ Subject E         │ │
│                            │  └──────────────────────┘ │
│                            │  [+ Create New Bucket]    │
└────────────────────────────────────────────────────────┘
```
