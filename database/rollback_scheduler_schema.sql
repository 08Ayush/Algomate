-- ============================================================================
-- ROLLBACK SCRIPT: REMOVE HYBRID SCHEDULER TABLES
-- ============================================================================
-- Use this script to remove all hybrid scheduler tables if needed
-- WARNING: This will delete all scheduling data!
-- ============================================================================

-- Disable RLS first (to avoid policy issues during drop)
ALTER TABLE IF EXISTS timetable_generation_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS generated_timetables DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scheduled_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS algorithm_execution_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ga_population_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scheduling_constraints DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS faculty_scheduling_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS faculty_subject_assignments DISABLE ROW LEVEL SECURITY;

-- Drop views
DROP VIEW IF EXISTS v_task_execution_summary CASCADE;
DROP VIEW IF EXISTS v_scheduling_constraints_summary CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_task_progress(UUID, VARCHAR, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_active_timetable(UUID) CASCADE;
DROP FUNCTION IF EXISTS activate_timetable(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_scheduling_conflicts(UUID) CASCADE;
DROP FUNCTION IF EXISTS insert_default_scheduling_constraints(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_default_algorithm_config() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_timetable_tasks_updated_at ON timetable_generation_tasks;
DROP TRIGGER IF EXISTS update_scheduling_constraints_updated_at ON scheduling_constraints;
DROP TRIGGER IF EXISTS update_faculty_preferences_updated_at ON faculty_scheduling_preferences;

-- Drop tables (in order due to foreign key dependencies)
DROP TABLE IF EXISTS ga_population_snapshots CASCADE;
DROP TABLE IF EXISTS algorithm_execution_metrics CASCADE;
DROP TABLE IF EXISTS scheduled_classes CASCADE;
DROP TABLE IF EXISTS generated_timetables CASCADE;
DROP TABLE IF EXISTS timetable_generation_tasks CASCADE;
DROP TABLE IF EXISTS faculty_scheduling_preferences CASCADE;
DROP TABLE IF EXISTS scheduling_constraints CASCADE;
DROP TABLE IF EXISTS faculty_subject_assignments CASCADE;

-- Remove added columns from existing tables (optional - comment out if you want to keep them)
/*
ALTER TABLE subjects DROP COLUMN IF EXISTS requires_lab;
ALTER TABLE subjects DROP COLUMN IF EXISTS weekly_hours;
ALTER TABLE subjects DROP COLUMN IF EXISTS is_elective;
ALTER TABLE subjects DROP COLUMN IF EXISTS lab_hours;

ALTER TABLE classrooms DROP COLUMN IF EXISTS is_lab;
ALTER TABLE classrooms DROP COLUMN IF EXISTS lab_type;
ALTER TABLE classrooms DROP COLUMN IF EXISTS has_projector;
ALTER TABLE classrooms DROP COLUMN IF EXISTS has_ac;

ALTER TABLE faculty DROP COLUMN IF EXISTS max_hours_per_day;
ALTER TABLE faculty DROP COLUMN IF EXISTS max_hours_per_week;
ALTER TABLE faculty DROP COLUMN IF EXISTS specializations;

ALTER TABLE time_slots DROP COLUMN IF EXISTS slot_number;
ALTER TABLE time_slots DROP COLUMN IF EXISTS is_break;
ALTER TABLE time_slots DROP COLUMN IF EXISTS is_lunch;
ALTER TABLE time_slots DROP COLUMN IF EXISTS is_lab_slot;

ALTER TABLE batches DROP COLUMN IF EXISTS student_count;
ALTER TABLE batches DROP COLUMN IF EXISTS section_count;
*/

-- Drop indexes that were added
DROP INDEX IF EXISTS idx_subjects_is_elective;
DROP INDEX IF EXISTS idx_subjects_requires_lab;
DROP INDEX IF EXISTS idx_classrooms_is_lab;
DROP INDEX IF EXISTS idx_time_slots_slot_number;
DROP INDEX IF EXISTS idx_time_slots_day;
DROP INDEX IF EXISTS idx_faculty_assignments;

-- Verify tables are dropped
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'timetable_generation_tasks',
    'generated_timetables', 
    'scheduled_classes',
    'algorithm_execution_metrics',
    'ga_population_snapshots',
    'scheduling_constraints',
    'faculty_scheduling_preferences',
    'faculty_subject_assignments'
);
-- Should return empty result if rollback was successful
