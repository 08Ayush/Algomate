# Supabase Database Backup & Export Guide

## 📋 Overview

This guide provides multiple methods to backup and export data from your Supabase PostgreSQL database.

**Your Supabase Project**: `hwfdzrqfesebmuzgqmpe`

---

## 🚀 Quick Start

### Prerequisites

**Install PostgreSQL Client Tools** (includes `pg_dump` and `psql`):
- **Windows**: https://www.postgresql.org/download/windows/
- Download the installer and select "Command Line Tools" during installation
- Or use: `winget install PostgreSQL.PostgreSQL`

**Verify Installation**:
```cmd
pg_dump --version
psql --version
```

---

## 💾 Method 1: Full Database Backup (Recommended)

### Using Provided Script

```cmd
cd d:\COMP\academic_campass_2025
scripts\dump_supabase_data.bat
```

**What it does**:
- ✅ Creates full database backup (schema + data)
- ✅ Creates schema-only backup
- ✅ Creates data-only backup
- ✅ Saves to `database/backups/` directory
- ✅ Auto-timestamps all backups

**Enter when prompted**:
- Password: Found in Supabase Dashboard → Settings → Database → Database password

### Manual Command

```cmd
REM Full backup
pg_dump -h db.hwfdzrqfesebmuzgqmpe.supabase.co -p 5432 -U postgres -d postgres -F p -f database\backups\supabase_backup.sql

REM Schema only
pg_dump -h db.hwfdzrqfesebmuzgqmpe.supabase.co -p 5432 -U postgres -d postgres -F p --schema-only -f database\backups\schema_only.sql

REM Data only
pg_dump -h db.hwfdzrqfesebmuzgqmpe.supabase.co -p 5432 -U postgres -d postgres -F p --data-only -f database\backups\data_only.sql
```

---

## 📊 Method 2: Export Specific Tables

### Using Provided Script

```cmd
scripts\dump_specific_tables.bat
```

**Exports these tables**:
- colleges
- departments
- users
- courses
- subjects
- batches
- classrooms
- time_slots
- elective_buckets
- student_course_selections
- generated_timetables
- scheduled_classes

**Output**: `database/backups/tables/`

### Manual Single Table Export

```cmd
REM Export single table
pg_dump -h db.hwfdzrqfesebmuzgqmpe.supabase.co -p 5432 -U postgres -d postgres -t public.subjects -f subjects_backup.sql
```

---

## 📁 Method 3: Export as CSV Files

### Using Provided Script

```cmd
scripts\dump_data_as_csv.bat
```

**Benefits**:
- ✅ Easy to view in Excel/Google Sheets
- ✅ Can be imported into other databases
- ✅ Human-readable format
- ✅ Excludes sensitive data (passwords)

**Output**: `database/backups/csv/`

### Manual CSV Export

```cmd
REM Export colleges as CSV
psql -h db.hwfdzrqfesebmuzgqmpe.supabase.co -p 5432 -U postgres -d postgres -c "\COPY (SELECT * FROM colleges) TO 'colleges.csv' WITH CSV HEADER"

REM Export with custom query
psql -h db.hwfdzrqfesebmuzgqmpe.supabase.co -p 5432 -U postgres -d postgres -c "\COPY (SELECT id, name, email FROM users WHERE role = 'student') TO 'students.csv' WITH CSV HEADER"
```

---

## 🌐 Method 4: Using Supabase Dashboard

**Steps**:
1. Go to https://supabase.com/dashboard
2. Select project: `hwfdzrqfesebmuzgqmpe`
3. Navigate to **Database** → **Backups**
4. Click **Download** on latest backup
5. Or use **SQL Editor** to run custom queries

**SQL Editor Custom Export**:
```sql
-- Export all subjects for ITEP course
SELECT * FROM subjects 
WHERE course_id = (SELECT id FROM courses WHERE code = 'ITEP');

-- Export all users by role
SELECT id, first_name, last_name, email, role 
FROM users 
WHERE college_id = (SELECT id FROM colleges WHERE code = 'GCOEJ');
```

---

## 🔧 Method 5: Using Supabase CLI

### Install Supabase CLI

```cmd
npm install -g supabase
```

### Login & Link Project

```cmd
supabase login
supabase link --project-ref hwfdzrqfesebmuzgqmpe
```

### Dump Database

```cmd
REM Full dump
supabase db dump -f database\backups\supabase_cli_dump.sql

REM Schema only
supabase db dump --schema-only -f database\backups\schema_cli.sql

REM Data only
supabase db dump --data-only -f database\backups\data_cli.sql

REM Specific tables
supabase db dump --data-only -t public.subjects -t public.courses -f database\backups\specific_tables.sql
```

---

## 📦 Method 6: Programmatic Export (Node.js)

### Create Export Script

```javascript
// scripts/export-data.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://hwfdzrqfesebmuzgqmpe.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function exportTable(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*');
  
  if (error) {
    console.error(`Error exporting ${tableName}:`, error);
    return;
  }
  
  fs.writeFileSync(
    `database/backups/json/${tableName}.json`,
    JSON.stringify(data, null, 2)
  );
  
  console.log(`✓ Exported ${tableName}: ${data.length} rows`);
}

async function exportAll() {
  const tables = [
    'colleges', 'departments', 'users', 'courses', 
    'subjects', 'batches', 'classrooms', 'time_slots',
    'elective_buckets', 'student_course_selections'
  ];
  
  for (const table of tables) {
    await exportTable(table);
  }
}

exportAll();
```

