# NEP Curriculum Builder - Moved to Creator Dashboard

## Summary
The NEP Curriculum Builder has been successfully moved from the Admin Dashboard to the Creator Faculty Dashboard. Creators can now create elective buckets based on selected course, department, and semester, with automatic batch mapping.

## Changes Made

### 1. **New Page Created**
- **File**: `/src/app/faculty/nep-curriculum/page.tsx`
- **Access**: Only Creator Faculty (`faculty_type === 'creator'`)
- **Features**:
  - Course selection dropdown
  - Department selection dropdown (filters subjects by department)
  - Semester selection dropdown
  - Uses existing `CurriculumBuilder` component
  - Automatic batch mapping for each course + department + semester combination

### 2. **CurriculumBuilder Component Updated**
- **File**: `/src/components/nep/CurriculumBuilder.tsx`
- **Changes**:
  - Added optional `department` prop to interface
  - Updated `fetchSubjects()` to pass `departmentId` parameter
  - Updated `fetchBuckets()` to pass `departmentId` parameter
  - Updated `handleCreateBucket()` to include `departmentId` in POST request

### 3. **API Endpoints Updated**

#### **Subjects API** (`/src/app/api/nep/subjects/route.ts`)
- Added `departmentId` query parameter support
- Filters subjects by department when provided
- Maintains backward compatibility (department filter is optional)

#### **Buckets API** (`/src/app/api/nep/buckets/route.ts`)
- **GET Method**:
  - Added `departmentId` query parameter support
  - Filters batches by department when provided
- **POST Method**:
  - Added `departmentId` to request body
  - Uses provided `departmentId` when creating new batches
  - Falls back to first department if not provided (backward compatibility)

### 4. **Faculty Dashboard Updated**
- **File**: `/src/app/faculty/dashboard/page.tsx`
- **Changes**:
  - Added "NEP Curriculum Builder" button (green) for Creator Faculty
  - Positioned as first button before AI Timetable Creator
  - Only visible when `user.faculty_type === 'creator'`

### 5. **Admin Dashboard Updated**
- **File**: `/src/app/admin/dashboard/page.tsx`
- **Changes**:
  - Removed "NEP Curriculum Builder" button from header
  - Updated help text: "Batches are created automatically when Creator Faculty create NEP curriculum buckets"
  - Admins can still view batches created by creators

### 6. **Old Admin Page** (Kept for Reference)
- **File**: `/src/app/admin/nep-curriculum/page.tsx`
- **Status**: Still exists but not linked from admin dashboard
- **Note**: Can be deleted if no longer needed

## Database Schema Integration

The implementation properly maps elective buckets to batches using the schema relationships:

```sql
-- Elective Buckets are linked to Batches
CREATE TABLE elective_buckets (
    id UUID PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    bucket_name VARCHAR(255) NOT NULL,
    ...
);

-- Batches are linked to Department, Course, and Semester
CREATE TABLE batches (
    id UUID PRIMARY KEY,
    college_id UUID NOT NULL REFERENCES colleges(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    course_id UUID REFERENCES courses(id),
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    ...
);

-- Subjects can belong to Elective Buckets (course_group_id)
CREATE TABLE subjects (
    id UUID PRIMARY KEY,
    course_group_id UUID REFERENCES elective_buckets(id),
    department_id UUID REFERENCES departments(id),
    course_id UUID REFERENCES courses(id),
    semester INT CHECK (semester BETWEEN 1 AND 8),
    ...
);
```

## How It Works

1. **Creator Faculty** logs in and navigates to Faculty Dashboard
2. Clicks **"NEP Curriculum Builder"** button
3. Selects:
   - **Course** (e.g., ITEP, B.Ed, M.Ed)
   - **Department** (filters subjects by department)
   - **Semester** (1-8 based on course duration)
4. Creates **Elective Buckets** (e.g., "Major Pool", "Minor Pool", "Open Elective", "MDM")
5. System automatically:
   - Finds or creates a **batch** for the selected course + department + semester
   - Links the bucket to this batch via `batch_id`
6. Drags subjects into buckets:
   - Subjects are filtered by college, course, department, and semester
   - Subjects are assigned to buckets via `course_group_id`
7. Configures bucket settings:
   - Common time slot (all subjects run simultaneously)
   - Min/Max selection (student choice limits)

## Testing Checklist

