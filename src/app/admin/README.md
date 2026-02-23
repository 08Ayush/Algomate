# College Admin Section

This folder contains all pages and components related to the College Admin role.

## 📁 Folder Structure

```
admin/
├── dashboard/           # Main dashboard for college data management
│   └── page.tsx        # Departments, Faculty, Classrooms, Batches, Subjects, Courses, Students
├── bucket_creator/     # NEP curriculum bucket creation
├── nep-curriculum/     # NEP curriculum management
├── nep-subjects/       # NEP subjects management
└── README.md           # This file
```

## 🎯 Pages Overview

### 1. Dashboard (`/admin/dashboard`)
**Purpose:** Main management interface for College Admins
**Features:**
- Manage college-specific data only
- **Multi-tab Interface:**
  - Departments
  - Faculty
  - Classrooms & Labs
  - Batches
  - Subjects
  - Courses
  - Students
- **College Badge:** Shows which college you're managing
- **Full CRUD Operations:** Create, Read, Update, Delete for all entities
- **Department Filtering:** Filter data by department
- **Search Functionality:** Search across all entities

**Access:** College Admin only (restricted to their assigned college)

### 2. Bucket Creator (`/admin/bucket_creator`)
**Purpose:** Create NEP curriculum buckets
**Access:** Creator Faculty only

### 3. NEP Curriculum (`/admin/nep-curriculum`)
**Purpose:** Manage NEP-based curriculum
**Access:** College Admin and authorized faculty

### 4. NEP Subjects (`/admin/nep-subjects`)
**Purpose:** Manage NEP subjects
**Access:** College Admin and authorized faculty

## 🔑 Key Features

### College-Scoped Access
- College admins can only see/edit their college's data
- Automatic filtering by college_id
- No college selection dropdown (fixed to assigned college)

### Data Management
- Departments: Create/edit college departments
- Faculty: Manage faculty members and assign roles
- Classrooms: Manage rooms, labs, and facilities
- Batches: Manage student batches/sections
- Subjects: Manage course subjects
- Courses: Manage degree programs
- Students: Manage student records

### Visual Indicators
- Blue badge showing assigned college
- Color-coded status badges
- Role indicators for faculty
- Department assignments

## 🛡️ Security

- All pages check for `college_admin` or authorized faculty role
- Data is automatically filtered by college_id
- RLS (Row Level Security) enforced at database level
- Unauthorized users redirected to login

## 🎨 UI/UX

- Clean, professional interface
- Consistent with super admin design
- Modal forms for create/edit
- Inline search and filtering
- Responsive layout
- Clear success/error messages

## ⚖️ Differences from Super Admin

| Feature | Super Admin | College Admin |
|---------|------------|---------------|
| College Selection | ✅ Dropdown to switch | ❌ Fixed to assigned college |
| College Management | ✅ Can create/edit colleges | ❌ Cannot manage colleges |
| Cross-College View | ✅ Can view all colleges | ❌ Only own college |
| College Admin Creation | ✅ Can create admins | ❌ Cannot create admins |
| Data Management | ✅ All colleges | ✅ Own college only |
