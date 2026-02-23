# Task 3: Database Schema Gap Analysis

**Date:** January 24, 2026  
**Analyst:** ML Ops Engineering  
**Project:** Academic Compass - NEP 2020 Timetable Scheduler

---

## Executive Summary

This document compares the current database schema (`new_schema.sql`) against the requirements of the hybrid CP-SAT + GA scheduling pipeline. The schema is **95% ready** for production use, with only minor additions recommended for GA population tracking and debugging.

---

## 1. Schema Overview

### 1.1 Current Tables (Algorithm-Related)

| Table | Purpose | Status |
|-------|---------|--------|
| `colleges` | Multi-tenant root | ✅ Ready |
| `departments` | Faculty/batch organization | ✅ Ready |
| `users` | Faculty with preferences | ✅ Ready |
| `subjects` | Course subjects with NEP fields | ✅ Ready |
| `elective_buckets` | NEP 2020 Major/Minor pools | ✅ Ready |
| `batches` | Student cohorts | ✅ Ready |
| `classrooms` | Rooms with features | ✅ Ready |
| `time_slots` | Scheduling windows | ✅ Ready |
| `faculty_qualified_subjects` | Faculty capabilities | ✅ Ready |
| `faculty_availability` | Faculty schedule | ✅ Ready |
| `batch_subjects` | Curriculum + faculty assignment | ✅ Ready |
| `constraint_rules` | Hard/soft constraint definitions | ✅ Ready |
| `timetable_generation_tasks` | Task tracking | ✅ Ready |
| `generated_timetables` | Solutions | ✅ Ready |
| `scheduled_classes` | Final assignments | ✅ Ready |
| `algorithm_execution_metrics` | Performance data | ✅ Ready |

---

## 2. Detailed Table Analysis

### 2.1 `subjects` Table

**Location:** Lines 233-276 in `new_schema.sql`

#### Current Schema
```sql
CREATE TABLE subjects (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    college_id UUID NOT NULL,
    department_id UUID,
    course_id UUID,
    credits_per_week INT CHECK (1-10),
    semester INT CHECK (1-8),
    
    -- NEP 2020 Fields ✅
    nep_category nep_category DEFAULT 'CORE',
    subject_type subject_type DEFAULT 'THEORY',
    lecture_hours INTEGER DEFAULT 1,
    tutorial_hours INTEGER DEFAULT 0,
    practical_hours INTEGER DEFAULT 0,
    credit_value NUMERIC(3,1) GENERATED ALWAYS AS (...),
    course_group_id UUID REFERENCES elective_buckets(id),
    
    -- Block Scheduling ✅
    block_start_week INTEGER,
    block_end_week INTEGER,
    time_restriction VARCHAR(20),
    is_special_event BOOLEAN DEFAULT FALSE,
    
    -- Algorithm Fields ✅
    requires_lab BOOLEAN DEFAULT FALSE,
    requires_projector BOOLEAN DEFAULT FALSE,
    algorithm_complexity INT DEFAULT 5,
    max_continuous_hours INT DEFAULT 2,
    min_gap_hours INT DEFAULT 0
);
```

#### CP-SAT Usage
| Field | Used By | Status |
|-------|---------|--------|
| `nep_category` | Special event handling | ✅ Used |
| `lecture_hours` + `tutorial_hours` | Duration calculation | ✅ Used |
| `subject_type` | Room type matching | ✅ Used |
| `requires_lab` | Lab room constraint | ✅ Used |
| `course_group_id` | Bucket lookup | ✅ Used |
| `block_start_week/end_week` | Internship blocking | ✅ Used |
| `time_restriction` | Teaching Practice | ✅ Used |

#### GA Usage
| Field | Used By | Status |
|-------|---------|--------|
| `algorithm_complexity` | Prioritization | ⚠️ Not currently used |
| `max_continuous_hours` | Soft constraint | ⚠️ Not currently used |
| `min_gap_hours` | Soft constraint | ⚠️ Not currently used |

**Verdict:** ✅ **Ready** - All required fields present

---

### 2.2 `elective_buckets` Table

