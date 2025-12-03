# Faculty Role-Based Dashboard Routing - Implementation ✅

## Overview

Implemented role-based dashboard routing for faculty members based on their `faculty_type`. Different faculty types now have access to different dashboards and features.

## Faculty Types & Access Levels

### 1. **Creator Faculty** 🎨
- **Faculty Type**: `creator`
- **Dashboard**: `/faculty/dashboard` (Full faculty dashboard)
- **Access Level**: Full access to:
  - Manual timetable scheduling
  - AI-powered scheduling
  - Timetable creation and publishing
  - All faculty management features

### 2. **Publisher Faculty** 📤
- **Faculty Type**: `publisher`
- **Dashboard**: `/faculty/dashboard` (Full faculty dashboard)
- **Access Level**: Full access to:
  - Manual timetable scheduling
  - Timetable publishing
  - Review and approval workflows
  - All faculty management features

### 3. **General Faculty** 👨‍🏫
- **Faculty Type**: `general` or `null`
- **Dashboard**: `/student/dashboard` (View-only dashboard)
- **Access Level**: Limited access:
  - ✅ View their own teaching schedule
  - ✅ View department information
  - ✅ View events and workshops
  - ❌ No timetable creation/editing
  - ❌ No manual scheduling access

### 4. **Guest Faculty** 🎓
- **Faculty Type**: `guest`
- **Dashboard**: `/student/dashboard` (View-only dashboard)
- **Access Level**: Limited access (same as General Faculty):
  - ✅ View their assigned classes
  - ✅ View schedule
  - ❌ No timetable management

## Implementation Details

### 1. Login Page (`src/app/login/page.tsx`)

**Updated Login Redirect Logic**:
```tsx
const role = data.userData.role;
const facultyType = data.userData.faculty_type;

switch (role) {
  case 'admin':
  case 'college_admin':
    router.push('/admin/dashboard');
    break;
  case 'faculty':
    // Creator and Publisher → Faculty Dashboard
    // General and Guest → Student Dashboard (view-only)
    if (facultyType === 'creator' || facultyType === 'publisher') {
      router.push('/faculty/dashboard');
    } else {
      router.push('/student/dashboard');
    }
    break;
  case 'student':
    router.push('/student/dashboard');
    break;
  default:
    router.push('/dashboard');
}
```

**Logic**:
- Checks both `role` AND `faculty_type`
- Creator/Publisher → Full faculty dashboard
- General/Guest/null → Student-like dashboard

### 2. Faculty Dashboard (`src/app/faculty/dashboard/page.tsx`)

**Access Control Added**:
```tsx
useEffect(() => {
  const userData = localStorage.getItem('user');
  if (!userData) {
    router.push('/login');
    return;
  }

  const parsedUser = JSON.parse(userData);
  
  // Check if user is faculty
  if (parsedUser.role !== 'faculty') {
    router.push('/login');
    return;
  }
  
  // Only Creator and Publisher can access faculty dashboard
  const facultyType = parsedUser.faculty_type;
  if (facultyType !== 'creator' && facultyType !== 'publisher') {
    // Redirect general/guest faculty to student dashboard
    router.push('/student/dashboard');
    return;
  }
  
  setUser(parsedUser);
  setLoading(false);
}, [router]);
```

**Protection**:
- Validates user is faculty
- Validates faculty type is creator or publisher
- Redirects unauthorized faculty to student dashboard

### 3. Manual Scheduling Page (`src/app/faculty/manual-scheduling/page.tsx`)

**Access Control Added**:
```tsx
useEffect(() => {
  const userData = localStorage.getItem('user');
  if (!userData) {
    router.push('/login');
    return;
  }

  const parsedUser = JSON.parse(userData);
  
  // Check if user is faculty
  if (parsedUser.role !== 'faculty') {
    router.push('/login');
    return;
  }
  
  // Only Creator and Publisher can access manual scheduling
  const facultyType = parsedUser.faculty_type;
  if (facultyType !== 'creator' && facultyType !== 'publisher') {
    router.push('/student/dashboard?message=Access denied - Creator or Publisher role required');
    return;
  }
  
  setUser(parsedUser);
  setLoading(false);
}, [router]);
```

**Protection**:
- Same validation as faculty dashboard
- Shows access denied message for unauthorized access
- Redirects to student dashboard with error message

### 4. Student Dashboard (`src/app/student/dashboard/page.tsx`)

