-- ============================================================================
-- SEED DATA: DEFAULT CONSTRAINT WEIGHTS FOR SCHEDULING
-- ============================================================================
-- Run this after creating the schema to insert default configurations
-- ============================================================================

-- Function to insert default constraints for a college
CREATE OR REPLACE FUNCTION insert_default_scheduling_constraints(p_college_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Hard Constraints (must be satisfied)
    INSERT INTO scheduling_constraints (college_id, constraint_type, constraint_name, is_enabled, weight, description, parameters)
    VALUES 
        (p_college_id, 'hard', 'no_teacher_overlap', TRUE, 100, 
         'Faculty cannot teach two classes at the same time',
         '{"violation_penalty": 1000}'::jsonb),
         
        (p_college_id, 'hard', 'no_room_overlap', TRUE, 100, 
         'A room cannot host two classes at the same time',
         '{"violation_penalty": 1000}'::jsonb),
         
        (p_college_id, 'hard', 'no_student_overlap', TRUE, 100, 
         'A batch/section cannot attend two classes simultaneously',
         '{"violation_penalty": 1000}'::jsonb),
         
        (p_college_id, 'hard', 'room_capacity', TRUE, 100, 
         'Room capacity must accommodate all students',
         '{"allow_overflow_percentage": 10}'::jsonb),
         
        (p_college_id, 'hard', 'lab_room_requirement', TRUE, 100, 
         'Lab sessions must be scheduled in lab rooms',
         '{"violation_penalty": 1000}'::jsonb),
         
        (p_college_id, 'hard', 'faculty_qualification', TRUE, 100, 
         'Only qualified faculty can teach a subject',
         '{"check_specialization": true}'::jsonb)
    ON CONFLICT (college_id, constraint_name) DO UPDATE
    SET weight = EXCLUDED.weight,
        description = EXCLUDED.description,
        parameters = EXCLUDED.parameters;

    -- Soft Constraints (optimization objectives)
    INSERT INTO scheduling_constraints (college_id, constraint_type, constraint_name, is_enabled, weight, description, parameters)
    VALUES 
        (p_college_id, 'soft', 'minimize_gaps', TRUE, 50, 
         'Minimize gaps/free periods in student schedules',
         '{"max_acceptable_gaps": 2, "penalty_per_gap": 10}'::jsonb),
         
        (p_college_id, 'soft', 'preferred_time_slots', TRUE, 30, 
         'Schedule theory classes in morning slots when possible',
         '{"preferred_theory_hours": ["08:00", "09:00", "10:00", "11:00"]}'::jsonb),
         
        (p_college_id, 'soft', 'workload_balance', TRUE, 40, 
         'Balance faculty workload evenly across days',
         '{"max_variance": 2}'::jsonb),
         
        (p_college_id, 'soft', 'room_stability', TRUE, 20, 
         'Prefer same room for same subject across the week',
         '{"bonus_for_same_room": 5}'::jsonb),
         
        (p_college_id, 'soft', 'consecutive_lectures', TRUE, 35, 
         'Limit maximum consecutive teaching hours for faculty',
         '{"max_consecutive": 3, "penalty_per_extra": 15}'::jsonb),
         
        (p_college_id, 'soft', 'department_clustering', TRUE, 25, 
         'Keep classes of same department in nearby rooms',
         '{"prefer_same_floor": true}'::jsonb),
         
        (p_college_id, 'soft', 'elective_distribution', TRUE, 30, 
         'Spread elective subjects across different days',
         '{"min_days_between_same_elective": 1}'::jsonb),
         
        (p_college_id, 'soft', 'lunch_break', TRUE, 45, 
         'Ensure lunch break is not scheduled with classes',
         '{"lunch_start": "12:30", "lunch_end": "13:30"}'::jsonb),
         
        (p_college_id, 'soft', 'late_slot_avoidance', TRUE, 25, 
         'Avoid scheduling difficult subjects in late afternoon',
         '{"avoid_after": "16:00", "subjects": ["mathematics", "physics"]}'::jsonb)
    ON CONFLICT (college_id, constraint_name) DO UPDATE
    SET weight = EXCLUDED.weight,
        description = EXCLUDED.description,
        parameters = EXCLUDED.parameters;
END;
$$ LANGUAGE plpgsql;


-- Function to set up default algorithm configuration for a college
CREATE OR REPLACE FUNCTION get_default_algorithm_config()
RETURNS JSONB AS $$
BEGIN
    RETURN '{
        "cpsat": {
            "max_time_seconds": 300,
            "num_workers": 8,
            "num_solutions": 10,
            "log_search_progress": false
        },
        "ga": {
            "population_size": 100,
            "generations": 200,
            "elite_size": 10,
            "mutation_rate": 0.15,
            "crossover_rate": 0.8,
            "tournament_size": 5,
            "stagnation_limit": 30
        },
        "hybrid": {
            "cpsat_weight": 0.6,
            "ga_weight": 0.4,
            "use_cpsat_seed": true,
            "parallel_mode": true
        },
        "constraint_weights": {
            "minimize_gaps": 50,
            "preferred_time_slots": 30,
            "workload_balance": 40,
            "room_stability": 20,
            "consecutive_lectures": 35,
            "department_clustering": 25,
            "elective_distribution": 30
        }
    }'::jsonb;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Create a view for easy constraint lookup
