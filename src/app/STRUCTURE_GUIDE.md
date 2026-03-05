# Algomate - Application Structure

Complete guide to the application's folder structure organized by user roles.

## 🎭 Role-Based Organization

```
src/app/
├── super-admin/          # 🔴 Super Admin Only
├── admin/                # 🔵 College Admin & Authorized Faculty
├── faculty/              # 🟢 Faculty Members (All Types)
├── student/              # 🟡 Students
├── api/                  # Backend API Routes
├── login/                # Authentication
├── register/             # User Registration
└── (public pages)        # Landing, etc.
```

## 🔴 Super Admin (`/super-admin`)

**Role:** `super_admin`
**Access Level:** Highest - Full system access

### Pages
- **`/super-admin/dashboard`** - Main overview, college & admin management
- **`/super-admin/manage`** - Detailed data management across all colleges

### Capabilities
- ✅ Create, edit, delete colleges
- ✅ Create, edit, delete college admins
- ✅ View and manage ALL college data
- ✅ Switch between colleges with dropdown
- ✅ Assign college admins to colleges
- ✅ Full CRUD on departments, faculty, classrooms, batches, subjects, courses, students

### Key Features
- College selection dropdown
- Cross-college data management
- System-wide overview
- College admin assignment

📖 [Detailed Documentation](./super-admin/README.md)

---

## 🔵 College Admin (`/admin`)

**Role:** `college_admin`
**Access Level:** College-scoped - Manage own college

### Pages
- **`/admin/dashboard`** - Main management interface
- **`/admin/bucket_creator`** - NEP bucket creation
- **`/admin/nep-curriculum`** - NEP curriculum management
- **`/admin/nep-subjects`** - NEP subjects management

### Capabilities
- ✅ Manage departments in their college
- ✅ Create, edit, delete faculty
- ✅ Manage classrooms, batches, subjects
- ✅ Manage courses and students
- ❌ Cannot switch colleges (locked to assigned college)
- ❌ Cannot manage other colleges
- ❌ Cannot create college admins

### Key Features
- Fixed to assigned college
- College badge display
- Department filtering
- Full data management for own college

📖 [Detailed Documentation](./admin/README.md)

---

## 🟢 Faculty (`/faculty`)

**Role:** `faculty`
**Faculty Types:** `creator`, `publisher`, `general`, `guest`

### Pages
- **`/faculty/dashboard`** - Personal dashboard
- **`/faculty/ai-timetable-creator`** - AI timetable generation (Creator only)
- **`/faculty/manual-scheduling`** - Manual scheduling (Creator, Publisher)
- **`/faculty/hybrid-scheduler`** - Hybrid scheduling
- **`/faculty/timetables`** - View timetables
- **`/faculty/subjects`** - Assigned subjects
- **`/faculty/batches`** - Assigned batches
- **`/faculty/classrooms`** - View classrooms
- **`/faculty/qualifications`** - Manage qualifications
- **`/faculty/nep-curriculum`** - NEP curriculum (Creator)
- **`/faculty/review-queue`** - Review items (Publisher)
- **`/faculty/events`** - Academic events
- **`/faculty/notifications`** - Notifications
- **`/faculty/settings`** - Personal settings

### Faculty Type Capabilities

#### Creator Faculty
- ✅ Create timetables (AI & Manual)
- ✅ Create NEP buckets
- ✅ Full scheduling access
- ✅ Publish timetables

#### Publisher Faculty
- ✅ Review timetables
- ✅ Publish timetables
- ❌ Cannot create from scratch

#### General Faculty
- ✅ View timetables
- ✅ Manage personal data
- ❌ Limited scheduling

#### Guest Faculty
- ✅ View assigned data
- ❌ Read-only access

📖 [Detailed Documentation](./faculty/README.md)

---

## 🟡 Student (`/student`)

**Role:** `student`

### Pages
- **`/student/dashboard`** - Student dashboard
- View timetables
- View subjects
- View grades (if implemented)
- Academic calendar

### Capabilities
- ✅ View personal timetable
- ✅ View enrolled subjects
- ✅ View batch information
- ❌ No editing capabilities

---

## 🔒 Authentication & Authorization

### Role Hierarchy
```
super_admin (Highest)
    ↓
college_admin
    ↓
faculty (creator > publisher > general > guest)
    ↓
student (Lowest)
```

### Access Control Flow
1. User logs in → Role determined from database
2. Role stored in localStorage
3. Each page checks role before rendering
4. Unauthorized access → Redirect to login
5. API endpoints validate role server-side

---

## 🎯 Quick Navigation Guide

### "I want to manage colleges"
→ `/super-admin/dashboard`

### "I want to manage my college's data"
→ `/admin/dashboard` (College Admin)
→ `/super-admin/manage` (Super Admin - select college first)

### "I want to create timetables"
→ `/faculty/ai-timetable-creator` (Creator)
→ `/faculty/manual-scheduling` (Creator/Publisher)

### "I want to view my timetable"
→ `/faculty/timetables` (Faculty)
→ `/student/dashboard` (Student)

### "I want to create NEP curriculum"
→ `/admin/bucket_creator` (College Admin)
→ `/faculty/nep-curriculum` (Creator Faculty)

---

## 🗺️ Data Flow

```
Super Admin
    ↓ creates
College → assigns → College Admin
    ↓ creates              ↓
Department              manages
    ↓ belongs to          ↓
Faculty ← manages ← College Admin
    ↓ creates
Timetable
    ↓ used by
Students & Faculty
```

---

## 📋 Role-Based Features Matrix

| Feature | Super Admin | College Admin | Creator | Publisher | General | Guest | Student |
|---------|------------|---------------|---------|-----------|---------|-------|---------|
| Manage Colleges | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Switch Colleges | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage College Admins | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Departments | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Faculty | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Students | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create Timetables | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Publish Timetables | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Timetables | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create NEP Buckets | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Qualifications | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 🚀 Getting Started by Role

### As Super Admin
1. Login with super_admin role
2. Go to `/super-admin/dashboard`
3. Create colleges and assign admins
4. Use `/super-admin/manage` for detailed data management

### As College Admin
1. Login with college_admin role
2. Go to `/admin/dashboard`
3. Manage your college's data
4. Create faculty, departments, subjects, etc.

### As Faculty
1. Login with faculty role
2. Go to `/faculty/dashboard`
3. Access features based on your faculty_type
4. Create timetables if you're a Creator

### As Student
1. Login with student role
2. Go to `/student/dashboard`
3. View your timetable and subjects

---

## 📝 Notes

- All role checks are enforced both frontend and backend
- College selection persists across sessions (Super Admin)
- College Admins are locked to their assigned college
- Faculty types determine feature access
- Database RLS policies enforce data isolation
