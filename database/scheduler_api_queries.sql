-- ============================================================================
-- API QUERIES FOR HYBRID SCHEDULER
-- ============================================================================
-- These are the SQL queries used by the scheduling API endpoints
-- Copy these into your Next.js API routes or Supabase Edge Functions
-- ============================================================================

-- ============================================================================
-- 1. TASK MANAGEMENT QUERIES
-- ============================================================================

-- Create a new scheduling task
-- Used in: POST /api/scheduler/tasks
/*
INSERT INTO timetable_generation_tasks (
    college_id,
    batch_id,
    created_by,
    status,
    algorithm_config
)
VALUES (
    $1,  -- college_id
    $2,  -- batch_id
    $3,  -- created_by (auth.uid())
    'pending',
    $4   -- algorithm_config JSONB
)
RETURNING *;
*/


-- Get task status with metrics
-- Used in: GET /api/scheduler/tasks/[taskId]
/*
SELECT 
    t.*,
    json_build_object(
        'cpsat', (
            SELECT json_build_object(
                'duration', m.duration_seconds,
                'solutions', m.solutions_found,
                'score', m.final_score
            )
            FROM algorithm_execution_metrics m
            WHERE m.task_id = t.id AND m.phase = 'cpsat'
        ),
        'ga', (
            SELECT json_build_object(
                'duration', m.duration_seconds,
                'generations', m.iterations,
                'score', m.final_score
            )
            FROM algorithm_execution_metrics m
            WHERE m.task_id = t.id AND m.phase = 'ga'
        )
    ) as metrics
FROM timetable_generation_tasks t
WHERE t.id = $1;
*/


-- List tasks for a college with pagination
-- Used in: GET /api/scheduler/tasks?collegeId=xxx&page=1&limit=10
/*
SELECT 
    t.id,
    t.status,
    t.progress_percentage,
    t.progress_message,
    t.created_at,
    t.completed_at,
    b.name as batch_name,
    u.first_name || ' ' || u.last_name as created_by_name
FROM timetable_generation_tasks t
JOIN batches b ON t.batch_id = b.id
JOIN users u ON t.created_by = u.id
WHERE t.college_id = $1
ORDER BY t.created_at DESC
LIMIT $2 OFFSET $3;
*/


-- ============================================================================
-- 2. DATA FETCHING FOR SCHEDULER
-- ============================================================================

-- Get all subjects for scheduling
-- Used by: SchedulerService.loadSubjects()
/*
SELECT 
    s.id,
    s.name,
    s.code,
    s.credits,
    s.weekly_hours,
    s.lab_hours,
    s.requires_lab,
    s.is_elective,
    s.department_id,
    d.name as department_name
FROM subjects s
JOIN departments d ON s.department_id = d.id
WHERE s.college_id = $1
AND s.is_active = TRUE;
*/


-- Get faculty with their subject qualifications
-- Used by: SchedulerService.loadFaculty()
/*
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.department_id,
    u.max_hours_per_day,
    u.max_hours_per_week,
    u.specializations,
    array_agg(DISTINCT fqs.subject_id) as assigned_subjects,
    fsp.preferred_days,
    fsp.preferred_start_time,
    fsp.preferred_end_time,
    fsp.max_consecutive_hours
FROM users u
LEFT JOIN faculty_qualified_subjects fqs ON u.id = fqs.faculty_id
LEFT JOIN faculty_scheduling_preferences fsp ON u.id = fsp.faculty_id
WHERE u.college_id = $1
AND u.role = 'faculty'
AND u.is_active = TRUE
GROUP BY u.id, fsp.id;
*/


-- Get classrooms with capacity and type
-- Used by: SchedulerService.loadClassrooms()
/*
SELECT 
    c.id,
    c.name,
    c.code,
    c.capacity,
    c.is_lab,
    c.lab_type,
    c.building,
    c.floor,
    c.has_projector,
    c.has_ac,
    c.department_id
FROM classrooms c
WHERE c.college_id = $1
AND c.is_available = TRUE;
*/


