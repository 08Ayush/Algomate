# Academic Compass Database Setup

This directory contains the complete database schema and setup instructions for the Academic Compass timetabling system using Supabase (PostgreSQL).

## 📁 Files Overview

- **`schema.sql`** - Complete database schema with all tables, constraints, indexes, and sample data
- **`setup-instructions.sql`** - Supabase setup guide, sample queries, and maintenance scripts  
- **`.env.example`** - Environment variables template for Supabase configuration
- **`README.md`** - This file

## 🚀 Quick Setup Guide

### 1. Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Choose your region and set a strong database password

### 2. Execute Database Schema
1. Open the SQL Editor in your Supabase dashboard
2. Copy the entire contents of `schema.sql`
3. Paste and execute the SQL to create all tables and relationships

### 3. Configure Environment Variables
1. Copy `.env.example` to `.env.local` in your project root
2. Fill in your Supabase project URL and API keys from Project Settings > API
3. Add any additional configuration as needed

### 4. Verify Installation
Run these queries in the SQL Editor to verify everything is set up correctly:

```sql
-- Check all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check sample data
SELECT name, code FROM departments ORDER BY name;
SELECT name, type, capacity FROM classrooms ORDER BY name;
```

## 🗄️ Database Schema Overview

### Core Tables
- **`users`** - All system users (admins, faculty, students) with role-based access
- **`departments`** - Academic departments (CSE, IT, ECE, etc.)
- **`subjects`** - Courses/subjects offered by departments
- **`classrooms`** - Available rooms and labs with capacity and facilities
- **`batches`** - Student groups/sections (e.g., "3rd Sem Section A")

### Relationship Tables
- **`faculty_teaching_subjects`** - Which subjects each faculty can teach
- **`batch_curriculum`** - Subjects assigned to each batch with weekly hours
- **`faculty_preferences`** - Faculty scheduling preferences and constraints
- **`student_batch_enrollment`** - Student enrollment in batches

### Timetabling System
- **`timetables`** - Complete timetables with approval workflow
- **`timetable_slots`** - Individual class sessions with conflict prevention
- **`audit_logs`** - System activity logging for accountability

## 🔐 Security Features

### Row Level Security (RLS)
- Enabled on sensitive tables (`users`, `timetables`, `faculty_preferences`, `audit_logs`)
- Users can only access their own data unless they have admin privileges
- Customizable policies based on your authentication needs

### Data Validation
- Email format validation
- Time slot conflict prevention (classroom and faculty double-booking)
- Credit hours and capacity constraints
- Academic year and semester validation

### Audit Trail
- Automatic logging of important changes
- User action tracking with timestamps
- JSONB storage for flexible audit data

## 📈 Performance Optimizations

### Indexes
- Primary key indexes on all tables
- Composite indexes for common query patterns
- Specialized indexes for time-based queries
- Foreign key relationship indexes

### Constraints
- Unique constraints prevent data duplication
- Check constraints ensure data validity
- Foreign key constraints maintain referential integrity
- Exclusion constraints prevent scheduling conflicts

## 🔧 Maintenance & Operations

### Regular Maintenance
```sql
-- Clean old audit logs (run monthly)
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';

-- Update batch student counts
UPDATE batches SET student_count = (
    SELECT COUNT(*) FROM student_batch_enrollment 
    WHERE batch_id = batches.id AND is_active = true
);

-- Find scheduling conflicts (should return empty)
SELECT * FROM timetable_slots t1
JOIN timetable_slots t2 ON t1.classroom_id = t2.classroom_id
WHERE t1.id < t2.id AND t1.day = t2.day
AND t1.start_time < t2.end_time AND t1.end_time > t2.start_time;
```

### Backup Strategy
- Supabase provides automatic backups
- Export critical data regularly using SQL queries
- Monitor database size and performance metrics

## 🎯 Next Steps

1. **Execute the schema** in your Supabase project
2. **Configure authentication** providers (email, Google, etc.)
3. **Set up your environment variables** in the Next.js application
4. **Test the connection** using the provided Supabase client utilities
5. **Customize RLS policies** based on your specific requirements
6. **Add sample data** using the queries in `setup-instructions.sql`

## 📝 Schema Statistics

- **12 main tables** with comprehensive relationships
- **5 enum types** for data consistency  
- **20+ indexes** for optimal query performance
- **4 RLS policies** for security
- **10+ constraints** for data integrity
- **Sample data** for 10 departments and 5 classrooms

## 🤝 Support

If you encounter any issues with the database setup:

1. Check the Supabase dashboard for error messages
2. Verify your environment variables are correct
3. Ensure you have the necessary permissions in Supabase
4. Review the sample queries in `setup-instructions.sql`

The schema is designed to be production-ready with proper security, performance optimizations, and comprehensive audit trails for a complete academic timetabling system.