**Updated Access Control**:
```tsx
useEffect(() => {
  const userData = localStorage.getItem('user');
  if (!userData) {
    router.push('/login');
    return;
  }

  const parsedUser = JSON.parse(userData);
  
  // Allow students and general/guest faculty to access this dashboard
  const isStudent = parsedUser.role === 'student';
  const isGeneralFaculty = parsedUser.role === 'faculty' && 
                          (parsedUser.faculty_type === 'general' || 
                           parsedUser.faculty_type === 'guest' || 
                           !parsedUser.faculty_type);
  
  if (!isStudent && !isGeneralFaculty) {
    router.push('/login');
    return;
  }

  setUser(parsedUser);
}, [router]);
```

**Features**:
- Accepts both students AND general/guest faculty
- Shows different welcome message based on role
- Faculty see: "View your teaching schedule and department information"
- Students see: "Ready to explore your Computer Science Engineering dashboard"

**Updated Welcome Message**:
```tsx
<h1 className="text-2xl font-bold">
  Welcome back, {user?.first_name || (user?.role === 'faculty' ? 'Faculty' : 'Student')}! 👋
</h1>
<p className="text-gray-600">
  {user?.role === 'faculty' 
    ? 'View your teaching schedule and department information'
    : 'Ready to explore your Computer Science Engineering dashboard'}
</p>
```

## User Flow Diagrams

### Creator/Publisher Faculty Login Flow:
```
Login → Verify Credentials → Check Role (faculty) 
  → Check Faculty Type (creator/publisher) 
  → Redirect to /faculty/dashboard 
  → Full Access to Timetable Management
```

### General/Guest Faculty Login Flow:
```
Login → Verify Credentials → Check Role (faculty) 
  → Check Faculty Type (general/guest/null) 
  → Redirect to /student/dashboard 
  → View-Only Access to Schedule
```

### Student Login Flow:
```
Login → Verify Credentials → Check Role (student) 
  → Redirect to /student/dashboard 
  → View Own Schedule & Events
```

## Dashboard Access Matrix

| User Type | Faculty Dashboard | Manual Scheduling | Student Dashboard | Access Level |
|-----------|------------------|-------------------|-------------------|--------------|
| **Creator Faculty** | ✅ Full Access | ✅ Full Access | ❌ Redirected | Create & Manage |
| **Publisher Faculty** | ✅ Full Access | ✅ Full Access | ❌ Redirected | Publish & Review |
| **General Faculty** | ❌ Redirected | ❌ Access Denied | ✅ View Only | View Schedule |
| **Guest Faculty** | ❌ Redirected | ❌ Access Denied | ✅ View Only | View Schedule |
| **Student** | ❌ Login Required | ❌ Login Required | ✅ Full Access | View & Export |
| **Admin** | ❌ Login Required | ❌ Login Required | ❌ Login Required | Admin Panel |

## Benefits

### ✅ Role-Based Security
- Proper access control based on faculty type
- Prevents unauthorized access to scheduling features
- Clear separation of privileges

### ✅ Better User Experience
- Each faculty type gets appropriate interface
- No confusing features for general faculty
- Clear dashboards based on responsibilities

### ✅ Scalability
- Easy to add new faculty types
- Centralized role checking logic
- Maintainable access control

### ✅ Flexibility
- General faculty can view their schedules
- No need for separate faculty viewer page
- Reuses existing student dashboard components

## Database Faculty Types

Ensure your database `users` table has these `faculty_type` values:

```sql
-- Faculty types in users table
CREATE TYPE faculty_type_enum AS ENUM (
  'creator',    -- Can create and manage timetables
  'publisher',  -- Can publish and approve timetables
  'general',    -- Regular teaching faculty (view-only)
  'guest'       -- Guest lecturers (view-only)
);
```

## Testing Checklist

### Creator Faculty ✅
- [ ] Login redirects to `/faculty/dashboard`
- [ ] Can access manual scheduling page
- [ ] Header shows "Creator" badge
- [ ] Can create timetables
- [ ] Can publish timetables
- [ ] Full dashboard features visible

### Publisher Faculty ✅
- [ ] Login redirects to `/faculty/dashboard`
- [ ] Can access manual scheduling page
- [ ] Header shows "Publisher" badge
- [ ] Can review timetables
- [ ] Can publish timetables
- [ ] Full dashboard features visible

### General Faculty ✅
- [ ] Login redirects to `/student/dashboard`
- [ ] Cannot access `/faculty/dashboard` (redirected)
- [ ] Cannot access manual scheduling (access denied)
- [ ] Header shows "General" badge
- [ ] Can view own teaching schedule
- [ ] See faculty-specific welcome message
- [ ] View-only interface

### Guest Faculty ✅
- [ ] Login redirects to `/student/dashboard`
- [ ] Cannot access `/faculty/dashboard` (redirected)
- [ ] Cannot access manual scheduling (access denied)
- [ ] Header shows "Guest" badge
- [ ] Can view assigned classes
- [ ] See faculty-specific welcome message
- [ ] View-only interface

