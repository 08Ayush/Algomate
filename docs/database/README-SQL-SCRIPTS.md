# Database Folder - SQL Scripts

This folder contains all SQL scripts for database schema, setup, fixes, and maintenance.

## 📁 Folder Organization

All SQL files have been organized here from the root directory to keep the project clean and maintainable.

## 📋 SQL Files Categories

### 🏗️ Schema Files
- **`schema.sql`** - Original complete database schema
- **`new_schema.sql`** - Updated/enhanced schema with new features
- **`complete_schema_with_permissions.sql`** - Schema with RLS policies and permissions

### 🚀 Setup & Initialization
- **`setup-instructions.sql`** - Supabase setup guide with sample queries
- **`setup-batch-subject-linkage.sql`** - Setup batch-subject relationships
- **`CLEAN-svpcet-curriculum-setup.sql`** - Clean SVPCET curriculum setup

### 📚 Data Insertion
- **`insert_cse_subjects.sql`** - Insert CSE department subjects
- **`insert_full_cse_curriculum.sql`** - Insert complete CSE curriculum data

### 🔧 Fix Scripts
- **`fix-admin-department.sql`** - Fix admin department associations (set to NULL)
- **`fix-admin-access-level.sql`** - Fix admin access levels (set to 'admin')
- **`fix_departments_access.sql`** - Fix department access permissions
- **`fix-supabase-permissions.sql`** - Fix Supabase RLS permissions
- **`fix-manual-scheduling-data.sql`** - Fix manual scheduling data issues
- **`fix-semester-subject-linkage.sql`** - Fix semester-subject relationships
- **`quick-fix-departments.sql`** - Quick department fixes

### 📅 Manual Scheduling
- **`complete-manual-scheduling-fix.sql`** - Complete manual scheduling fix
- **`URGENT-manual-scheduling-fix.sql`** - Urgent scheduling fixes
- **`api-queries-for-manual-scheduling.sql`** - API queries for manual scheduling
- **`verify-manual-scheduling-data.sql`** - Verify manual scheduling data integrity

### ✅ Testing & Validation
- **`test_time_constraint.sql`** - Test time constraints
- **`verify-manual-scheduling-data.sql`** - Verify scheduling data

### 🔨 Utility Scripts
- **`fix-instructions.js`** - JavaScript helper for applying fixes
- **`run-manual-scheduling-fix.js`** - Run manual scheduling fixes
- **`validate_schema.js`** - Validate database schema
- **`open-sql-fix.bat`** - Batch file to open SQL fix scripts

## 🚀 Usage

### Running SQL Scripts in Supabase

1. **Open Supabase Dashboard**
   - Go to your project at [supabase.com/dashboard](https://supabase.com/dashboard)

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Execute Script**
   - Create a new query
   - Copy the SQL script content
   - Paste and click "Run" or press `Ctrl+Enter`

### Running SQL Scripts Locally

If you have PostgreSQL client installed:

```bash
# Connect to Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run a SQL file
\i database/schema.sql

# Or use psql command
psql -h [YOUR-PROJECT-REF].supabase.co -U postgres -d postgres -f database/schema.sql
```

## 📖 Common Workflows

### Initial Setup
```sql
-- 1. Run the main schema
\i database/new_schema.sql

-- 2. Setup permissions
\i database/complete_schema_with_permissions.sql

-- 3. Insert initial data
\i database/insert_full_cse_curriculum.sql
```

### Fixing Admin Access
```sql
-- 1. Fix admin department (set to NULL)
\i database/fix-admin-department.sql

-- 2. Fix admin access level
\i database/fix-admin-access-level.sql
```

### Manual Scheduling Fixes
```sql
-- 1. Run the complete fix
\i database/complete-manual-scheduling-fix.sql

-- 2. Verify the data
\i database/verify-manual-scheduling-data.sql
```

## ⚠️ Important Notes

### Before Running Any SQL Script:

1. **Backup First**: Always backup your database before running destructive operations
   ```sql
   -- In Supabase Dashboard: Settings > Database > Backups
   ```

2. **Review the Script**: Read through the SQL to understand what it does

3. **Test in Development**: Run on a development/staging database first

4. **Check Dependencies**: Some scripts depend on others being run first

5. **Verify Results**: Always verify the changes after running a script

### Script Execution Order

For initial setup, follow this order:

1. `new_schema.sql` or `schema.sql`
2. `complete_schema_with_permissions.sql`
3. `insert_full_cse_curriculum.sql`
4. Any fix scripts as needed

### Dangerous Operations

Scripts that modify data (marked with ⚠️):
- `CLEAN-svpcet-curriculum-setup.sql` - Drops and recreates tables
- All `fix-*.sql` scripts - Modify existing data
- Any script with `DROP` or `DELETE` statements

## 🔗 Related Files

JavaScript utility scripts are organized in the `scripts/` folder.

## 📝 SQL Naming Convention

- `schema*.sql` - Database schema definitions
- `setup-*.sql` - Initial setup and configuration
- `insert-*.sql` - Data insertion scripts
- `fix-*.sql` - Scripts that fix issues
- `verify-*.sql` - Validation and verification
- `test-*.sql` - Testing scripts
- `CLEAN-*.sql` - Clean/reset scripts (dangerous!)
- `URGENT-*.sql` - Critical fix scripts

## 🔍 Finding the Right Script

- **Need to setup database?** → Use `new_schema.sql` or `schema.sql`
- **Admin access issues?** → Use `fix-admin-access-level.sql`
- **Department issues?** → Use `fix-admin-department.sql` or `quick-fix-departments.sql`
- **Scheduling problems?** → Use `complete-manual-scheduling-fix.sql`
- **Need sample data?** → Use `insert_full_cse_curriculum.sql`
- **Verify setup?** → Use `verify-manual-scheduling-data.sql`

## 📚 Documentation Files

- `README.md` - This file (main database documentation)
- `README-manual-scheduling-fix.md` - Detailed manual scheduling fix guide

## 🆘 Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Run `fix-supabase-permissions.sql`
   - Check RLS policies in Supabase dashboard

2. **Admin Can't Login**
   - Run `fix-admin-access-level.sql`
   - Verify role is 'college_admin' in users table

3. **Scheduling Not Working**
   - Run `complete-manual-scheduling-fix.sql`
   - Verify with `verify-manual-scheduling-data.sql`

4. **Department Issues**
   - Run `fix-admin-department.sql`
   - Run `quick-fix-departments.sql`

## 🔐 Security Notes

- Never commit `.env.local` or database credentials
- Use service role key only in backend/scripts
- Enable RLS (Row Level Security) for production
- Review and test permissions scripts before deployment
- Rotate database passwords regularly

## 📞 Support

For issues or questions:
1. Check the relevant README files
2. Review the SQL comments in each script
3. Verify your Supabase connection
4. Check Supabase logs for detailed error messages
