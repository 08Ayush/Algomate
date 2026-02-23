# Department-Based Data Filtering for Creator Dashboard

## Summary of Changes

This document describes the changes made to implement department-based filtering for creator users in the faculty dashboard navigation system.

## Problem Statement

Previously, creator users could see all data across all departments within their college (CSE, Data Science, etc.) in the navigation sections. The requirement was to filter all data to show only records belonging to the creator's specific department.

## Solution Overview

Updated all API routes and frontend components to:
1. Include `department_id` in user authentication
2. Filter data by `department_id` for creator role users
3. Maintain existing access for admin and publisher roles (college-wide access)

## Modified API Routes

### 1. `/api/admin/faculty/route.ts`
**Changes:**
- Added `department_id` to the `getAuthenticatedUser` function's SELECT query
- Modified GET endpoint to filter faculty by `department_id` for creator users
- Publishers and admins continue to see all college faculty

**Filter Logic:**
```typescript
if (user.role === 'faculty' && user.faculty_type === 'creator' && user.department_id) {
  query = query.eq('department_id', user.department_id);
}
```

### 2. `/api/admin/subjects/route.ts`
**Changes:**
- Added `department_id` to authentication helper
- Modified GET endpoint to filter subjects by `department_id` for creator users
- Publishers and admins see all college subjects

**Filter Logic:**
```typescript
if (user.role === 'faculty' && user.faculty_type === 'creator' && user.department_id) {
  query = query.eq('department_id', user.department_id);
}
```

### 3. `/api/admin/classrooms/route.ts`
**Changes:**
- Added `department_id` to authentication helper
- Modified GET endpoint to filter classrooms by `department_id` for creator users
- Publishers and admins see all college classrooms

**Filter Logic:**
```typescript
if (user.role === 'faculty' && user.faculty_type === 'creator' && user.department_id) {
  query = query.eq('department_id', user.department_id);
}
```

### 4. `/api/admin/batches/route.ts`
**Changes:**
- User authentication already included `department_id`
- Modified GET endpoint to filter batches by `department_id` for creator users
- Publishers and admins see all college batches

**Filter Logic:**
```typescript
if (user.role === 'faculty' && user.faculty_type === 'creator' && user.department_id) {
  query = query.eq('department_id', user.department_id);
}
```

### 5. `/api/faculty/qualifications/route.ts`
**Changes:**
- Replaced client-side Supabase with server-side admin client
- Added `getAuthenticatedUser` helper function with `department_id`
- Modified GET endpoint to filter qualifications by department for creator users
- Added authentication to POST and DELETE endpoints
- Validates that faculty and subjects belong to user's college/department

**Filter Logic:**
```typescript
// Always filter by college
filteredData = filteredData.filter(qual => {
  const faculty = Array.isArray(qual.faculty) ? qual.faculty[0] : qual.faculty;
  const subject = Array.isArray(qual.subject) ? qual.subject[0] : qual.subject;
  return faculty?.college_id === user.college_id && subject?.college_id === user.college_id;
});

// Additional department filter for creators
if (user.role === 'faculty' && user.faculty_type === 'creator' && user.department_id) {
  filteredData = filteredData.filter(qual => {
    const faculty = Array.isArray(qual.faculty) ? qual.faculty[0] : qual.faculty;
    const subject = Array.isArray(qual.subject) ? qual.subject[0] : qual.subject;
    return faculty?.department_id === user.department_id && subject?.department_id === user.department_id;
  });
}
```

## Modified Frontend Components

### `/app/faculty/qualifications/page.tsx`
**Changes:**
- Updated `loadData` function to pass Authorization header with user token
- Updated `handleAddQualification` to include Authorization header
- Updated `handleDeleteQualification` to include Authorization header

**Authentication Pattern:**
```typescript
const authToken = Buffer.from(JSON.stringify(userData)).toString('base64');
const response = await fetch('/api/faculty/qualifications', {
  headers: {
    'Authorization': `Bearer ${authToken}`
  }
});
```

## Access Control Matrix

| Role | Faculty Type | Access Level | Filtering |
|------|-------------|--------------|-----------|
| admin | N/A | College-wide | No department filter |
| college_admin | N/A | College-wide | No department filter |
| faculty | creator | Department-only | Filtered by department_id |
| faculty | publisher | College-wide | No department filter |

## Database Schema Requirements

All relevant tables must have `department_id` column:
- ✅ users
- ✅ subjects
- ✅ classrooms
- ✅ batches
- ✅ departments (inherently has department context)

## Testing Checklist

### For Creator Users:
- [ ] Faculty list shows only faculty from creator's department
- [ ] Subjects list shows only subjects from creator's department
- [ ] Classrooms list shows only classrooms from creator's department
- [ ] Batches list shows only batches from creator's department
- [ ] Qualifications show only faculty-subject pairs from creator's department
- [ ] Cannot add qualifications for faculty/subjects outside their department
- [ ] Cannot see data from other departments (e.g., CSE user cannot see Data Science data)

### For Publisher Users:
- [ ] Can see all data across all departments in their college
- [ ] Faculty list shows all college faculty
- [ ] Subjects list shows all college subjects
- [ ] Classrooms list shows all college classrooms
- [ ] Batches list shows all college batches

### For Admin Users:
- [ ] Full access to all college data
- [ ] Can create/edit/delete across all departments

## Migration Notes

No database migrations required as all tables already have the necessary `department_id` columns. The changes are purely at the API and application logic level.

## Benefits

1. **Data Isolation**: Creators only see relevant data for their department
2. **Security**: Prevents unauthorized access to other departments' data
3. **User Experience**: Cleaner navigation without irrelevant data
4. **Performance**: Reduced data transfer for creator users
5. **Scalability**: Supports multi-department colleges effectively

## Backward Compatibility

- ✅ No breaking changes for existing admin or publisher users
- ✅ All existing functionality preserved
- ✅ Database schema unchanged
- ✅ Only creator user experience is enhanced with filtering

## Date of Implementation
December 8, 2025
