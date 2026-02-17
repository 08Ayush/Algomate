-- Fix: Add ON DELETE CASCADE to ALL foreign keys referencing subjects
-- This allows subjects to be deleted cleanly across all related tables.
-- Run this in Supabase SQL Editor.

-- 1. faculty_qualified_subjects.subject_id
ALTER TABLE faculty_qualified_subjects
DROP CONSTRAINT IF EXISTS faculty_qualified_subjects_subject_id_fkey;

ALTER TABLE faculty_qualified_subjects
ADD CONSTRAINT faculty_qualified_subjects_subject_id_fkey
FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

-- 2. batch_subjects.subject_id
ALTER TABLE batch_subjects
DROP CONSTRAINT IF EXISTS batch_subjects_subject_id_fkey;

ALTER TABLE batch_subjects
ADD CONSTRAINT batch_subjects_subject_id_fkey
FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

-- 3. master_scheduled_classes.subject_id
ALTER TABLE master_scheduled_classes
DROP CONSTRAINT IF EXISTS master_scheduled_classes_subject_id_fkey;

ALTER TABLE master_scheduled_classes
ADD CONSTRAINT master_scheduled_classes_subject_id_fkey
FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

-- 4. assignment_notifications.subject_id (SET NULL is appropriate here)
ALTER TABLE assignment_notifications
DROP CONSTRAINT IF EXISTS assignment_notifications_subject_id_fkey;

ALTER TABLE assignment_notifications
ADD CONSTRAINT assignment_notifications_subject_id_fkey
FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

-- 5. exam_notifications.subject_id (SET NULL is appropriate here)
ALTER TABLE exam_notifications
DROP CONSTRAINT IF EXISTS exam_notifications_subject_id_fkey;

ALTER TABLE exam_notifications
ADD CONSTRAINT exam_notifications_subject_id_fkey
FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;