**Location:** Lines 278-305 in `new_schema.sql`

#### Current Schema
```sql
CREATE TABLE elective_buckets (
    id UUID PRIMARY KEY,
    batch_id UUID REFERENCES batches(id),  -- Nullable for college-based
    bucket_name VARCHAR(255) NOT NULL,
    min_selection INTEGER DEFAULT 1,
    max_selection INTEGER DEFAULT 1,
    is_common_slot BOOLEAN DEFAULT TRUE,   -- KEY for simultaneity
    
    -- NEP 2020 college-based fields
    college_id UUID REFERENCES colleges(id),
    course VARCHAR(50),
    semester INTEGER CHECK (1-8)
);
```

#### CP-SAT Usage
| Field | Used By | Status |
|-------|---------|--------|
| `batch_id` | Data fetch | ✅ Used |
| `is_common_slot` | Simultaneity constraint | ✅ Used |
| `min/max_selection` | Student choice validation | ⚠️ Not in CP-SAT (UI only) |

**Verdict:** ✅ **Ready**

---

### 2.3 `constraint_rules` Table

**Location:** Lines 437-449 in `new_schema.sql`

#### Current Schema
```sql
CREATE TABLE constraint_rules (
    id UUID PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_type VARCHAR(20) CHECK ('HARD', 'SOFT', 'PREFERENCE'),
    description TEXT,
    rule_parameters JSONB DEFAULT '{}',
    weight DECIMAL(8,2) DEFAULT 1.0,
    applies_to_departments UUID[],
    applies_to_subjects UUID[],
    applies_to_faculty UUID[],
    applies_to_batches UUID[],
    is_active BOOLEAN DEFAULT TRUE
);
```

#### Expected Seed Data
```sql
-- Hard Constraints (CP-SAT enforced)
INSERT INTO constraint_rules (rule_name, rule_type, weight, description) VALUES
('no_faculty_overlap', 'HARD', 100, 'Faculty cannot teach multiple classes simultaneously'),
('no_classroom_overlap', 'HARD', 100, 'Classroom cannot host multiple classes simultaneously'),
('nep_bucket_simultaneity', 'HARD', 100, 'All subjects in common-slot bucket start at same time'),
('bucket_separation', 'HARD', 100, 'Different buckets must be at different times'),
('room_type_matching', 'HARD', 95, 'Lab subjects require lab-equipped rooms'),
('faculty_availability', 'HARD', 90, 'Faculty only scheduled in available slots'),
('lab_continuous_slots', 'HARD', 95, 'Lab sessions require continuous 2-hour slots'),
('max_one_lab_per_day', 'HARD', 85, 'Maximum one lab session per day per batch');

-- Soft Constraints (GA optimized)
INSERT INTO constraint_rules (rule_name, rule_type, weight, description) VALUES
('distribute_subjects_evenly', 'SOFT', 50, 'Spread subjects evenly across days'),
('faculty_preferred_time_slots', 'SOFT', 30, 'Honor faculty preferred teaching times'),
('avoid_first_last_slot_labs', 'SOFT', 20, 'Avoid scheduling labs in first/last slots'),
('lunch_break_consideration', 'SOFT', 40, 'Maintain lunch break for students'),
('balanced_faculty_workload', 'SOFT', 40, 'Balance teaching hours across faculty'),
('consecutive_classes_same_room', 'SOFT', 25, 'Minimize room changes for batches');
```

**Verdict:** ✅ **Ready** - Needs seed data insertion

---

### 2.4 `timetable_generation_tasks` Table

**Location:** Lines 458-482 in `new_schema.sql`

