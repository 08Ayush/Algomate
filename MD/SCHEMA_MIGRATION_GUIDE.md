# Schema Migration Guide: B.Tech vs B.Ed Elective Buckets

## 📋 Executive Summary

**Current Situation**: You have two production branches with different schemas:
- **Branch: `paritosh_v1`** - B.Tech implementation using `old_schema.sql` (NO buckets)
- **Branch: `pari_nep`** - B.Ed implementation using `new_schema.sql` (WITH buckets)

**Goal**: Implement elective buckets functionality in B.Tech (paritosh_v1 branch)

**Recommendation**: ✅ **Use `new_schema.sql` as the base and merge it into paritosh_v1 branch**

---

## 🔍 Schema Comparison Analysis

### Key Differences Between Schemas

| Feature | old_schema.sql (B.Tech) | new_schema.sql (B.Ed) | Impact |
|---------|------------------------|----------------------|---------|
| **Elective Buckets** | ❌ NOT Present | ✅ Present | **CRITICAL** |
| **Student Selections** | ❌ NOT Present | ✅ Present | **CRITICAL** |
| **NEP Category ENUM** | ❌ NOT Present | ✅ Present | **HIGH** |
| **Faculty Designation ENUM** | ❌ NOT Present | ✅ Present | **MEDIUM** |
| **Courses Table** | ❌ NOT Present | ✅ Present | **HIGH** |
| **Subject NEP Fields** | ❌ Limited | ✅ Complete | **HIGH** |
| **Block Scheduling** | ❌ NOT Present | ✅ Present | **MEDIUM** |
| **Credit Calculation** | ❌ Manual | ✅ Auto-generated | **MEDIUM** |
| **Core Tables** | ✅ Same | ✅ Same | Identical |

---

## 📊 Detailed Feature Analysis

### 1. Elective Buckets System (NEW in new_schema.sql)

**Table**: `elective_buckets`

```sql
CREATE TABLE elective_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    bucket_name VARCHAR(255) NOT NULL,
    min_selection INTEGER DEFAULT 1,
    max_selection INTEGER DEFAULT 1,
    is_common_slot BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: 
- Groups elective subjects into "buckets" or "pools"
- Students must select from these pools (e.g., "Technical Electives Pool 1")
- Essential for **Choice-Based Credit System (CBCS)** in B.Tech

**B.Tech Use Cases**:
- ✅ Professional Electives (PE-I, PE-II, PE-III)
- ✅ Open Electives (OE)
- ✅ Technical Electives (TE)
- ✅ Minor specializations
- ✅ Interdisciplinary courses

**Why B.Tech Needs This**:
- AICTE mandates electives in B.Tech curriculum
- Students must choose 2-3 subjects from pools of 5-7 options
- Different sections may choose different electives
- Timetabling must accommodate multiple elective groups running simultaneously

---

### 2. Student Course Selections (NEW in new_schema.sql)

**Table**: `student_course_selections`

```sql
CREATE TABLE student_course_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    semester INT NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    selection_type VARCHAR(20) DEFAULT 'MAJOR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, subject_id, semester, academic_year)
);
```

**Purpose**:
- Tracks individual student elective selections
- Links students to their chosen subjects
- Enables personalized timetables

**B.Tech Use Cases**:
- ✅ Student selects "Machine Learning" from PE-I pool
- ✅ Student selects "Digital Marketing" from OE pool
- ✅ System generates personalized timetable based on selections
- ✅ Reports show elective enrollment distribution

**Why B.Tech Needs This**:
- Different students have different timetables based on elective choices
- System needs to track who selected what
- Enrollment limits per elective (e.g., max 60 students)
- Analytics on elective popularity

---

### 3. NEP Category ENUM (NEW in new_schema.sql)

**Definition**:
```sql
CREATE TYPE nep_category AS ENUM (
    'MAJOR',           -- Core subjects
    'MINOR',           -- Minor specialization
    'MULTIDISCIPLINARY', -- Interdisciplinary courses
    'AEC',             -- Ability Enhancement Course
    'VAC',             -- Value Added Course
    'CORE',            -- Mandatory core
    'PEDAGOGY',        -- Specific to B.Ed/ITEP
    'INTERNSHIP'       -- Block-out events
);
```

**B.Tech Mapping**:
- `MAJOR` → Core Engineering subjects
- `MINOR` → Optional minor specialization
- `MULTIDISCIPLINARY` → Open Electives (OE)
- `AEC` → Mandatory soft skills, communication
- `VAC` → Industry-oriented value-added courses
- `CORE` → Basic sciences, mathematics
- `INTERNSHIP` → Industrial training

**Why B.Tech Needs This**:
- NEP 2020 applies to B.Tech too (not just B.Ed)
- Categorization helps in credit calculations
- Required for NBA/NAAC accreditation
- Enables flexible curriculum design

---

### 4. Courses Table (NEW in new_schema.sql)

**Table**: `courses`

```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,         -- e.g., "B.Tech Computer Science"
    code VARCHAR(50) NOT NULL,           -- e.g., "BTCS"
    nature_of_course VARCHAR(50),        -- e.g., "UG"
    intake INTEGER DEFAULT 0,            -- e.g., 180
    duration_years INTEGER,              -- e.g., 4
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(college_id, code)
);
```

**B.Tech Use Cases**:
- ✅ B.Tech Computer Science & Engineering
- ✅ B.Tech Electronics & Communication
- ✅ B.Tech Mechanical Engineering
- ✅ B.Tech Civil Engineering
- ✅ Multiple batches per course (A, B, C sections)

**Why B.Tech Needs This**:
- Multi-department structure: Each B.Tech branch is effectively a course
- Different curricula for different branches
- Intake limits per branch
- Subjects linked to specific courses

---

### 5. Enhanced Subject Fields (NEW in new_schema.sql)

**Additional Fields**:
```sql
-- In subjects table
lecture_hours INTEGER DEFAULT 1,
tutorial_hours INTEGER DEFAULT 0,
practical_hours INTEGER DEFAULT 0,
credit_value NUMERIC(3,1) 
    GENERATED ALWAYS AS (lecture_hours + tutorial_hours + (practical_hours / 2.0)) STORED,
