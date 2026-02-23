# Scripts Folder

This folder contains all utility and helper JavaScript scripts for database management, testing, and debugging.

## 📁 Folder Organization

All JavaScript utility scripts have been moved here from the root directory to keep the project organized.

## 📋 Script Categories

### 🔐 Authentication & User Management
- `check-admin-role.js` - Verify admin user role in database
- `check-all-users.js` - List all users in the database
- `check-user.js` - Check specific user details
- `create-admin.js` - Create admin user accounts
- `cleanup-test-users.js` - Remove test user accounts
- `find-admin-users.js` - Find all admin users

### 🐛 Debugging Scripts
- `debug-data-retrieval.js` - Debug data fetching issues
- `debug-login-query.js` - Debug login query issues
- `debug-password.js` - Debug password hashing/verification

### 🗄️ Database Management
- `check-database-structure.js` - Verify database schema
- `deploy-schema.js` - Deploy database schema
- `fix-admin-department.js` - Fix admin department associations
- `fix-admin-access-level.js` - Fix admin access levels
- `fix-database-directly.js` - Direct database fixes
- `verify-database-status.js` - Verify database status
- `verify-schema.js` - Verify database schema

### 📚 Curriculum & Subjects
- `insert-cse-faculty.js` - Insert CSE faculty data
- `insert-cse-subjects.js` - Insert CSE subjects
- `insert-full-cse-curriculum.js` - Insert complete CSE curriculum
- `setup-svpcet-curriculum.js` - Setup SVPCET curriculum
- `setup-multi-college-system.js` - Setup multi-college system
- `show-available-subjects.js` - Display available subjects
- `show-faculty-details.js` - Display faculty details
- `show-system-summary.js` - Show system summary

### 📅 Scheduling Scripts
- `manual-scheduling-diagnostic.js` - Diagnose scheduling issues
- `manual-scheduling-enhanced.js` - Enhanced manual scheduling
- `manual-scheduling-summary.js` - Scheduling summary
- `validate-manual-scheduling.js` - Validate scheduling data
- `map-faculty-subjects.js` - Map faculty to subjects

## 🚀 Usage

Most scripts require environment variables from `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Running a Script

```bash
# Basic usage
node scripts/script-name.js

# Example: Check admin role
node scripts/check-admin-role.js

# Example: Show system summary
node scripts/show-system-summary.js
```

## ⚠️ Important Notes

1. **Environment Variables**: All scripts need proper Supabase credentials
2. **Service Role Key**: Some scripts require the service role key (admin access)
3. **Backup First**: Always backup your database before running fix/cleanup scripts
4. **Production Safety**: Be careful running these scripts on production databases

## 🔧 Development Workflow

1. **Testing**: Use test scripts to verify functionality
2. **Debugging**: Use debug scripts when issues arise
3. **Fixes**: Apply fix scripts carefully with backups
4. **Validation**: Always validate changes with verify scripts

## 📝 Script Naming Convention

- `check-*` - Read-only verification scripts
- `debug-*` - Debugging and diagnostic tools
- `fix-*` - Scripts that modify data
- `insert-*` - Data insertion scripts
- `setup-*` - Initial setup and configuration
- `show-*` - Display/reporting scripts
- `validate-*` - Data validation scripts
- `verify-*` - Schema/structure verification

## 🔗 Related Files

SQL scripts are organized in the `database/` folder.