#### Current Schema
```sql
CREATE TABLE timetable_generation_tasks (
    id UUID PRIMARY KEY,
    task_name VARCHAR(255) NOT NULL,
    batch_id UUID NOT NULL REFERENCES batches(id),
    academic_year VARCHAR(10) NOT NULL,
    semester INT CHECK (1-8),
    
    -- Status Tracking
    status generation_task_status DEFAULT 'PENDING',
    current_phase algorithm_phase DEFAULT 'INITIALIZING',
    progress INT DEFAULT 0 CHECK (0-100),
    current_message TEXT,
    
    -- Configuration
    algorithm_config JSONB DEFAULT '{
        "cpsat": { "maxSolutions": 10, "timeoutMinutes": 5 },
        "ga": { "populationSize": 50, "maxGenerations": 100 },
        "hybrid": { "maxTotalTime": 300 }
    }',
    
    -- Results
    solutions_generated INT DEFAULT 0,
    best_fitness_score DECIMAL(10,4),
    execution_time_seconds INT,
    error_details TEXT
);
```

#### ENUM Types
```sql
CREATE TYPE algorithm_phase AS ENUM (
    'INITIALIZING', 
    'CP_SAT', 
    'GA', 
    'FINALIZING', 
    'COMPLETED', 
    'FAILED'
);

CREATE TYPE generation_task_status AS ENUM (
    'PENDING', 
    'RUNNING', 
    'COMPLETED', 
    'FAILED', 
    'CANCELLED'
);
```

**Verdict:** ✅ **Ready** - Perfect for pipeline tracking

---

### 2.5 `algorithm_execution_metrics` Table

**Location:** Lines 543-568 in `new_schema.sql`

#### Current Schema (Partial)
```sql
CREATE TABLE algorithm_execution_metrics (
    id UUID PRIMARY KEY,
    generation_task_id UUID REFERENCES timetable_generation_tasks(id),
    
    -- CP-SAT Metrics
    cpsat_solve_time_ms INT,
    cpsat_solutions_found INT,
    cpsat_branches INT,
    cpsat_conflicts INT,
    
    -- GA Metrics
    ga_generations_completed INT,
    ga_best_fitness_per_generation JSONB,  -- Array of fitness values
    ga_population_diversity JSONB,
    ga_convergence_generation INT,
    
    -- Overall
    total_execution_time_ms INT,
    peak_memory_mb INT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Verdict:** ✅ **Ready** - Comprehensive metrics storage

---

### 2.6 `generated_timetables` Table

#### Current Schema
```sql
CREATE TABLE generated_timetables (
    id UUID PRIMARY KEY,
    generation_task_id UUID REFERENCES timetable_generation_tasks(id),
    title VARCHAR(255) NOT NULL,
    batch_id UUID NOT NULL REFERENCES batches(id),
    academic_year VARCHAR(10) NOT NULL,
    semester INT NOT NULL,
    
    -- Quality Metrics
    fitness_score DECIMAL(10,4) DEFAULT 0,
    constraint_violations JSONB DEFAULT '[]',
    optimization_metrics JSONB DEFAULT '{}',
    
    -- Method
    generation_method VARCHAR(20) CHECK ('CP_SAT_ONLY', 'GA_ONLY', 'HYBRID'),
    solution_rank INT DEFAULT 1,
    
    -- Workflow
    status timetable_status DEFAULT 'draft'
);
```

**Verdict:** ✅ **Ready**

---

### 2.7 `scheduled_classes` Table

#### Current Schema
```sql
CREATE TABLE scheduled_classes (
    id UUID PRIMARY KEY,
    timetable_id UUID NOT NULL REFERENCES generated_timetables(id),
    subject_id UUID NOT NULL REFERENCES subjects(id),
    faculty_id UUID REFERENCES users(id),
    classroom_id UUID REFERENCES classrooms(id),
    time_slot_id UUID NOT NULL REFERENCES time_slots(id),
    
    -- Additional
    is_locked BOOLEAN DEFAULT FALSE,
    exclusion_reason TEXT,
    notes TEXT
);
```

**Verdict:** ✅ **Ready**

---

## 3. Gap Analysis Summary

### 3.1 Tables: Ready ✅

| Table | Pipeline Usage | Status |
|-------|---------------|--------|
| `subjects` | CP-SAT + GA | ✅ All fields present |
| `elective_buckets` | CP-SAT bucket constraints | ✅ Ready |
| `batches` | Data context | ✅ Ready |
| `classrooms` | Room assignment | ✅ Ready |
| `time_slots` | Slot assignment | ✅ Ready |
| `faculty_availability` | CP-SAT constraint | ✅ Ready |
| `faculty_qualified_subjects` | Faculty matching | ✅ Ready |
| `batch_subjects` | Curriculum + faculty | ✅ Ready |
| `constraint_rules` | CP-SAT hard + GA soft | ✅ Needs seed data |
| `timetable_generation_tasks` | Task tracking | ✅ Ready |
| `generated_timetables` | Solution storage | ✅ Ready |
| `scheduled_classes` | Final output | ✅ Ready |
| `algorithm_execution_metrics` | Performance data | ✅ Ready |

### 3.2 Optional Additions (Recommended for Debugging)

#### Table: `ga_population_snapshots`

**Purpose:** Track GA population state at each generation for debugging convergence issues

```sql
CREATE TABLE ga_population_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_task_id UUID NOT NULL REFERENCES timetable_generation_tasks(id) ON DELETE CASCADE,
    generation_number INT NOT NULL,
    
    -- Population Stats
    best_fitness DECIMAL(10,4),
    worst_fitness DECIMAL(10,4),
    avg_fitness DECIMAL(10,4),
    fitness_std_dev DECIMAL(10,4),
    
    -- Diversity Metrics
    population_diversity DECIMAL(5,4),  -- 0-1 scale
    unique_individuals INT,
    
    -- Best Individual
    best_chromosome JSONB,  -- Encoded solution
    
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ga_snapshots_task ON ga_population_snapshots(generation_task_id, generation_number);
```

#### Table: `constraint_violation_details`

**Purpose:** Detailed breakdown of which constraints were violated and by how much

```sql
CREATE TABLE constraint_violation_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID NOT NULL REFERENCES generated_timetables(id) ON DELETE CASCADE,
    
    constraint_rule_id UUID REFERENCES constraint_rules(id),
    constraint_name VARCHAR(100),
    violation_type VARCHAR(20) CHECK ('HARD', 'SOFT'),
    violation_count INT DEFAULT 0,
    penalty_applied DECIMAL(10,4),
    
    -- Context
    affected_subjects UUID[],
    affected_faculty UUID[],
    affected_time_slots UUID[],
    
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_violations_timetable ON constraint_violation_details(timetable_id);
```

---

## 4. Required Seed Data

### 4.1 Constraint Rules (Must Insert)

```sql
-- Run this after schema creation