-- Get time slots with metadata
-- Used by: SchedulerService.loadTimeSlots()
/*
SELECT 
    ts.id,
    ts.day_of_week,
    ts.start_time,
    ts.end_time,
    ts.slot_number,
    ts.is_break,
    ts.is_lunch,
    ts.is_lab_slot,
    EXTRACT(EPOCH FROM (ts.end_time - ts.start_time))/3600 as duration_hours
FROM time_slots ts
WHERE ts.college_id = $1
AND ts.is_break = FALSE
ORDER BY 
    CASE ts.day_of_week
        WHEN 'monday' THEN 1
        WHEN 'tuesday' THEN 2
        WHEN 'wednesday' THEN 3
        WHEN 'thursday' THEN 4
        WHEN 'friday' THEN 5
        WHEN 'saturday' THEN 6
        WHEN 'sunday' THEN 7
    END,
    ts.slot_number;
*/


-- Get batches with sections
-- Used by: SchedulerService.loadBatches()
/*
SELECT 
    b.id,
    b.name,
    b.year,
    b.semester,
    b.student_count,
    b.department_id,
    d.name as department_name,
    json_agg(
        json_build_object(
            'id', s.id,
            'name', s.name,
            'student_count', s.student_count
        )
    ) FILTER (WHERE s.id IS NOT NULL) as sections
FROM batches b
JOIN departments d ON b.department_id = d.id
LEFT JOIN sections s ON s.batch_id = b.id
WHERE b.college_id = $1
AND b.is_active = TRUE
GROUP BY b.id, d.name;
*/


-- ============================================================================
-- 3. TIMETABLE STORAGE QUERIES
-- ============================================================================

-- Save generated timetable
-- Used by: SchedulerService.saveTimetable()
/*
-- First, insert the timetable record
INSERT INTO generated_timetables (
    task_id,
    college_id,
    batch_id,
    name,
    algorithm_source,
    fitness_score,
    hard_constraint_violations,
    version
)
VALUES (
    $1,  -- task_id
    $2,  -- college_id
    $3,  -- batch_id
    $4,  -- name (e.g., 'CSE 2024 Sem 1 - v3')
    $5,  -- algorithm_source ('hybrid')
    $6,  -- fitness_score
    $7,  -- hard_constraint_violations
    (SELECT COALESCE(MAX(version), 0) + 1 FROM generated_timetables WHERE batch_id = $3)
)
RETURNING id;

-- Then, batch insert scheduled classes
INSERT INTO scheduled_classes (
    timetable_id,
    subject_id,
    faculty_id,
    classroom_id,
    batch_id,
    section_id,
    time_slot_id,
    is_lab,
    is_elective
)
SELECT 
    $1,  -- timetable_id
    (value->>'subject_id')::uuid,
    (value->>'faculty_id')::uuid,
    (value->>'classroom_id')::uuid,
    (value->>'batch_id')::uuid,
    (value->>'section_id')::uuid,
    (value->>'time_slot_id')::uuid,
    (value->>'is_lab')::boolean,
    (value->>'is_elective')::boolean
FROM jsonb_array_elements($2);  -- $2 is JSONB array of scheduled classes
*/


-- Get timetable with all scheduled classes
-- Used by: GET /api/timetables/[timetableId]
/*
SELECT 
    gt.*,
    json_agg(
        json_build_object(
            'id', sc.id,
            'subject', json_build_object('id', s.id, 'name', s.name, 'code', s.code),
            'faculty', json_build_object('id', u.id, 'name', u.first_name || ' ' || u.last_name),
            'classroom', json_build_object('id', c.id, 'name', c.name, 'code', c.code),
            'time_slot', json_build_object(
                'id', ts.id,
                'day', ts.day_of_week,
                'start', ts.start_time,
                'end', ts.end_time,
                'slot_number', ts.slot_number
            ),
            'is_lab', sc.is_lab,
            'is_elective', sc.is_elective
        )
        ORDER BY 
            CASE ts.day_of_week
                WHEN 'monday' THEN 1
                WHEN 'tuesday' THEN 2
                WHEN 'wednesday' THEN 3
                WHEN 'thursday' THEN 4
                WHEN 'friday' THEN 5
                WHEN 'saturday' THEN 6
            END,
            ts.slot_number
    ) as scheduled_classes
FROM generated_timetables gt
JOIN scheduled_classes sc ON sc.timetable_id = gt.id
JOIN subjects s ON sc.subject_id = s.id
JOIN users u ON sc.faculty_id = u.id
JOIN classrooms c ON sc.classroom_id = c.id
JOIN time_slots ts ON sc.time_slot_id = ts.id
WHERE gt.id = $1
GROUP BY gt.id;
*/