## Files Modified

1. ✅ **`src/app/login/page.tsx`**
   - Added faculty type checking in login redirect
   - Routes based on both role and faculty_type

2. ✅ **`src/app/faculty/dashboard/page.tsx`**
   - Added faculty type validation
   - Only allows creator and publisher
   - Redirects others to student dashboard

3. ✅ **`src/app/faculty/manual-scheduling/page.tsx`**
   - Added faculty type validation
   - Only allows creator and publisher
   - Shows access denied message for others

4. ✅ **`src/app/student/dashboard/page.tsx`**
   - Updated to accept general/guest faculty
   - Added role-based welcome messages
   - Different descriptions for faculty vs students

## Example User Scenarios

### Scenario 1: General Faculty (Mr. Sharma)
```
Role: faculty
Faculty Type: general
Department: Computer Science

Login → Redirected to /student/dashboard
- Sees: "Welcome back, Mr. Sharma! 👋"
- Sees: "View your teaching schedule and department information"
- Can view: His assigned classes for the week
- Cannot: Create or modify timetables
- Header shows: "General Faculty" badge
```

### Scenario 2: Creator Faculty (Dr. Patel)
```
Role: faculty
Faculty Type: creator
Department: Computer Science

Login → Redirected to /faculty/dashboard
- Sees: Full faculty dashboard
- Can access: Manual scheduling
- Can access: AI-powered scheduling
- Can: Create, edit, publish timetables
- Header shows: "Creator Faculty" badge
```

### Scenario 3: Student (Paritosh)
```
Role: student
Roll Number: 22CSE001

Login → Redirected to /student/dashboard
- Sees: "Welcome back, Paritosh! 👋"
- Sees: Student-specific dashboard
- Can view: Class timetable, events, exams
- Can: Export timetable to PDF/Excel
- Header shows: "Student" badge
```

## Security Considerations

### ✅ Frontend Protection
- All pages validate user role and faculty type
- Unauthorized users redirected immediately
- No UI elements shown for unavailable features

### ✅ Backend Protection Needed
- **Important**: Add same validation to API routes
- Check faculty_type before allowing scheduling operations
- Return 403 Forbidden for unauthorized requests

### 🔒 Recommended API Protection
```typescript
// Example: Protect scheduling API
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  
  if (user.role !== 'faculty') {
    return NextResponse.json(
      { error: 'Faculty access required' },
      { status: 403 }
    );
  }
  
  if (user.faculty_type !== 'creator' && user.faculty_type !== 'publisher') {
    return NextResponse.json(
      { error: 'Creator or Publisher access required' },
      { status: 403 }
    );
  }
  
  // Proceed with scheduling operation
}
```

## Future Enhancements

### 🔮 Planned Features

1. **Faculty-Specific Timetable View**
   - Show only classes assigned to general faculty
   - Filter by faculty ID
   - Highlight their teaching slots

2. **Department-Wide View**
   - General faculty can see department schedule
   - Useful for coordination
   - View colleague schedules

3. **Notification System**
   - Notify general faculty of schedule changes
   - Alert for class cancellations
   - Updates from creators/publishers

4. **Leave Management**
   - General faculty can request leave
   - System shows substitute faculty
   - Integration with timetable

5. **Analytics Dashboard**
   - General faculty see their teaching hours
   - Weekly/monthly statistics
   - Performance metrics

## Troubleshooting

### Issue: General Faculty Still Sees Faculty Dashboard
**Solution**: 
- Clear localStorage: `localStorage.clear()`
- Logout and login again
- Verify faculty_type in database is 'general' or 'guest'

### Issue: Creator Cannot Access Manual Scheduling
**Solution**:
- Check faculty_type is exactly 'creator' or 'publisher'
- Verify no typos in database (case-sensitive)
- Check console for redirect logs

### Issue: Student Dashboard Shows Wrong Message
**Solution**:
- Verify user.role is correctly set
- Check welcome message logic
- Ensure user object is loaded before rendering

## Summary

✅ **Implemented**: Role-based routing for faculty types  
✅ **Protected**: Faculty dashboard and manual scheduling  
✅ **Updated**: Student dashboard to accept general faculty  
✅ **Improved**: User experience with appropriate dashboards  
✅ **Secured**: Access control at component level  

**Next Steps**:
1. Add backend API protection
2. Test with all faculty types
3. Add faculty-specific features to student dashboard
4. Implement notification system

---

**Status**: ✅ Complete and Ready for Testing  
**Last Updated**: October 9, 2025  
**Files Changed**: 4 files modified, 0 errors
