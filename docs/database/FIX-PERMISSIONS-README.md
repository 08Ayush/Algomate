# Fix Database Permissions for Qualifications Feature

## 🐛 Problem
Getting **"Failed to add qualification"** error with HTTP 500 status because the database is blocking INSERT operations on the `faculty_qualified_subjects` table.

## ✅ Quick Fix (Recommended)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: **hwfdzrqfesebmuzgqmpe**
3. Click **SQL Editor** in the left sidebar

### Step 2: Run Permission Script
1. Click **New Query** button
2. Copy and paste the contents of **`database/simple-qualifications-permissions.sql`**
3. Click **RUN** button (or press Ctrl+Enter)
4. You should see success messages in the Results panel

### Step 3: Test Again
1. Go back to your app: http://localhost:3000/faculty/qualifications
2. Click **"Add Qualification"** button
3. Select a faculty and subject
4. Click **"Add Qualification"**
5. Should work now! ✅

## 📋 What the Script Does

The script:
- **Disables Row Level Security (RLS)** on the table (for now)
- **Grants all permissions** (SELECT, INSERT, UPDATE, DELETE) to all roles
- **Grants sequence permissions** so auto-increment IDs work
- **Verifies** the changes were applied

## 🔒 Advanced: Enable RLS with Proper Policies (Optional)

If you want department-based security later, run **`database/grant-qualifications-permissions.sql`** instead. This adds:
- Row Level Security policies
- Department-based access control
- Users can only manage qualifications in their own department

## 🧪 Verification

After running the script, check the console logs:
```
✅ Loaded X qualifications for department
✅ Loaded X faculty from department
✅ Loaded X subjects from department
```

Then when adding a qualification, you should see:
```
📥 Adding faculty qualification: { faculty_id: '...', subject_id: '...', proficiency_level: 7 }
✅ Qualification added successfully
```

## 🚨 Common Issues

**Issue**: Still getting 500 error after running script
**Solution**: Make sure you ran the script in the **correct project** (hwfdzrqfesebmuzgqmpe)

**Issue**: Script fails with "permission denied"
**Solution**: Make sure you're logged in as the project owner in Supabase

**Issue**: "sequence does not exist"
**Solution**: Check if your table has an auto-increment ID column. Run:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'faculty_qualified_subjects';
```

## 📊 Current Status

From your console logs:
- ✅ Department filtering working (loading correct dept data)
- ✅ Faculty loading: 19 faculty from Data Science dept
- ✅ Subjects loading: 74 subjects from Data Science dept
- ❌ **INSERT failing**: Need to run permission script

## 🎯 Next Steps

1. Run `simple-qualifications-permissions.sql` in Supabase
2. Test adding a qualification
3. If successful, you're done! 🎉
4. Later, you can add RLS for better security using the advanced script
