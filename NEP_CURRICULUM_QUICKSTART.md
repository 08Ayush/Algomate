# NEP Curriculum Builder - Quick Start Guide

## 🚀 Quick Deployment (5 Steps)

### Step 1: Run Database Migration (2 minutes)

```sql
-- In Supabase SQL Editor, run:
-- File: database/nep_curriculum_migration.sql

-- Or manually execute:
ALTER TABLE elective_buckets 
ADD COLUMN college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
ADD COLUMN course VARCHAR(50),
ADD COLUMN semester INTEGER CHECK (semester BETWEEN 1 AND 8);

ALTER TABLE elective_buckets ALTER COLUMN batch_id DROP NOT NULL;

ALTER TABLE subjects ADD COLUMN program VARCHAR(50);
```

### Step 2: Tag Subjects with Programs (1 minute)

```sql
-- ITEP subjects
UPDATE subjects SET program = 'ITEP' 
WHERE code LIKE 'ITEP%' OR name LIKE '%ITEP%' OR name LIKE '%Integrated Teacher%';

-- B.Ed subjects  
UPDATE subjects SET program = 'B.Ed'
WHERE code LIKE 'BED%' OR name LIKE '%B.Ed%' OR name LIKE '%Bachelor of Education%';

-- M.Ed subjects
UPDATE subjects SET program = 'M.Ed'
WHERE code LIKE 'MED%' OR name LIKE '%M.Ed%' OR name LIKE '%Master of Education%';
```

### Step 3: Create College Admin User (1 minute)

```sql
-- Check if college admin exists
SELECT id, email, role FROM users WHERE role = 'college_admin';

-- Create college admin from existing user
UPDATE users 
SET role = 'college_admin'
WHERE email = 'your-admin@college.edu';

-- OR create new college admin
INSERT INTO users (
  first_name, last_name, email, password_hash, 
  college_id, role, is_active
) VALUES (
  'Admin', 'User', 'admin@college.edu', 'hashed-password',
  'your-college-uuid', 'college_admin', true
);
```

### Step 4: Test the Application (2 minutes)

```bash
# 1. Start dev server
npm run dev

# 2. Login as college admin
http://localhost:3000/login

# 3. Navigate to curriculum builder
http://localhost:3000/nep-curriculum

# 4. Test workflow:
- Select "ITEP" course
- Select "Semester 1"
- Click "Create Bucket" → Enter "Major Pool"
- Drag 2-3 subjects into the bucket
- Click "Save Curriculum"
```

### Step 5: Verify in Database (1 minute)

```sql
-- Check buckets created
SELECT * FROM elective_buckets 
WHERE course = 'ITEP' AND semester = 1;

-- Check subjects assigned to buckets
SELECT s.code, s.name, eb.bucket_name 
FROM subjects s
JOIN elective_buckets eb ON s.course_group_id = eb.id
WHERE eb.course = 'ITEP' AND eb.semester = 1;
```

---

## 📝 Common Operations

### Create Curriculum for B.Ed Semester 1

1. Login as College Admin
2. Select **B.Ed** → **Semester 1**
3. Create buckets:
   - "Foundation Courses"
   - "Pedagogy Major Pool"
   - "Pedagogy Minor Pool"
4. Drag subjects into appropriate buckets
5. Set **Common Time Slot = ON** for major/minor pools
6. Set **Min = 1, Max = 1** for elective pools
7. Save

### Create Curriculum for ITEP Semester 3

1. Login as College Admin
2. Select **ITEP** → **Semester 3**
3. Create buckets:
   - "Major Subject Pool" (students choose 1)
   - "Minor Subject Pool" (students choose 1)
   - "Core Courses" (all mandatory)
4. Configure bucket settings
5. Save

---

## 🔧 Troubleshooting (Quick Fixes)

### "Access Denied" Error

```sql
-- Fix: Update user role
UPDATE users 
SET role = 'college_admin'
WHERE email = 'your-email@college.edu';
```

### No Subjects Showing

```sql
-- Fix 1: Add semester data
UPDATE subjects 
SET semester = 1 
WHERE code LIKE 'SEM1%' OR name LIKE '%Semester 1%';

-- Fix 2: Tag with program
UPDATE subjects 
SET program = 'ITEP' 
WHERE code LIKE 'ITEP%';
```

### Cannot Save Curriculum

```bash
# Fix: Check browser console (F12)
# Common issues:
1. User doesn't have college_id assigned
2. Subjects don't have semester field populated
3. Database migration didn't run

# Solution:
SELECT id, college_id FROM users WHERE email = 'admin@college.edu';
-- If college_id is NULL:
UPDATE users SET college_id = 'your-college-uuid' WHERE email = 'admin@college.edu';
```

---

## 📊 Sample Curriculum Data

### ITEP Semester 1 Example

```sql
-- Insert sample elective bucket
INSERT INTO elective_buckets (
  college_id, course, semester, bucket_name, 
  is_common_slot, min_selection, max_selection
) VALUES (
  'your-college-uuid', 'ITEP', 1, 'Major Subject Pool',
  true, 1, 1
);

-- Assign subjects to bucket (update after bucket created)
UPDATE subjects 
SET course_group_id = 'bucket-uuid-from-above'
WHERE code IN ('ITEP101', 'ITEP102', 'ITEP103');
```

### B.Ed Semester 2 Example

```sql
INSERT INTO elective_buckets (
  college_id, course, semester, bucket_name,
  is_common_slot, min_selection, max_selection
) VALUES 
  ('your-college-uuid', 'B.Ed', 2, 'Pedagogy of Science', true, 1, 1),
  ('your-college-uuid', 'B.Ed', 2, 'Pedagogy of Arts', true, 1, 1),
  ('your-college-uuid', 'B.Ed', 2, 'Core Teaching Practice', false, 0, 0);
```

---

## 🎯 Key Features Recap

✅ **Role-Based**: Only College Admins can access  
✅ **Course Selection**: ITEP, B.Ed, M.Ed  
✅ **Semester-Based**: Subjects filtered by semester  
✅ **College Isolation**: Data isolated per college  
✅ **Drag & Drop**: Easy subject assignment  
✅ **NEP 2020**: Fully aligned with NEP guidelines  

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `NEP_CURRICULUM_IMPLEMENTATION_SUMMARY.md` | Complete technical summary |
| `NEP_CURRICULUM_COLLEGE_ADMIN.md` | Detailed user guide |
| `NEP_CURRICULUM_QUICKSTART.md` | This quick start guide |
| `database/nep_curriculum_migration.sql` | Database migration script |

---

## ✅ Deployment Checklist

- [ ] Database migration executed
- [ ] Subjects tagged with programs (ITEP/B.Ed/M.Ed)
- [ ] Subjects have semester field populated
- [ ] At least one college_admin user exists
- [ ] College admin has college_id assigned
- [ ] Test curriculum creation works
- [ ] Test subject filtering works
- [ ] Test bucket creation and saving works
- [ ] Verify college data isolation
- [ ] Production deployment successful

---

## 🎓 Support

**Documentation**: See `NEP_CURRICULUM_COLLEGE_ADMIN.md`  
**Migration Script**: See `database/nep_curriculum_migration.sql`  
**Implementation Summary**: See `NEP_CURRICULUM_IMPLEMENTATION_SUMMARY.md`

---

**Last Updated**: November 29, 2025  
**Version**: 1.0  
**Status**: ✅ Production Ready
