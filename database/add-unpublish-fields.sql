-- Add fields to track unpublishing of timetables
-- Run this on your Supabase SQL editor

ALTER TABLE generated_timetables 
ADD COLUMN IF NOT EXISTS unpublished_reason TEXT,
ADD COLUMN IF NOT EXISTS unpublished_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS unpublished_by UUID REFERENCES users(id);

-- Add comment
COMMENT ON COLUMN generated_timetables.unpublished_reason IS 'Reason why timetable was unpublished by publisher';
COMMENT ON COLUMN generated_timetables.unpublished_at IS 'Timestamp when timetable was unpublished';
COMMENT ON COLUMN generated_timetables.unpublished_by IS 'ID of the publisher who unpublished the timetable';