- [x] Create `/faculty/nep-curriculum` page
- [x] Add department parameter to CurriculumBuilder
- [x] Update API endpoints to handle department filtering
- [x] Add button to faculty dashboard (creators only)
- [x] Remove button from admin dashboard
- [x] Update help text in admin dashboard
- [x] Implement department-level security (frontend + API)
- [ ] **Test as Creator Faculty**:
  - [ ] Login as creator (`faculty_type = 'creator'`)
  - [ ] Navigate to Faculty Dashboard
  - [ ] Click "NEP Curriculum Builder"
  - [ ] **Verify Security**: Department dropdown is disabled and shows only user's department
  - [ ] Select Course and Semester
  - [ ] Create a bucket (e.g., "Major Pool")
  - [ ] Verify subjects are filtered by user's department only
  - [ ] Drag subjects into bucket
  - [ ] Verify batch is created/updated in database with correct `department_id`
  - [ ] Verify `elective_buckets.batch_id` is correctly set
  - [ ] Verify `subjects.course_group_id` is correctly set
  - [ ] **Test Security Enforcement**:
    - [ ] Try manual API call with different `departmentId` → Should return 403
    - [ ] Verify cannot create buckets for other departments
    - [ ] Verify cannot view subjects from other departments

## Access Control

| Role | Access to NEP Curriculum Builder | Department Restriction | Location |
|------|----------------------------------|------------------------|----------|
| **Creator Faculty** | ✅ Full Access | ✅ Own Department Only | `/faculty/nep-curriculum` |
| **Publisher Faculty** | ❌ No Access | - | - |
| **General Faculty** | ❌ No Access | - | - |
| **Admin** | ❌ No Direct Access | - | Can view batches in dashboard |
| **College Admin** | ❌ Removed | - | Previously had access |

### Security Rules:
1. **Frontend**: Department dropdown is disabled and shows only user's assigned department
2. **API Validation**: 
   - GET `/api/nep/subjects` - Returns 403 if requesting different department
   - GET `/api/nep/buckets` - Returns 403 if requesting different department
   - POST `/api/nep/buckets` - Returns 403 if creating for different department
3. **Database**: Buckets and batches are linked to user's `department_id`

## Benefits

1. **Department-Specific Control**: Creators can ONLY manage curriculum for their assigned department
2. **Security**: Multi-layer validation (frontend + API) prevents cross-department access
3. **Course Flexibility**: Support for multiple courses (ITEP, B.Ed, M.Ed, etc.)
4. **Automatic Batch Management**: System creates batches automatically based on course + department + semester
5. **Proper Access Control**: Only creators can modify curriculum structure
6. **Schema Compliance**: Fully aligned with database relationships (batches → buckets → subjects)
7. **User Isolation**: Each creator only sees and manages their own department's curriculum

## Migration Notes

- **Backward Compatibility**: Old admin NEP Curriculum page still exists at `/admin/nep-curriculum` (can be deleted)
- **Existing Data**: All existing buckets and subjects remain intact
- **API Compatibility**: APIs support both old (no department) and new (with department) usage patterns

## Security Testing Commands

### Test Unauthorized Access (Should All Return 403):
```bash
# Get subjects for different department (as creator of dept X trying to access dept Y)
curl -H "Cookie: your-session-cookie" \
  "http://localhost:3000/api/nep/subjects?courseId=1&semester=1&departmentId=999"

# Get buckets for different department
curl -H "Cookie: your-session-cookie" \
  "http://localhost:3000/api/nep/buckets?courseId=1&semester=1&departmentId=999"

# Create bucket for different department
curl -X POST -H "Cookie: your-session-cookie" -H "Content-Type: application/json" \
  -d '{"bucket_name":"Test","batch_id":1,"departmentId":"999"}' \
  "http://localhost:3000/api/nep/buckets"
```

### Verify Database Integrity:
```sql
-- Check user's department assignment
SELECT id, email, department_id, faculty_type FROM users WHERE email = 'creator@example.com';

-- Verify batches belong to correct department
SELECT b.id, b.name, b.department_id, d.name as dept_name
FROM batches b
JOIN departments d ON b.department_id = d.id
WHERE b.created_at > NOW() - INTERVAL '1 day'
ORDER BY b.created_at DESC;

-- Verify buckets linked to correct department through batches
SELECT eb.id, eb.bucket_name, eb.batch_id, b.department_id, d.name as dept_name
FROM elective_buckets eb
JOIN batches b ON eb.batch_id = b.id
JOIN departments d ON b.department_id = d.id
WHERE eb.created_at > NOW() - INTERVAL '1 day'
ORDER BY eb.created_at DESC;
```

## Next Steps (Optional Enhancements)

1. Add department filtering to old admin page (if keeping it)
2. Add permissions check in admin page to redirect creators to faculty page
3. Add audit logging for bucket creation/modification
4. Add batch name customization in bucket creation
5. Add bulk import for subjects into buckets