-- ============================================================================
-- 4. CONFLICT DETECTION QUERIES
-- ============================================================================

-- Check faculty conflicts
/*
SELECT 
    f.name as faculty_name,
    ts.day_of_week,
    ts.start_time,
    ts.end_time,
    COUNT(*) as conflict_count,
    array_agg(s.name) as conflicting_subjects
FROM scheduled_classes sc
JOIN faculty f ON sc.faculty_id = f.id
JOIN time_slots ts ON sc.time_slot_id = ts.id
JOIN subjects s ON sc.subject_id = s.id
WHERE sc.timetable_id = $1
GROUP BY f.id, f.name, ts.id, ts.day_of_week, ts.start_time, ts.end_time
HAVING COUNT(*) > 1;
*/


-- Check room conflicts
/*
SELECT 
    c.name as room_name,
    ts.day_of_week,
    ts.start_time,
    ts.end_time,
    COUNT(*) as conflict_count,
    array_agg(s.name) as conflicting_subjects
FROM scheduled_classes sc
JOIN classrooms c ON sc.classroom_id = c.id
JOIN time_slots ts ON sc.time_slot_id = ts.id
JOIN subjects s ON sc.subject_id = s.id
WHERE sc.timetable_id = $1
GROUP BY c.id, c.name, ts.id, ts.day_of_week, ts.start_time, ts.end_time
HAVING COUNT(*) > 1;
*/


-- ============================================================================
-- 5. ANALYTICS QUERIES
-- ============================================================================

-- Get faculty workload distribution
/*
SELECT 
    u.first_name || ' ' || u.last_name as name,
    ts.day_of_week,
    COUNT(*) as classes_count,
    SUM(EXTRACT(EPOCH FROM (ts.end_time - ts.start_time))/3600) as teaching_hours
FROM scheduled_classes sc
JOIN users u ON sc.faculty_id = u.id
JOIN time_slots ts ON sc.time_slot_id = ts.id
WHERE sc.timetable_id = $1
GROUP BY u.id, u.first_name, u.last_name, ts.day_of_week
ORDER BY u.first_name, u.last_name, 
    CASE ts.day_of_week
        WHEN 'monday' THEN 1
        WHEN 'tuesday' THEN 2
        WHEN 'wednesday' THEN 3
        WHEN 'thursday' THEN 4
        WHEN 'friday' THEN 5
        WHEN 'saturday' THEN 6
    END;
*/


-- Get room utilization
/*
SELECT 
    c.name as room_name,
    c.capacity,
    COUNT(DISTINCT sc.time_slot_id) as slots_used,
    (SELECT COUNT(*) FROM time_slots WHERE college_id = c.college_id AND is_break = FALSE) as total_slots,
    ROUND(
        COUNT(DISTINCT sc.time_slot_id)::numeric / 
        (SELECT COUNT(*) FROM time_slots WHERE college_id = c.college_id AND is_break = FALSE) * 100,
        2
    ) as utilization_percentage
FROM classrooms c
LEFT JOIN scheduled_classes sc ON sc.classroom_id = c.id AND sc.timetable_id = $1
WHERE c.college_id = $2
GROUP BY c.id, c.name, c.capacity
ORDER BY utilization_percentage DESC;
*/


-- Get GA evolution statistics
/*
SELECT 
    generation_number,
    best_fitness,
    avg_fitness,
    worst_fitness,
    diversity_score
FROM ga_population_snapshots
WHERE task_id = $1
ORDER BY generation_number;
*/
