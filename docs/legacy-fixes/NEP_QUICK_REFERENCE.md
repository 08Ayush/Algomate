# NEP Curriculum Builder - Quick Reference

## 🎯 What Changed

| Before | After |
|--------|-------|
| ❌ NEP Curriculum Builder in Admin Dashboard | ✅ NEP Curriculum Builder in Creator Dashboard |
| ❌ Any creator could manage any department | ✅ Creators restricted to their assigned department |
| ❌ Manual department selection | ✅ Department auto-selected and locked |
| ❌ No security validation | ✅ Three-layer security (UI + API + DB) |

## 📍 File Changes

### Created Files
1. `/src/app/faculty/nep-curriculum/page.tsx` - New creator page with security
2. `NEP_CURRICULUM_BUILDER_MIGRATION.md` - Technical documentation
3. `NEP_CURRICULUM_CREATOR_GUIDE.md` - User guide
4. `NEP_SECURITY_IMPLEMENTATION.md` - Security details

### Modified Files
1. `/src/components/nep/CurriculumBuilder.tsx` - Added department prop
2. `/src/app/api/nep/subjects/route.ts` - Added security validation
3. `/src/app/api/nep/buckets/route.ts` (GET) - Added security validation
4. `/src/app/api/nep/buckets/route.ts` (POST) - Added security validation
5. `/src/app/faculty/dashboard/page.tsx` - Added green button
6. `/src/app/admin/dashboard/page.tsx` - Removed button

## 🔐 Security Pattern

```typescript
// In API handlers:
const departmentId = searchParams.get('departmentId') || body.departmentId;

// Security check
if (user.department_id && departmentId && user.department_id !== departmentId) {
  return NextResponse.json(
    { error: 'You can only access your own department', code: 'UNAUTHORIZED_DEPARTMENT' },
    { status: 403 }
  );
}

// Use validated department
const targetDepartmentId = departmentId || user.department_id;

// Database query
query.eq('department_id', targetDepartmentId);
```

## 🧪 Quick Test

### 1. Login as Creator
```sql
-- Check user has correct setup
SELECT email, department_id, faculty_type FROM users WHERE email = 'your@email.com';
-- Expected: department_id = 'CS-001', faculty_type = 'creator'
```

### 2. Navigate to Page
```
URL: http://localhost:3000/faculty/dashboard
Click: "NEP Curriculum Builder" (green button)
```

### 3. Verify UI Security
- Department dropdown should be **disabled** (gray)
- Should show only your department
- Cannot be changed

### 4. Test API Security (Browser Console)
```javascript
// Should FAIL with 403
fetch('/api/nep/subjects?courseId=1&semester=3&departmentId=different-dept', {
  credentials: 'include'
}).then(r => r.json()).then(console.log);
```

### 5. Create Bucket
- Select course and semester
- Create bucket (e.g., "Major Pool")
- Drag subjects into bucket
- Verify success

### 6. Database Verification
```sql
-- Verify batch has correct department
SELECT b.id, b.name, b.department_id, d.name as dept_name
FROM batches b
JOIN departments d ON b.department_id = d.id
WHERE b.created_at > NOW() - INTERVAL '1 hour'
ORDER BY b.created_at DESC;

-- Verify bucket linked correctly
SELECT eb.bucket_name, b.department_id, d.name as dept_name
FROM elective_buckets eb
JOIN batches b ON eb.batch_id = b.id
JOIN departments d ON b.department_id = d.id
WHERE eb.created_at > NOW() - INTERVAL '1 hour'
ORDER BY eb.created_at DESC;
```

## 🚨 Expected Security Responses

### ✅ Success Cases
```json
// GET /api/nep/subjects?courseId=1&semester=3&departmentId=own-dept
{ "subjects": [...] }  // Status: 200

// POST /api/nep/buckets (own department)
{ "bucket": {...}, "batch": {...} }  // Status: 200
```

### ❌ Error Cases
```json
// GET /api/nep/subjects?courseId=1&semester=3&departmentId=other-dept
{
  "error": "You can only access subjects for your own department",
  "code": "UNAUTHORIZED_DEPARTMENT"
}  // Status: 403

// POST /api/nep/buckets (other department)
{
  "error": "You can only create buckets for your own department",
  "code": "UNAUTHORIZED_DEPARTMENT"
}  // Status: 403
```

## 📊 Database Schema

```sql
-- Key relationships
users.department_id → departments.id
batches.department_id → departments.id
elective_buckets.batch_id → batches.id
subjects.course_group_id → elective_buckets.id
```

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Department dropdown disabled | ✅ NORMAL - Security feature |
| 403 Forbidden error | Check user.department_id matches requested departmentId |
| No subjects showing | Verify subjects exist for your department in database |
| Cannot create bucket | Ensure you're logged in as creator with department_id assigned |

## 📝 Key Code Snippets

### Frontend - Department Lock
```tsx
<select 
  disabled 
  className="bg-gray-100 cursor-not-allowed"
>
  <option>Your Department</option>
</select>
```

### API - Security Validation
```typescript
if (user.department_id && departmentId && user.department_id !== departmentId) {
  return NextResponse.json({ error: '403' }, { status: 403 });
}
```

### Database - Filtered Query
```typescript
query.eq('department_id', targetDepartmentId);
```

## 🎓 User Roles

| Role | Can Access NEP Builder? | Department Restriction |
|------|-------------------------|------------------------|
| Creator | ✅ Yes | ✅ Own department only |
| Publisher | ❌ No | - |
| Admin | ❌ No direct access | Can view batches |

## 📚 Documentation Links

- **Technical**: `NEP_CURRICULUM_BUILDER_MIGRATION.md`
- **User Guide**: `NEP_CURRICULUM_CREATOR_GUIDE.md`
- **Security**: `NEP_SECURITY_IMPLEMENTATION.md`

## ✅ Completion Checklist

- [x] Page created at `/faculty/nep-curriculum`
- [x] Button added to faculty dashboard
- [x] Button removed from admin dashboard
- [x] Component updated with department prop
- [x] Three API endpoints secured
- [x] Frontend department lock implemented
- [x] Documentation created
- [ ] **User testing required**
- [ ] **Database verification required**

## 🚀 Next Steps

1. Login as creator faculty
2. Test NEP Curriculum Builder
3. Verify department security
4. Create sample buckets
5. Verify database integrity
6. Report any issues

---

**Implementation Date**: 2025  
**Status**: ✅ Complete (Pending Testing)  
**Security Level**: 🔐 Multi-Layer (UI + API + DB)
