# Super Admin Section

This folder contains all pages and components related to the Super Admin role.

## 📁 Folder Structure

```
super-admin/
├── dashboard/           # Main dashboard with overview and college/admin management
│   └── page.tsx        # Colleges & College Admins management
├── manage/             # Detailed data management across colleges
│   └── page.tsx        # Departments, Faculty, Classrooms, Batches, Subjects, Courses, Students
└── README.md           # This file
```

## 🎯 Pages Overview

### 1. Dashboard (`/super-admin/dashboard`)
**Purpose:** Main entry point for Super Admin
**Features:**
- Quick navigation cards to other sections
- College management (Create, Edit, Delete)
- College Admin management (Create, Edit, Delete)
- Statistics overview

**Access:** Super Admin only

### 2. Manage (`/super-admin/manage`)
**Purpose:** Comprehensive data management across all colleges
**Features:**
- **College Selection Dropdown:** Select which college's data to view/edit
- **Multi-tab Interface:**
  - Departments
  - Faculty (editable with college assignment)
  - Classrooms & Labs
  - Batches
  - Subjects
  - Courses
  - Students
- **Visual Indicators:** Prominent banner showing currently selected college
- **Full CRUD Operations:** Create, Read, Update, Delete for all entities

**Access:** Super Admin only

## 🔑 Key Features

### College Selection System
- Dropdown with search functionality
- Persistent selection (saved in localStorage)
- Visual banner showing active college
- All data filtered by selected college

### College Admin Management
- Assign college admins to specific colleges
- Edit college assignments
- Role-based access control
- College field is required for college_admin role

### Data Organization
- Each college's data is isolated
- Easy switching between colleges
- Comprehensive filtering options
- Search functionality across all entities

## 🛡️ Security

All pages in this section check for `super_admin` role before rendering.
Unauthorized users are redirected to login page.

## 🎨 UI/UX

- Consistent design with gradient cards
- Color-coded badges for different roles and statuses
- Responsive layout
- Clear visual hierarchy
- Intuitive navigation

## 📝 Future Enhancements

Potential additions:
- `/super-admin/analytics` - System-wide analytics
- `/super-admin/settings` - Global settings
- `/super-admin/reports` - Generate reports
- `/super-admin/logs` - System activity logs