-- Hard Constraints
INSERT INTO constraint_rules (rule_name, rule_type, weight, description, rule_parameters) VALUES
('no_faculty_double_booking', 'HARD', 100.0, 
 'Faculty cannot be scheduled for multiple classes at the same time',
 '{"scope": "college", "check_across_batches": true}'::JSONB),

('no_classroom_double_booking', 'HARD', 100.0,
 'Classroom cannot host multiple classes simultaneously',
 '{"scope": "college"}'::JSONB),

('nep_bucket_simultaneity', 'HARD', 100.0,
 'All subjects in an elective bucket with is_common_slot=true must start at the same time',
 '{"applies_to": "common_slot_buckets"}'::JSONB),

('bucket_separation', 'HARD', 100.0,
 'Different elective buckets must be scheduled at different times',
 '{}'::JSONB),

('room_type_matching', 'HARD', 95.0,
 'LAB subjects must be assigned to lab-equipped classrooms',
 '{"subject_type": "LAB", "room_requirement": "has_lab_equipment"}'::JSONB),

('faculty_availability_respect', 'HARD', 90.0,
 'Faculty can only be scheduled during their available time slots',
 '{"check_availability_type": ["available", "preferred"]}'::JSONB),

('lab_continuous_requirement', 'HARD', 95.0,
 'Lab sessions require continuous time slots (typically 2 hours)',
 '{"min_continuous_slots": 2}'::JSONB),

('max_one_lab_per_day', 'HARD', 85.0,
 'Maximum one lab session per day per batch',
 '{"max_labs_per_day": 1}'::JSONB);

