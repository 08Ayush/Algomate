# 🚀 Complete Supabase Schema Deployment Guide

## Step-by-Step Instructions to Fix Permission Issues

### 📋 Prerequisites
- Access to your Supabase Dashboard: https://supabase.com/dashboard/project/hwfdzrqfesebmuzgqmpe
- Admin access to run SQL commands

---

## 🔧 Step 1: Clean Up Existing Database (OPTIONAL)

**⚠️ WARNING: This will delete all existing data!**

If you want to start fresh, run this in SQL Editor:
```sql
-- Only run this if you want to completely reset your database
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
```

---

## 📦 Step 2: Deploy the Complete Schema

1. **Go to Supabase Dashboard**
   - Open: https://supabase.com/dashboard/project/hwfdzrqfesebmuzgqmpe
   - Click: **"SQL Editor"** in the left sidebar

2. **Run the Complete Schema**
   - Copy the ENTIRE content from `complete_schema_with_permissions.sql`
   - Paste it into the SQL Editor
   - Click **"Run"** button
   - Wait for completion (may take 30-60 seconds)

3. **Verify Success**
   - You should see: "SCHEMA DEPLOYMENT COMPLETE!" message
   - Check that "Total tables created: 12" or more
   - Look for "SUCCESS: All tables created successfully!"

---

## ✅ Step 3: Verify Tables and Permissions

Run this verification query in SQL Editor:

```sql
-- Check all tables exist
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check departments are accessible
SELECT id, name, code FROM departments WHERE is_active = TRUE;

-- Check permissions on departments table
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'departments';
```

---

## 🔑 Step 4: Additional Permission Fixes (If Needed)

If you still see permission errors, run these additional commands:

```sql
-- Grant comprehensive permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Specific permissions for registration
GRANT SELECT ON departments TO anon;
GRANT INSERT, SELECT ON users TO anon;

-- Ensure RLS is disabled
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

---

## 🧪 Step 5: Test the Registration

1. **Test API Endpoint**
   - Open browser to: http://localhost:3000/api/departments
   - Should return JSON with departments list
   - No more "permission denied" errors

2. **Test Registration Form**
   - Go to: http://localhost:3000/register
   - Department dropdown should populate
   - Try registering a test user

---

## 🐛 Troubleshooting

### Problem: "permission denied for schema public"
**Solution:** Run the additional permission fixes from Step 4

### Problem: "relation does not exist"
**Solution:** The schema wasn't deployed properly. Re-run Step 2

### Problem: Department dropdown still empty
**Solution:** Check browser console for errors and verify API endpoint

### Problem: Registration fails with database errors
**Solution:** Check that users table has proper permissions:
```sql
GRANT INSERT, SELECT, UPDATE ON users TO anon, authenticated;
```

---

## 📊 Expected Results After Deployment

### ✅ What You Should See:
- 12+ tables created in public schema
- Department dropdown populated with 12 departments
- Registration form working
- No "permission denied" errors
- Successful API calls to `/api/departments`

### 📋 Tables That Should Exist:
1. `departments`
2. `users`
3. `subjects`
4. `classrooms`
5. `batches`
6. `time_slots`
7. `faculty_qualified_subjects`
8. `faculty_availability`
9. `batch_subjects`
10. `constraint_rules`
11. `student_batch_enrollment`
12. `audit_logs`

---

## 🎯 Next Steps After Successful Deployment

1. **Test Registration**: Create a test student account
2. **Test Login**: Verify authentication works
3. **Check Data**: Verify user appears in database
4. **Enable RLS**: Later, enable Row Level Security with proper policies for production

---

## 📞 Need Help?

If you encounter any issues:
1. Check the SQL Editor for error messages
2. Verify your service role key is correct in `.env`
3. Make sure you're running the complete schema file
4. Check browser console for detailed error messages

The schema includes comprehensive permissions and should resolve all "permission denied" issues!