course_group_id UUID REFERENCES elective_buckets(id) ON DELETE SET NULL,
block_start_week INTEGER,
block_end_week INTEGER,
time_restriction VARCHAR(20),
is_special_event BOOLEAN DEFAULT FALSE,
```

**B.Tech Benefits**:
- ✅ Auto-calculates credits (L + T + P/2 formula)
- ✅ Links subjects to elective buckets
- ✅ Supports block scheduling (internships, projects)
- ✅ Time restrictions (labs must be in afternoon)

---

## 🎯 Recommendation: Use new_schema.sql

### ✅ Advantages of new_schema.sql

1. **Complete Elective System**
   - Elective buckets for student choice
   - Student selection tracking
   - Personalized timetables

2. **NEP 2020 Compliance**
   - Future-proof for accreditation
   - Supports credit-based system
   - Flexible curriculum design

3. **Better Organization**
   - Courses table separates programs
   - Clear subject categorization
   - Enhanced metadata

4. **Advanced Features**
   - Auto-calculated credits
   - Block scheduling support
   - Special event handling

5. **B.Ed + B.Tech Compatible**
   - Single schema for all programs
   - Unified codebase
   - Easier maintenance

---

### ❌ Why NOT old_schema.sql

1. **Missing Critical Features**
   - No elective buckets → Cannot implement student choice
   - No student selections → Cannot track preferences
   - No courses table → Mixing all programs

2. **Backward Compatibility Issues**
   - Would need major changes to add buckets
   - Breaking changes to existing B.Tech UI
   - Migration complexity increases

3. **Future Limitations**
   - Hard to add NEP features later
   - Inflexible for curriculum changes
   - Accreditation compliance issues

4. **Maintenance Burden**
   - Two separate schemas to maintain
   - Code divergence between branches
   - Duplicate bug fixes

---

## 🔄 Migration Strategy

### Phase 1: Preparation (Week 1)

**Step 1: Backup Current State**
```bash
# Backup paritosh_v1 branch (B.Tech)
git checkout paritosh_v1
git tag backup-paritosh-v1-before-merge
git push origin backup-paritosh-v1-before-merge
```

**Step 2: Analyze Code Differences**
```bash
# Compare branches
git checkout pari_nep
git diff paritosh_v1 -- src/
git diff paritosh_v1 -- database/
```

**Step 3: Document B.Tech-Specific Features**
- List all B.Tech-specific UI components
- Document B.Tech-specific API routes
- Note any hardcoded logic for B.Tech

---

### Phase 2: Schema Migration (Week 2)

**Step 1: Apply new_schema.sql to B.Tech Database**

```sql
-- 1. Export existing B.Tech data
-- Run this on your current B.Tech database
COPY colleges TO '/backup/colleges.csv' CSV HEADER;
COPY departments TO '/backup/departments.csv' CSV HEADER;
COPY users TO '/backup/users.csv' CSV HEADER;
COPY subjects TO '/backup/subjects.csv' CSV HEADER;
COPY batches TO '/backup/batches.csv' CSV HEADER;
-- ... export all tables with data