CREATE OR REPLACE VIEW v_scheduling_constraints_summary AS
SELECT 
    c.name as college_name,
    sc.constraint_type,
    sc.constraint_name,
    sc.is_enabled,
    sc.weight,
    sc.description,
    sc.parameters
FROM scheduling_constraints sc
JOIN colleges c ON sc.college_id = c.id
ORDER BY c.name, sc.constraint_type DESC, sc.weight DESC;


-- Create a view for task execution summary
-- Note: Using actual column names from new_schema.sql
CREATE OR REPLACE VIEW v_task_execution_summary AS
SELECT 
    t.id as task_id,
    c.name as college_name,
    b.name as batch_name,
    t.task_name,
    t.status::text as status,
    t.current_phase::text as current_phase,
    t.progress as progress_percentage,
    t.current_message as progress_message,
    t.created_at,
    t.started_at,
    t.completed_at,
    t.execution_time_seconds as duration_seconds,
    t.best_fitness_score,
    t.solutions_generated,
    t.error_details,
    
    -- CP-SAT metrics (from single row)
    m.cpsat_solutions_found as cpsat_solutions,
    m.cpsat_execution_time_ms / 1000.0 as cpsat_duration_seconds,
    m.cpsat_variables_created,
    m.cpsat_constraints_generated,
    
    -- GA metrics (from single row)
    m.ga_best_fitness as ga_score,
    m.ga_execution_time_ms / 1000.0 as ga_duration_seconds,
    m.ga_generations_completed as ga_generations,
    m.ga_fitness_improvement,
    
    -- Overall metrics
    m.total_execution_time_ms / 1000.0 as total_duration_seconds,
    m.hard_constraints_satisfied,
    m.soft_constraints_satisfied,
    m.faculty_utilization_rate,
    m.classroom_utilization_rate
    
FROM timetable_generation_tasks t
LEFT JOIN colleges c ON c.id = (SELECT college_id FROM batches WHERE id = t.batch_id)
JOIN batches b ON t.batch_id = b.id
LEFT JOIN algorithm_execution_metrics m ON m.generation_task_id = t.id
ORDER BY t.created_at DESC;


-- Grant access to the views
GRANT SELECT ON v_scheduling_constraints_summary TO authenticated;
GRANT SELECT ON v_task_execution_summary TO authenticated;


-- ============================================================================
-- SAMPLE USAGE: Insert constraints for a specific college
-- ============================================================================
-- To use after creating a college:
--
-- SELECT insert_default_scheduling_constraints('your-college-uuid-here');
--
-- Or for all existing colleges:
--
-- SELECT insert_default_scheduling_constraints(id) FROM colleges;
-- ============================================================================
