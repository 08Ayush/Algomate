-- Fix: Add ON DELETE CASCADE to ALL foreign keys referencing generated_timetables
-- This prevents "Unable to delete row" errors when deleting timetables.
-- Run this in Supabase SQL Editor.

-- 1. notifications.timetable_id (already done if you ran the previous fix)
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_timetable_id_fkey;

ALTER TABLE notifications
ADD CONSTRAINT notifications_timetable_id_fkey
FOREIGN KEY (timetable_id) REFERENCES generated_timetables(id) ON DELETE CASCADE;

-- 2. workflow_approvals.timetable_id
ALTER TABLE workflow_approvals
DROP CONSTRAINT IF EXISTS workflow_approvals_timetable_id_fkey;

ALTER TABLE workflow_approvals
ADD CONSTRAINT workflow_approvals_timetable_id_fkey
FOREIGN KEY (timetable_id) REFERENCES generated_timetables(id) ON DELETE CASCADE;

-- 3. master_accepted_timetables.original_timetable_id
ALTER TABLE master_accepted_timetables
DROP CONSTRAINT IF EXISTS master_accepted_timetables_original_timetable_id_fkey;

ALTER TABLE master_accepted_timetables
ADD CONSTRAINT master_accepted_timetables_original_timetable_id_fkey
FOREIGN KEY (original_timetable_id) REFERENCES generated_timetables(id) ON DELETE CASCADE;