-- 2. Drop old database (CAUTION: Only after backup!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- 3. Apply new_schema.sql
\i database/new_schema.sql

-- 4. Migrate data with transformations
-- Import base data
COPY colleges FROM '/backup/colleges.csv' CSV HEADER;
COPY departments FROM '/backup/departments.csv' CSV HEADER;

-- Import users (no changes needed)
COPY users FROM '/backup/users.csv' CSV HEADER;

-- Create courses for B.Tech branches
INSERT INTO courses (college_id, title, code, nature_of_course, intake, duration_years)
SELECT 
    college_id,
    'B.Tech ' || name AS title,
    code AS code,
    'UG' AS nature_of_course,
    100 AS intake,
    4 AS duration_years
FROM departments
WHERE code IN ('CSE', 'ECE', 'ME', 'CE');

-- Import subjects with course_id mapping
INSERT INTO subjects (
    name, code, college_id, department_id, course_id,
    credits_per_week, semester, nep_category, subject_type,
    lecture_hours, tutorial_hours, practical_hours
)
SELECT 
    s.name,
    s.code,
    s.college_id,
    s.department_id,
    c.id AS course_id,  -- Map to course
    s.credits_per_week,
    s.semester,
    'CORE' AS nep_category,  -- Default for now
    s.subject_type,
    CASE 
        WHEN s.subject_type = 'THEORY' THEN s.credits_per_week
        WHEN s.subject_type = 'LAB' THEN 0
        ELSE 1
    END AS lecture_hours,
    0 AS tutorial_hours,
    CASE 
        WHEN s.subject_type = 'LAB' THEN s.credits_per_week * 2
        ELSE 0
    END AS practical_hours
FROM old_subjects s
JOIN courses c ON c.code = (SELECT code FROM departments WHERE id = s.department_id);

-- Import batches with course_id
INSERT INTO batches (
    name, college_id, department_id, course_id, semester, academic_year, expected_strength
)
SELECT 
    b.name,
    b.college_id,
    b.department_id,
    c.id AS course_id,
    b.semester,
    b.academic_year,
    b.expected_strength
FROM old_batches b
JOIN courses c ON c.code = (SELECT code FROM departments WHERE id = b.department_id);
```

---

### Phase 3: Create Elective Buckets (Week 3)

**Step 1: Identify B.Tech Electives**

For each semester with electives, create buckets:

```sql
-- Example: B.Tech CSE Semester 5 - Professional Elective I
INSERT INTO elective_buckets (batch_id, bucket_name, min_selection, max_selection, is_common_slot)
SELECT 
    b.id,
    'Professional Elective I (PE-I)' AS bucket_name,
    1 AS min_selection,
    1 AS max_selection,
    TRUE AS is_common_slot
FROM batches b
JOIN courses c ON b.course_id = c.id
WHERE c.code = 'BTCS' AND b.semester = 5;

-- Get the bucket ID
SET @pe1_bucket_id = (SELECT id FROM elective_buckets WHERE bucket_name = 'Professional Elective I (PE-I)' LIMIT 1);

-- Create elective subjects and link to bucket
INSERT INTO subjects (
    name, code, college_id, department_id, course_id,
    credits_per_week, semester, nep_category, subject_type,
    lecture_hours, tutorial_hours, practical_hours,
    course_group_id  -- Link to bucket
)
VALUES
    ('Machine Learning', 'CS501A', @college_id, @dept_id, @course_id, 4, 5, 'MAJOR', 'THEORY', 3, 1, 0, @pe1_bucket_id),
    ('Cloud Computing', 'CS501B', @college_id, @dept_id, @course_id, 4, 5, 'MAJOR', 'THEORY', 3, 1, 0, @pe1_bucket_id),
    ('Blockchain Technology', 'CS501C', @college_id, @dept_id, @course_id, 4, 5, 'MAJOR', 'THEORY', 3, 1, 0, @pe1_bucket_id),
    ('IoT Systems', 'CS501D', @college_id, @dept_id, @course_id, 4, 5, 'MAJOR', 'THEORY', 3, 1, 0, @pe1_bucket_id),
    ('Cyber Security', 'CS501E', @college_id, @dept_id, @course_id, 4, 5, 'MAJOR', 'THEORY', 3, 1, 0, @pe1_bucket_id);

-- Repeat for other elective pools: PE-II, PE-III, OE-I, OE-II
```

**Step 2: Create SQL Script for All B.Tech Electives**

Create a file: `database/btech_elective_buckets.sql`

```sql
-- Professional Elective I (Semester 5)
-- Professional Elective II (Semester 6)
-- Professional Elective III (Semester 7)
-- Open Elective I (Semester 5)
-- Open Elective II (Semester 6)

-- Repeat for each department: CSE, ECE, ME, CE
```

---

### Phase 4: UI & API Updates (Week 4-5)

**Step 1: Merge B.Ed Elective UI Components**

Files to merge from `pari_nep` branch:
```
src/components/nep/CurriculumBuilder.tsx
src/components/nep/ElectiveBucketManager.tsx (if exists)
src/app/api/nep/buckets/route.ts
src/app/api/nep/subjects/route.ts
src/app/student/dashboard/page.tsx (elective selection UI)
```

**Step 2: Update API Routes for B.Tech Context**

```typescript
// Example: Update subject creation API
// src/app/api/admin/subjects/route.ts

export async function POST(request: NextRequest) {
  const { 
    name, code, department_id, course_id, semester,
    lecture_hours, tutorial_hours, practical_hours,
    nep_category, course_group_id  // NEW: For electives
  } = await request.json();

  // Insert subject with bucket link
  const { data, error } = await supabase
    .from('subjects')
    .insert({
      name, code, department_id, course_id, semester,
      lecture_hours, tutorial_hours, practical_hours,
      nep_category: nep_category || 'CORE',
      course_group_id  // Links to elective bucket
    });
}
```

**Step 3: Create B.Tech-Specific Bucket UI**

```tsx
// src/app/admin/electives/page.tsx

export default function BTechElectivesPage() {
  return (
    <div>
      <h1>Manage B.Tech Electives</h1>
      
      {/* Semester selector */}
      <SemesterSelector />
      
      {/* Elective buckets for selected semester */}
      <ElectiveBucketsList>
        <BucketCard name="PE-I" subjects={5} />
        <BucketCard name="PE-II" subjects={6} />
        <BucketCard name="OE-I" subjects={4} />
      </ElectiveBucketsList>
      
      {/* Create new bucket */}
      <CreateBucketModal />
    </div>
  );
}
```

**Step 4: Student Elective Selection UI**

```tsx
// src/app/student/electives/page.tsx

export default function StudentElectiveSelection() {
  const [availableBuckets, setAvailableBuckets] = useState([]);
  const [selections, setSelections] = useState({});

  return (
    <div>
      <h1>Select Your Electives</h1>
      
      {availableBuckets.map(bucket => (
        <ElectiveBucketCard 
          key={bucket.id}
          bucket={bucket}
          onSelect={(subjectId) => handleSelection(bucket.id, subjectId)}
          selectedSubject={selections[bucket.id]}
        />
      ))}
      
      <button onClick={submitSelections}>
        Submit Selections
      </button>
    </div>
  );
}
```

---

### Phase 5: Testing & Validation (Week 6)

**Test Scenarios**:

1. **Admin Tests**
   - ✅ Create elective bucket
   - ✅ Add subjects to bucket
   - ✅ Set min/max selection rules
   - ✅ View bucket enrollment

2. **Student Tests**
   - ✅ View available electives
   - ✅ Select subjects from buckets
   - ✅ Validation: Cannot select more than max
   - ✅ Validation: Must select at least min
   - ✅ Save selections

3. **Timetable Tests**
   - ✅ Generate timetable with electives
   - ✅ Multiple elective groups run simultaneously
   - ✅ Students see only their selected electives
   - ✅ Faculty assigned to multiple elective sections

4. **Reports Tests**
   - ✅ Enrollment report per elective
   - ✅ Student-wise elective list
   - ✅ Faculty workload with electives

---

## 🚀 Quick Start Guide

### Option 1: Fresh Start (Recommended)

```bash
# 1. Clone pari_nep branch as base
git checkout pari_nep
git checkout -b btech-with-buckets

# 2. Apply new_schema.sql to fresh database
psql -U postgres -d academic_compass_btech < database/new_schema.sql

# 3. Import B.Tech data
psql -U postgres -d academic_compass_btech < database/btech_data_migration.sql

# 4. Create B.Tech elective buckets
psql -U postgres -d academic_compass_btech < database/btech_elective_buckets.sql

# 5. Test UI
npm run dev
```

---

### Option 2: Merge Approach (Complex)

```bash
# 1. Backup current B.Tech
git checkout paritosh_v1
git tag backup-paritosh-v1

# 2. Merge pari_nep into paritosh_v1
git merge pari_nep

# 3. Resolve conflicts (UI, routes, components)
# This will be manual and time-consuming

# 4. Update database
# Apply schema migration scripts

# 5. Test thoroughly
```

---

## 📋 Migration Checklist

### Database Migration
- [ ] Backup existing B.Tech database
- [ ] Export all data as CSV/SQL
- [ ] Apply new_schema.sql to fresh database
- [ ] Create courses table entries for B.Tech branches
- [ ] Migrate subjects with course_id mapping
- [ ] Migrate batches with course_id mapping
- [ ] Create elective buckets for all semesters
- [ ] Link elective subjects to buckets
- [ ] Verify foreign key constraints
- [ ] Test data integrity

### Code Migration
- [ ] Merge elective bucket UI components
- [ ] Update subject creation API
- [ ] Update batch creation API
- [ ] Add elective selection API
- [ ] Add student selection tracking
- [ ] Update timetable generation logic
- [ ] Update dashboard to show elective info
- [ ] Add elective enrollment reports

### UI Updates
- [ ] Admin: Create elective buckets
- [ ] Admin: Assign subjects to buckets
- [ ] Admin: View enrollment per elective
- [ ] Student: View available electives
- [ ] Student: Select from buckets
- [ ] Student: See selection status
- [ ] Faculty: View elective assignments
- [ ] Publisher: Handle elective timetables

### Testing
- [ ] Unit tests for bucket logic
- [ ] Integration tests for elective flow
- [ ] E2E test: Student selects electives
- [ ] E2E test: Admin creates bucket
- [ ] E2E test: Timetable with electives
- [ ] Load test: 500 students select simultaneously
- [ ] Data migration validation

---

## 🎓 B.Tech Elective Structure Example

### Typical B.Tech CSE Curriculum with Electives

**Semester 5**:
- Core Subjects: Operating Systems, DBMS, Computer Networks (mandatory)
- Professional Elective I (PE-I): Choose 1 from 5 options
- Open Elective I (OE-I): Choose 1 from 4 options (any department)

**Semester 6**:
- Core Subjects: Software Engineering, Compiler Design
- Professional Elective II (PE-II): Choose 1 from 6 options
- Open Elective II (OE-II): Choose 1 from 5 options

**Semester 7**:
- Professional Elective III (PE-III): Choose 2 from 8 options
- Major Project (mandatory)

**Semester 8**:
- Internship / Dissertation (mandatory)

### Bucket Configuration

```sql
-- PE-I Bucket (Semester 5)
Bucket: "Professional Elective I"
min_selection: 1
max_selection: 1
is_common_slot: TRUE (all run at same time, e.g., Monday 11:00-12:00)

Subjects:
- Machine Learning
- Cloud Computing
- Blockchain Technology
- IoT Systems
- Cyber Security

-- OE-I Bucket (Semester 5)
Bucket: "Open Elective I"
min_selection: 1
max_selection: 1
is_common_slot: TRUE

Subjects:
- Digital Marketing
- Environmental Science
- Financial Management
- Intellectual Property Rights
```

---

## ⚠️ Critical Warnings

### DO NOT:
1. ❌ Delete paritosh_v1 branch without backup
2. ❌ Apply new schema without data export
3. ❌ Merge branches without conflict resolution plan
4. ❌ Test on production database
5. ❌ Skip data validation after migration

### DO:
1. ✅ Create full database backup before any changes
2. ✅ Test migration on development environment first
3. ✅ Document all custom changes made to old_schema
4. ✅ Create rollback plan
5. ✅ Run migration in maintenance window

---

## 🔧 Troubleshooting

### Issue 1: Foreign Key Conflicts
**Problem**: Cannot migrate data due to missing course_id

**Solution**:
```sql
-- First create courses, then subjects
INSERT INTO courses (...) VALUES (...);
INSERT INTO subjects (course_id, ...) VALUES (...);
```

### Issue 2: UI Conflicts After Merge
**Problem**: Components reference non-existent fields

**Solution**:
```typescript
// Update component to handle both schemas
const courseId = subject.course_id || null;  // Fallback
const nepCategory = subject.nep_category || 'CORE';  // Default
```

### Issue 3: Elective Timetable Generation Fails
**Problem**: Algorithm doesn't handle elective buckets

**Solution**:
- Update Python scheduler to detect `is_common_slot = TRUE`
- Schedule all subjects in bucket at same time
- Different sections get different subjects

---

## 📞 Support Resources

### Documentation
- NEP 2020 Implementation Guide: `md/NEP_2020_IMPLEMENTATION.md`
- Database Schema Documentation: `md/DATABASE_SCHEMA.md`
- API Documentation: `md/API_DOCUMENTATION.md`

### Code References
- Elective UI Component: `src/components/nep/CurriculumBuilder.tsx`
- Bucket API: `src/app/api/nep/buckets/route.ts`
- Student Selection: `src/app/api/student/selections/route.ts`

---

## ✅ Final Recommendation

**Use `new_schema.sql` from `pari_nep` branch as your base schema.**

**Reasons**:
1. ✅ Complete elective bucket system (required for B.Tech)
2. ✅ Student selection tracking (essential)
3. ✅ NEP 2020 compliance (future-proof)
4. ✅ Better organized (courses, categories)
5. ✅ Supports both B.Tech and B.Ed
6. ✅ Already tested in production (B.Ed)

**Migration Timeline**: 6 weeks
- Week 1: Preparation & backup
- Week 2: Database migration
- Week 3: Elective buckets setup
- Week 4-5: UI & API updates
- Week 6: Testing & validation

**Risk Level**: Medium (manageable with proper testing)

---

## 🎯 Next Steps

1. **Immediate** (This Week):
   - [ ] Create full backup of paritosh_v1 branch
   - [ ] Export B.Tech database to SQL/CSV
   - [ ] Review this guide with team

2. **Short Term** (Next 2 Weeks):
   - [ ] Set up development environment with new_schema
   - [ ] Test data migration scripts
   - [ ] Identify UI merge conflicts

3. **Medium Term** (Next Month):
   - [ ] Execute migration on staging environment
   - [ ] Train admin users on elective management
   - [ ] Conduct thorough testing

4. **Long Term** (Next Quarter):
   - [ ] Production deployment
   - [ ] Monitor system performance
   - [ ] Gather user feedback

---

**Document Version**: 1.0  
**Last Updated**: December 8, 2025  
**Author**: Migration Analysis Team  
**Status**: ✅ Ready for Review & Implementation