**Run**:
```cmd
node scripts/export-data.js
```

---

## 🗂️ Backup Directory Structure

```
database/
├── backups/
│   ├── supabase_full_backup_20251208_143052.sql
│   ├── supabase_schema_20251208_143052.sql
│   ├── supabase_data_20251208_143052.sql
│   ├── tables/
│   │   ├── colleges_20251208_143052.sql
│   │   ├── departments_20251208_143052.sql
│   │   ├── subjects_20251208_143052.sql
│   │   └── ...
│   ├── csv/
│   │   ├── colleges_20251208_143052.csv
│   │   ├── departments_20251208_143052.csv
│   │   ├── subjects_20251208_143052.csv
│   │   └── ...
│   └── json/
│       ├── colleges.json
│       ├── subjects.json
│       └── ...
```

---

## 🔄 Restore from Backup

### Restore Full Database

```cmd
REM Restore from SQL backup
psql -h db.hwfdzrqfesebmuzgqmpe.supabase.co -p 5432 -U postgres -d postgres -f database\backups\supabase_full_backup_20251208.sql
```

### Restore Specific Table

```cmd
REM Restore single table
psql -h db.hwfdzrqfesebmuzgqmpe.supabase.co -p 5432 -U postgres -d postgres -f database\backups\tables\subjects_20251208.sql
```

### Restore from CSV

```cmd
REM Import CSV into table
psql -h db.hwfdzrqfesebmuzgqmpe.supabase.co -p 5432 -U postgres -d postgres -c "\COPY subjects FROM 'database\backups\csv\subjects_20251208.csv' WITH CSV HEADER"
```

---

## 🔒 Security Best Practices

### 1. Protect Backup Files

```cmd
REM Add to .gitignore
echo database/backups/ >> .gitignore
```

### 2. Exclude Sensitive Data

When exporting users, exclude `password_hash`:
```sql
SELECT id, first_name, last_name, email, role 
FROM users;  -- Without password_hash
```

### 3. Encrypt Backups

```cmd
REM Using 7-Zip
7z a -p -mhe=on database\backups\secure_backup.7z database\backups\*.sql
```

---

## ⏰ Automated Backup Schedule

### Windows Task Scheduler

**Create scheduled task**:
1. Open Task Scheduler
2. Create Basic Task
3. Name: "Supabase Daily Backup"
4. Trigger: Daily at 2:00 AM
5. Action: Start Program
6. Program: `d:\COMP\academic_campass_2025\scripts\dump_supabase_data.bat`

### Using Batch Script with Task Scheduler

```cmd
schtasks /create /tn "Supabase Daily Backup" /tr "d:\COMP\academic_campass_2025\scripts\dump_supabase_data.bat" /sc daily /st 02:00
```

---

## 📊 Backup Size Reference

| Backup Type | Typical Size | Time |
|-------------|--------------|------|
| Full Database | 5-50 MB | 30-60 sec |
| Schema Only | 100-500 KB | 5-10 sec |
| Data Only | 5-50 MB | 30-60 sec |
| Single Table | 10 KB - 5 MB | 5-15 sec |
| CSV Export | 5-30 MB | 30-45 sec |

---

## 🔍 Verify Backup Integrity

### Check SQL File

```cmd
REM Count lines in backup
find /c /v "" database\backups\supabase_full_backup_20251208.sql

REM View first 50 lines
more /E database\backups\supabase_full_backup_20251208.sql
```

### Test Restore (Dry Run)

```cmd
REM Test without actually restoring
pg_restore --list database\backups\supabase_full_backup.sql
```

---

## 🆘 Troubleshooting

### Error: "pg_dump: command not found"

**Solution**: Install PostgreSQL client tools
```cmd
winget install PostgreSQL.PostgreSQL
```

### Error: "password authentication failed"

**Solution**: 
1. Check password in Supabase Dashboard → Settings → Database
2. Use service role key instead of anon key
3. Verify you're using `postgres` user

### Error: "connection refused"

**Solution**:
1. Check if project is paused in Supabase Dashboard
2. Verify host: `db.hwfdzrqfesebmuzgqmpe.supabase.co`
3. Check port: `5432`

### Error: "permission denied"

**Solution**: Ensure output directory exists
```cmd
mkdir database\backups
mkdir database\backups\tables
mkdir database\backups\csv
```

---

## 📞 Support Resources

**Supabase Documentation**:
- Database Backups: https://supabase.com/docs/guides/platform/backups
- pg_dump Guide: https://supabase.com/docs/guides/database/backup

**PostgreSQL Documentation**:
- pg_dump: https://www.postgresql.org/docs/current/app-pgdump.html
- pg_restore: https://www.postgresql.org/docs/current/app-pgrestore.html

---

## ✅ Backup Checklist

- [ ] Install PostgreSQL client tools (`pg_dump`, `psql`)
- [ ] Get database password from Supabase Dashboard
- [ ] Create backup directories
- [ ] Run full database backup
- [ ] Verify backup file size
- [ ] Test restore on development database
- [ ] Set up automated daily backups
- [ ] Store backups in secure location
- [ ] Document backup procedures for team

---

**Last Updated**: December 8, 2025  
**Database**: Supabase PostgreSQL  
**Project ID**: hwfdzrqfesebmuzgqmpe