-- Soft Constraints
INSERT INTO constraint_rules (rule_name, rule_type, weight, description, rule_parameters) VALUES
('distribute_subjects_evenly', 'SOFT', 50.0,
 'Spread subject sessions evenly across the week',
 '{"ideal_gap_days": 1, "penalty_per_violation": 10}'::JSONB),

('faculty_preferred_time_slots', 'SOFT', 30.0,
 'Honor faculty preferred teaching times when possible',
 '{"preference_types": ["preferred"], "bonus_per_match": 5}'::JSONB),

('avoid_first_last_slot_labs', 'SOFT', 20.0,
 'Avoid scheduling lab sessions in first or last slots of the day',
 '{"penalty_first_slot": 15, "penalty_last_slot": 10}'::JSONB),

('lunch_break_consideration', 'SOFT', 40.0,
 'Ensure students have adequate lunch break',
 '{"lunch_start": "12:00", "lunch_end": "13:30", "min_break_minutes": 30}'::JSONB),

('balanced_faculty_workload', 'SOFT', 40.0,
 'Balance teaching hours across faculty in the same department',
 '{"max_variance_percent": 20}'::JSONB),

('minimize_room_changes', 'SOFT', 25.0,
 'Minimize room changes for consecutive classes of a batch',
 '{"penalty_per_change": 5}'::JSONB),

('prefer_morning_theory', 'SOFT', 15.0,
 'Schedule theory classes preferably in morning slots',
 '{"morning_cutoff": "12:00", "bonus_per_match": 3}'::JSONB);
```

---

## 5. Views for Algorithm (Already Exist)

The schema includes helpful views that the pipeline can use:

### `algorithm_faculty_data`
```sql
-- Aggregates faculty with their qualified subjects
SELECT u.id, u.first_name, u.last_name, u.college_id,
       ARRAY_AGG(DISTINCT s.id) as qualified_subjects
FROM users u
LEFT JOIN faculty_qualified_subjects fqs ON u.id = fqs.faculty_id
LEFT JOIN subjects s ON fqs.subject_id = s.id
WHERE u.role = 'faculty' AND u.is_active = TRUE
GROUP BY u.id;
```

### `algorithm_batch_curriculum`
```sql
-- Batch subjects with assigned faculty
SELECT bs.*, b.name as batch_name, s.code as subject_code,
       u.first_name || ' ' || u.last_name AS assigned_faculty_name
FROM batch_subjects bs
JOIN batches b ON bs.batch_id = b.id
JOIN subjects s ON bs.subject_id = s.id
LEFT JOIN users u ON bs.assigned_faculty_id = u.id;
```

### `algorithm_time_slots`
```sql
-- Active time slots with faculty preference counts
SELECT ts.*, 
       COUNT(fa.faculty_id) FILTER (WHERE fa.availability_type = 'preferred') as preferred_faculty_count
FROM time_slots ts
LEFT JOIN faculty_availability fa ON ts.id = fa.time_slot_id
WHERE ts.is_active = TRUE AND NOT ts.is_break_time AND NOT ts.is_lunch_time
GROUP BY ts.id;
```

---

## 6. Conclusion

### Schema Readiness: 95%

| Category | Status | Notes |
|----------|--------|-------|
| Core Tables | ✅ 100% | All required tables exist |
| ENUM Types | ✅ 100% | `algorithm_phase`, `generation_task_status` ready |
| Constraint Storage | ✅ 100% | `constraint_rules` table perfect |
| Task Tracking | ✅ 100% | `timetable_generation_tasks` comprehensive |
| Results Storage | ✅ 100% | `generated_timetables` + `scheduled_classes` |
| Metrics Storage | ✅ 100% | `algorithm_execution_metrics` covers all |
| Helper Views | ✅ 100% | `algorithm_*` views ready |
| Seed Data | ⚠️ 0% | Constraint rules need insertion |
| Debug Tables | ⚠️ Optional | `ga_population_snapshots` recommended |

### Action Items

1. **Required:** Insert constraint rules seed data (Section 4.1)
2. **Recommended:** Create `ga_population_snapshots` table for debugging
3. **Optional:** Create `constraint_violation_details` for detailed analysis

---

*Document Version: 1.0*  
*Last Updated: January 24, 2026*
