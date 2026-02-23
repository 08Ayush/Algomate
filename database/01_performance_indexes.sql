-- Indexes for generated_timetables to optimize filtering and joining
CREATE INDEX IF NOT EXISTS idx_generated_timetables_batch_id ON generated_timetables(batch_id);
CREATE INDEX IF NOT EXISTS idx_generated_timetables_department_id ON generated_timetables(department_id);
CREATE INDEX IF NOT EXISTS idx_generated_timetables_college_id ON generated_timetables(college_id);
CREATE INDEX IF NOT EXISTS idx_generated_timetables_created_by ON generated_timetables(created_by);
-- Check if generation_task_id exists and index it if so (assuming it does based on code)
-- CREATE INDEX IF NOT EXISTS idx_generated_timetables_task_id ON generated_timetables(generation_task_id);

-- Indexes for batches to optimize lookups
CREATE INDEX IF NOT EXISTS idx_batches_department_id ON batches(department_id);

-- Indexes for scheduled_classes (finding classes by timetable is very common)
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_timetable_id ON scheduled_classes(timetable_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_faculty_id ON scheduled_classes(faculty_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_classroom_id ON scheduled_classes(classroom_id);

-- General cleanup / analysis
ANALYZE generated_timetables;
ANALYZE scheduled_classes;
ANALYZE batches;
ANALYZE users;
