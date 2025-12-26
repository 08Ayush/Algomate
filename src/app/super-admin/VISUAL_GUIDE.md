# 🗂️ Super Admin Pages - Visual Guide

## File Organization

```
src/app/super-admin/
│
├── 📄 README.md                    ← You are here
│
├── 📁 dashboard/
│   └── 📄 page.tsx                 ← Main entry point
│       ├── Colleges Management
│       │   ├── Create College
│       │   ├── Edit College
│       │   └── Delete College
│       │
│       ├── College Admins Management
│       │   ├── Create Admin
│       │   ├── Edit Admin
│       │   └── Delete Admin
│       │
│       └── Quick Navigation Cards
│           └── Link to /manage
│
└── 📁 manage/
    └── 📄 page.tsx                 ← Detailed management
        ├── 🏢 College Selection Dropdown
        │   └── Search & Filter Colleges
        │
        ├── 📊 Data Tabs
        │   ├── Departments
        │   ├── Faculty ⭐ (Editable with college)
        │   ├── Classrooms
        │   ├── Batches
        │   ├── Subjects
        │   ├── Courses
        │   └── Students
        │
        └── 🎨 Visual Features
            ├── College Banner
            ├── Search Functionality
            └── Department Filters
```

## 🎯 Page Navigation Flow

```
User Logs In (super_admin)
        ↓
        ↓
    Dashboard (/super-admin/dashboard)
        │
        ├──→ Manage Colleges
        │    ├── Add New College
        │    ├── Edit Existing
        │    └── View Statistics
        │
        ├──→ Manage College Admins
        │    ├── Add New Admin
        │    ├── Assign to College
        │    └── Edit Permissions
        │
        └──→ Click "Manage All Data" Card
             ↓
             ↓
          Manage Page (/super-admin/manage)
             │
             ├──→ Select College (Dropdown)
             │    ├── Search Colleges
             │    └── Filter by Code
             │
             └──→ Manage Selected College Data
                  ├── Departments Tab
                  ├── Faculty Tab ⭐
                  ├── Classrooms Tab
                  ├── Batches Tab
                  ├── Subjects Tab
                  ├── Courses Tab
                  └── Students Tab
```

## 🔄 User Interaction Flow

### Managing Faculty with College Assignment

```
1. Navigate to /super-admin/manage
        ↓
2. Select College from Dropdown
   (e.g., "SVPCET - Main Campus")
        ↓
3. See College Banner
   "Viewing Data For: SVPCET - Main Campus"
        ↓
4. Click on "Faculty" Tab
        ↓
5. Click "Add Faculty" Button
        ↓
6. Fill Faculty Form:
   ├── Name, Email, Phone
   ├── Department (Optional)
   ├── Role: faculty/college_admin/admin
   ├── Faculty Type: creator/publisher/general/guest
   └── 🆕 College: [Dropdown List] (Required for college_admin)
        ↓
7. Save → Faculty created with college assignment
        ↓
8. See Faculty in List with College Badge
   "👤 John Doe | 🏛️ SVPCET"
```

## 📋 Key Features Per Page

### Dashboard Page
| Feature | Description | Icon |
|---------|-------------|------|
| College Cards | Show total colleges | 🏛️ |
| Admin Cards | Show total admins | 👥 |
| Navigation Card | Link to /manage | ⚙️ |
| Statistics | Real-time counts | 📊 |
| CRUD Forms | Create/Edit modals | ✏️ |

### Manage Page
| Feature | Description | Icon |
|---------|-------------|------|
| College Dropdown | Select & search colleges | 🔽 |
| College Banner | Visual indicator | 🎨 |
| Multi-Tab Interface | 7 data categories | 📑 |
| Search Bar | Search within tabs | 🔍 |
| Department Filter | Filter by department | 🏢 |
| CRUD Operations | Full management | ✏️ |
| College Assignment | For faculty/admins | 🏛️ |

## 🎨 Visual Elements

### College Banner (on /manage page)
```
┌─────────────────────────────────────────────────────┐
│ 🏛️  Viewing Data For:                               │
│     SVPCET - Main Campus                            │
│                                                      │
│                           College Code: SVPCET      │
│ 📍 Surat, Gujarat                                   │
└─────────────────────────────────────────────────────┘
```

### Faculty List Item
```
┌─────────────────────────────────────────────────────┐
│ 👤 Dr. John Doe                                     │
│    college_admin  ●  Active                         │
│    john.doe@college.edu                             │
│    Computer Science (CSE)                           │
│    FAC001 • creator  🏛️ SVPCET                     │
│                                      [Edit] [Delete] │
└─────────────────────────────────────────────────────┘
```

## 🚦 Access Control

```
Route: /super-admin/*
    ↓
Check User Role
    ↓
    ├── super_admin? → ✅ Allow Access
    │
    ├── college_admin? → ❌ Redirect to /admin/dashboard
    │
    ├── faculty? → ❌ Redirect to /faculty/dashboard
    │
    └── student? → ❌ Redirect to /student/dashboard
```

## 💡 Tips for Future Changes

### To Add a New Tab in /manage:
1. Add interface definition
2. Add state variable
3. Add to activeTab type
4. Add tab button in navigation
5. Add tab content in conditional render
6. Add API fetch in fetchData()
7. Add filter logic

### To Modify College Admin Form:
1. Edit facultyForm state in /manage/page.tsx
2. Update form fields (lines ~1536-1670)
3. Update handleFacultySubmit
4. Update API endpoint if needed

### To Add New Super Admin Page:
1. Create folder: `super-admin/new-page/`
2. Create `page.tsx` in folder
3. Add role check useEffect
4. Add navigation link in dashboard
5. Update this README

## 📞 Support

For issues or questions about the super admin section:
- Check `/src/app/STRUCTURE_GUIDE.md` for overall structure
- Review API documentation for backend changes
- Test with super_admin role credentials
