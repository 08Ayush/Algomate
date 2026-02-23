# Plan: Assignment & Proctoring System

A comprehensive assignment module with MCQ/MSQ/essay/coding questions, student dashboard integration, faculty creation interface, and browser-based proctoring with violation tracking (3 warnings → auto-submit).

---

## Steps

### 1. Create New ENUMs
**Location**: [new_schema.sql](database/new_schema.sql#L26-L57) - Add after existing ENUM definitions

- Add `assignment_type` ENUM: `('MCQ', 'MSQ', 'FILL_BLANK', 'ESSAY', 'CODING', 'MIXED')`
- Add `assignment_status` ENUM: `('DRAFT', 'SCHEDULED', 'ACTIVE', 'CLOSED', 'ARCHIVED')`
- Add `submission_status` ENUM: `('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'LATE_SUBMISSION', 'GRADED', 'RESUBMISSION_REQUIRED')`
- Add `question_type` ENUM: `('MCQ', 'MSQ', 'FILL_BLANK', 'ESSAY', 'CODING')`
- Add `violation_type` ENUM: `('TAB_SWITCH', 'WINDOW_BLUR', 'COPY_PASTE', 'RIGHT_CLICK', 'DEVELOPER_TOOLS', 'FULLSCREEN_EXIT')`

### 2. Create Core Assignment Tables
**Location**: After existing tables (around line 659)

#### `assignments` table
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `college_id` UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE
- `subject_id` UUID REFERENCES subjects(id) ON DELETE SET NULL
- `batch_id` UUID REFERENCES batches(id) ON DELETE CASCADE
- `created_by` UUID NOT NULL REFERENCES users(id) (faculty)
- `title` VARCHAR(255) NOT NULL
- `description` TEXT
- `type` assignment_type NOT NULL
- `status` assignment_status DEFAULT 'DRAFT'
- `total_marks` DECIMAL(6,2) NOT NULL CHECK (total_marks > 0)
- `passing_marks` DECIMAL(6,2) CHECK (passing_marks <= total_marks)
- `duration_minutes` INT CHECK (duration_minutes > 0)
- `max_attempts` INT DEFAULT 1 CHECK (max_attempts > 0)
- `scheduled_start` TIMESTAMPTZ
- `scheduled_end` TIMESTAMPTZ
- `instructions` TEXT
- `proctoring_enabled` BOOLEAN DEFAULT FALSE
- `max_violations` INT DEFAULT 3 CHECK (max_violations >= 0)
- `show_results_immediately` BOOLEAN DEFAULT FALSE
- `allow_review` BOOLEAN DEFAULT TRUE
- `is_published` BOOLEAN DEFAULT FALSE
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()
- CONSTRAINT `valid_schedule` CHECK (scheduled_start < scheduled_end)
- CONSTRAINT `valid_passing_marks` CHECK (passing_marks >= 0)

#### `assignment_questions` table
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `assignment_id` UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE
- `question_order` INT NOT NULL CHECK (question_order > 0)
- `question_text` TEXT NOT NULL
- `question_type` question_type NOT NULL
- `marks` DECIMAL(5,2) NOT NULL CHECK (marks > 0)
- `negative_marking` DECIMAL(5,2) DEFAULT 0 CHECK (negative_marking >= 0)
- `question_data` JSONB NOT NULL DEFAULT '{}' (stores MCQ options/coding test cases/fill-in-blank positions)
- `explanation` TEXT (correct answer explanation)
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()
- UNIQUE(assignment_id, question_order)

**question_data JSONB structure examples**:
```json
// MCQ
{
  "options": [
    {"id": "A", "text": "Option A", "is_correct": false},
    {"id": "B", "text": "Option B", "is_correct": true}
  ]
}

// MSQ
{
  "options": [
    {"id": "A", "text": "Option A", "is_correct": true},
    {"id": "B", "text": "Option B", "is_correct": true},
    {"id": "C", "text": "Option C", "is_correct": false}
  ]
}

// Fill in the Blank
{
  "blanks": [
    {"position": 1, "correct_answers": ["answer1", "Answer1"]},
    {"position": 2, "correct_answers": ["answer2"]}
  ]
}

// Coding
{
  "language": "python",
  "starter_code": "def solution():\n    pass",
  "test_cases": [] // References coding_test_cases table
}
```

#### `assignment_submissions` table
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `assignment_id` UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE
- `student_id` UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `batch_id` UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE
- `attempt_number` INT NOT NULL DEFAULT 1 CHECK (attempt_number > 0)
- `submission_status` submission_status DEFAULT 'NOT_STARTED'
- `started_at` TIMESTAMPTZ
- `submitted_at` TIMESTAMPTZ
- `time_taken_seconds` INT
- `score` DECIMAL(6,2) DEFAULT 0
- `percentage` DECIMAL(5,2) GENERATED ALWAYS AS ((score / (SELECT total_marks FROM assignments WHERE id = assignment_id)) * 100) STORED
- `graded_by` UUID REFERENCES users(id) ON DELETE SET NULL
- `graded_at` TIMESTAMPTZ
- `feedback` TEXT
- `auto_graded` BOOLEAN DEFAULT FALSE
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()
- UNIQUE(assignment_id, student_id, attempt_number)
- CONSTRAINT `valid_submission_times` CHECK (submitted_at IS NULL OR submitted_at >= started_at)

#### `submission_answers` table
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `submission_id` UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE
- `question_id` UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE
- `answer_data` JSONB NOT NULL DEFAULT '{}' (selected options/text/code)
- `is_correct` BOOLEAN
- `marks_awarded` DECIMAL(5,2) DEFAULT 0
- `evaluator_comments` TEXT
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()
- UNIQUE(submission_id, question_id)

**answer_data JSONB structure examples**:
```json
// MCQ
{"selected_option": "B"}

// MSQ
{"selected_options": ["A", "B"]}

// Fill in the Blank
{"answers": ["answer1", "answer2"]}

// Essay
{"essay_text": "Student's essay content..."}

// Coding
{
  "code": "def solution():\n    return 42",
  "language": "python",
  "execution_results": [...]
}
```

#### `proctoring_violations` table
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `submission_id` UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE
- `violation_type` violation_type NOT NULL
- `violation_count` INT NOT NULL DEFAULT 1 CHECK (violation_count > 0)
- `detected_at` TIMESTAMPTZ DEFAULT NOW()
- `snapshot_data` JSONB DEFAULT '{}' (browser info, timestamp, additional context)
- `action_taken` VARCHAR(50) (e.g., 'WARNING', 'AUTO_SUBMIT')
- `created_at` TIMESTAMPTZ DEFAULT NOW()

### 3. Add Supporting Tables

#### `assignment_attachments` table
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `assignment_id` UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE
- `file_name` VARCHAR(255) NOT NULL
- `file_url` TEXT NOT NULL
- `file_type` VARCHAR(50)
- `file_size` BIGINT (in bytes)
- `uploaded_by` UUID NOT NULL REFERENCES users(id)
- `created_at` TIMESTAMPTZ DEFAULT NOW()

#### `coding_test_cases` table
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `question_id` UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE
- `test_case_order` INT NOT NULL CHECK (test_case_order > 0)
- `input` TEXT NOT NULL
- `expected_output` TEXT NOT NULL
- `is_sample` BOOLEAN DEFAULT FALSE (visible to students)
- `points` DECIMAL(5,2) DEFAULT 0
- `time_limit_ms` INT DEFAULT 1000
- `memory_limit_mb` INT DEFAULT 256
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- UNIQUE(question_id, test_case_order)

#### `assignment_analytics` table
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `assignment_id` UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE UNIQUE
- `total_students` INT DEFAULT 0
- `submitted_count` INT DEFAULT 0
- `pending_count` INT DEFAULT 0
- `average_score` DECIMAL(6,2) DEFAULT 0
- `highest_score` DECIMAL(6,2) DEFAULT 0
- `lowest_score` DECIMAL(6,2)
- `completion_rate` DECIMAL(5,2) DEFAULT 0
- `updated_at` TIMESTAMPTZ DEFAULT NOW()

### 4. Create Indexes
**Location**: After existing indexes (after line 707)

```sql
-- College isolation and performance
CREATE INDEX idx_assignments_college_batch_subject ON assignments(college_id, batch_id, subject_id, status);
CREATE INDEX idx_assignments_status_scheduled ON assignments(status, scheduled_start, scheduled_end) WHERE is_published = TRUE;
CREATE INDEX idx_assignments_created_by ON assignments(created_by, status);

-- Submissions
CREATE INDEX idx_submissions_college_student ON assignment_submissions(student_id, assignment_id, submission_status);
CREATE INDEX idx_submissions_assignment_status ON assignment_submissions(assignment_id, submission_status);
CREATE INDEX idx_submissions_batch ON assignment_submissions(batch_id, submission_status);
CREATE INDEX idx_submissions_grading ON assignment_submissions(graded_by, graded_at) WHERE graded_by IS NOT NULL;

-- Questions
CREATE INDEX idx_questions_assignment_order ON assignment_questions(assignment_id, question_order);
CREATE INDEX idx_questions_type ON assignment_questions(question_type);

-- Answers
CREATE INDEX idx_answers_submission ON submission_answers(submission_id, question_id);

-- Violations
CREATE INDEX idx_violations_submission_time ON proctoring_violations(submission_id, detected_at);
CREATE INDEX idx_violations_type ON proctoring_violations(violation_type, detected_at);

-- Analytics
CREATE INDEX idx_analytics_assignment ON assignment_analytics(assignment_id);

-- Attachments
CREATE INDEX idx_attachments_assignment ON assignment_attachments(assignment_id);

-- Coding test cases
CREATE INDEX idx_test_cases_question ON coding_test_cases(question_id, test_case_order);
```

### 5. Implement RLS Policies
**Location**: After existing RLS policies (after line 1821)

```sql
-- Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctoring_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_analytics ENABLE ROW LEVEL SECURITY;

-- ASSIGNMENTS: Faculty can CRUD, students can SELECT published assignments in their batches
CREATE POLICY "assignments_faculty_crud" ON assignments
FOR ALL
USING (
    college_id = current_app_college_id()
    AND (
        -- Faculty who created it or teach the subject
        created_by = current_app_user_id()
        OR
        -- Faculty assigned to batch_subjects for this subject
        (current_app_role() = 'faculty' AND batch_id IN (
            SELECT batch_id FROM batch_subjects 
            WHERE assigned_faculty_id = current_app_user_id() 
            AND subject_id = assignments.subject_id
        ))
        OR
        -- Admins/HODs in same college
        current_app_role() IN ('college_admin', 'admin', 'hod')
    )
);

CREATE POLICY "assignments_student_view" ON assignments
FOR SELECT
USING (
    college_id = current_app_college_id()
    AND is_published = TRUE
    AND current_app_role() = 'student'
    AND batch_id IN (
        SELECT batch_id FROM student_batch_enrollment 
        WHERE student_id = current_app_user_id() AND is_active = TRUE
    )
);

-- ASSIGNMENT_QUESTIONS: Faculty can CRUD, students can SELECT for active assignments
CREATE POLICY "questions_faculty_crud" ON assignment_questions
FOR ALL
USING (
    assignment_id IN (
        SELECT id FROM assignments 
        WHERE college_id = current_app_college_id()
        AND (
            created_by = current_app_user_id()
            OR current_app_role() IN ('college_admin', 'admin', 'hod')
        )
    )
);

CREATE POLICY "questions_student_view" ON assignment_questions
FOR SELECT
USING (
    current_app_role() = 'student'
    AND assignment_id IN (
        SELECT id FROM assignments 
        WHERE college_id = current_app_college_id()
        AND is_published = TRUE
        AND batch_id IN (
            SELECT batch_id FROM student_batch_enrollment 
            WHERE student_id = current_app_user_id() AND is_active = TRUE
        )
    )
);

-- ASSIGNMENT_SUBMISSIONS: Students can INSERT/UPDATE own submissions, faculty can SELECT all for their assignments
CREATE POLICY "submissions_student_own" ON assignment_submissions
FOR ALL
USING (
    current_app_role() = 'student'
    AND student_id = current_app_user_id()
    AND batch_id IN (
        SELECT batch_id FROM student_batch_enrollment 
        WHERE student_id = current_app_user_id() AND is_active = TRUE
    )
);

CREATE POLICY "submissions_faculty_view" ON assignment_submissions
FOR SELECT
USING (
    batch_id IN (SELECT id FROM batches WHERE college_id = current_app_college_id())
    AND (
        current_app_role() IN ('college_admin', 'admin', 'hod')
        OR
        assignment_id IN (
            SELECT id FROM assignments 
            WHERE created_by = current_app_user_id()
            OR batch_id IN (
                SELECT batch_id FROM batch_subjects 
                WHERE assigned_faculty_id = current_app_user_id()
            )
        )
    )
);

CREATE POLICY "submissions_faculty_grade" ON assignment_submissions
FOR UPDATE
USING (
    batch_id IN (SELECT id FROM batches WHERE college_id = current_app_college_id())
    AND current_app_role() = 'faculty'
    AND assignment_id IN (
        SELECT id FROM assignments 
        WHERE created_by = current_app_user_id()
        OR batch_id IN (
            SELECT batch_id FROM batch_subjects 
            WHERE assigned_faculty_id = current_app_user_id()
        )
    )
);

-- SUBMISSION_ANSWERS: Follow same pattern as submissions
CREATE POLICY "answers_student_own" ON submission_answers
FOR ALL
USING (
    submission_id IN (
        SELECT id FROM assignment_submissions 
        WHERE student_id = current_app_user_id()
    )
);

CREATE POLICY "answers_faculty_view" ON submission_answers
FOR SELECT
USING (
    submission_id IN (
        SELECT s.id FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE a.college_id = current_app_college_id()
        AND (
            a.created_by = current_app_user_id()
            OR current_app_role() IN ('college_admin', 'admin', 'hod')
        )
    )
);

-- PROCTORING_VIOLATIONS: Students cannot view until graded, faculty can view all
CREATE POLICY "violations_faculty_view" ON proctoring_violations
FOR SELECT
USING (
    submission_id IN (
        SELECT s.id FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE a.college_id = current_app_college_id()
        AND (
            a.created_by = current_app_user_id()
            OR current_app_role() IN ('college_admin', 'admin', 'hod')
        )
    )
);

CREATE POLICY "violations_student_view_after_grading" ON proctoring_violations
FOR SELECT
USING (
    current_app_role() = 'student'
    AND submission_id IN (
        SELECT id FROM assignment_submissions 
        WHERE student_id = current_app_user_id()
        AND submission_status = 'GRADED'
    )
);

-- INSERT policy for violations (system can insert, not students)
CREATE POLICY "violations_insert" ON proctoring_violations
FOR INSERT
WITH CHECK (
    submission_id IN (
        SELECT id FROM assignment_submissions 
        WHERE student_id = current_app_user_id()
    )
);

-- ASSIGNMENT_ATTACHMENTS: Faculty can CRUD, students can SELECT
CREATE POLICY "attachments_faculty_crud" ON assignment_attachments
FOR ALL
USING (
    assignment_id IN (
        SELECT id FROM assignments 
        WHERE college_id = current_app_college_id()
        AND (
            created_by = current_app_user_id()
            OR current_app_role() IN ('college_admin', 'admin', 'hod')
        )
    )
);

CREATE POLICY "attachments_student_view" ON assignment_attachments
FOR SELECT
USING (
    current_app_role() = 'student'
    AND assignment_id IN (
        SELECT id FROM assignments 
        WHERE college_id = current_app_college_id()
        AND is_published = TRUE
        AND batch_id IN (
            SELECT batch_id FROM student_batch_enrollment 
            WHERE student_id = current_app_user_id() AND is_active = TRUE
        )
    )
);

-- CODING_TEST_CASES: Faculty can CRUD, students can SELECT only sample cases
CREATE POLICY "test_cases_faculty_crud" ON coding_test_cases
FOR ALL
USING (
    question_id IN (
        SELECT aq.id FROM assignment_questions aq
        JOIN assignments a ON aq.assignment_id = a.id
        WHERE a.college_id = current_app_college_id()
        AND (
            a.created_by = current_app_user_id()
            OR current_app_role() IN ('college_admin', 'admin', 'hod')
        )
    )
);

CREATE POLICY "test_cases_student_view_samples" ON coding_test_cases
FOR SELECT
USING (
    current_app_role() = 'student'
    AND is_sample = TRUE
    AND question_id IN (
        SELECT aq.id FROM assignment_questions aq
        JOIN assignments a ON aq.assignment_id = a.id
        WHERE a.college_id = current_app_college_id()
        AND a.is_published = TRUE
        AND a.batch_id IN (
            SELECT batch_id FROM student_batch_enrollment 
            WHERE student_id = current_app_user_id() AND is_active = TRUE
        )
    )
);

-- ASSIGNMENT_ANALYTICS: Faculty and admins can view
CREATE POLICY "analytics_faculty_view" ON assignment_analytics
FOR SELECT
USING (
    assignment_id IN (
        SELECT id FROM assignments 
        WHERE college_id = current_app_college_id()
        AND (
            created_by = current_app_user_id()
            OR current_app_role() IN ('college_admin', 'admin', 'hod')
        )
    )
);
```

### 6. Create Database Functions
**Location**: Around line 1450 (after existing functions)

```sql
-- Function: Auto-grade MCQ/MSQ/Fill-in-blank questions
CREATE OR REPLACE FUNCTION auto_grade_submission(p_submission_id UUID)
RETURNS VOID AS $$
DECLARE
    v_assignment_id UUID;
    v_total_score DECIMAL(6,2) := 0;
    v_question RECORD;
    v_answer RECORD;
    v_is_correct BOOLEAN;
    v_marks_awarded DECIMAL(5,2);
BEGIN
    -- Get assignment ID
    SELECT assignment_id INTO v_assignment_id
    FROM assignment_submissions WHERE id = p_submission_id;
    
    -- Loop through all questions and answers
    FOR v_question IN 
        SELECT aq.id, aq.question_type, aq.marks, aq.negative_marking, aq.question_data
        FROM assignment_questions aq
        WHERE aq.assignment_id = v_assignment_id
        AND aq.question_type IN ('MCQ', 'MSQ', 'FILL_BLANK')
    LOOP
        -- Get student's answer
        SELECT * INTO v_answer
        FROM submission_answers
        WHERE submission_id = p_submission_id
        AND question_id = v_question.id;
        
        CONTINUE WHEN v_answer IS NULL;
        
        v_is_correct := FALSE;
        v_marks_awarded := 0;
        
        -- MCQ Grading
        IF v_question.question_type = 'MCQ' THEN
            v_is_correct := (
                SELECT (v_answer.answer_data->>'selected_option') = opt->>'id'
                FROM jsonb_array_elements(v_question.question_data->'options') AS opt
                WHERE (opt->>'is_correct')::boolean = true
                LIMIT 1
            );
            
            IF v_is_correct THEN
                v_marks_awarded := v_question.marks;
            ELSE
                v_marks_awarded := -v_question.negative_marking;
            END IF;
        
        -- MSQ Grading (all correct options must be selected, no incorrect ones)
        ELSIF v_question.question_type = 'MSQ' THEN
            DECLARE
                v_correct_options TEXT[];
                v_selected_options TEXT[];
            BEGIN
                -- Get correct options
                SELECT ARRAY_AGG(opt->>'id')
                INTO v_correct_options
                FROM jsonb_array_elements(v_question.question_data->'options') AS opt
                WHERE (opt->>'is_correct')::boolean = true;
                
                -- Get selected options
                SELECT ARRAY_AGG(value::text)
                INTO v_selected_options
                FROM jsonb_array_elements_text(v_answer.answer_data->'selected_options');
                
                -- Check if arrays match exactly
                v_is_correct := (v_correct_options @> v_selected_options AND v_correct_options <@ v_selected_options);
                
                IF v_is_correct THEN
                    v_marks_awarded := v_question.marks;
                ELSE
                    v_marks_awarded := -v_question.negative_marking;
                END IF;
            END;
        
        -- Fill in the Blank Grading
        ELSIF v_question.question_type = 'FILL_BLANK' THEN
            DECLARE
                v_blank RECORD;
                v_correct_count INT := 0;
                v_total_blanks INT;
                v_student_answer TEXT;
            BEGIN
                SELECT COUNT(*) INTO v_total_blanks
                FROM jsonb_array_elements(v_question.question_data->'blanks');
                
                -- Check each blank
                FOR v_blank IN 
                    SELECT (blank->>'position')::int AS position, blank->'correct_answers' AS correct_answers
                    FROM jsonb_array_elements(v_question.question_data->'blanks') AS blank
                LOOP
                    -- Get student's answer for this blank
                    v_student_answer := v_answer.answer_data->'answers'->(v_blank.position - 1);
                    
                    -- Check if it matches any correct answer (case-insensitive)
                    IF EXISTS (
                        SELECT 1 FROM jsonb_array_elements_text(v_blank.correct_answers) AS correct
                        WHERE LOWER(correct) = LOWER(v_student_answer)
                    ) THEN
                        v_correct_count := v_correct_count + 1;
                    END IF;
                END LOOP;
                
                -- Partial marking: proportional to correct answers
                v_is_correct := (v_correct_count = v_total_blanks);
                v_marks_awarded := (v_question.marks * v_correct_count) / v_total_blanks;
            END;
        END IF;
        
        -- Update submission_answers
        UPDATE submission_answers
        SET is_correct = v_is_correct,
            marks_awarded = v_marks_awarded,
            updated_at = NOW()
        WHERE id = v_answer.id;
        
        v_total_score := v_total_score + v_marks_awarded;
    END LOOP;
    
    -- Update submission with total score
    UPDATE assignment_submissions
    SET score = v_total_score,
        auto_graded = TRUE,
        updated_at = NOW()
    WHERE id = p_submission_id;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if submission is late
CREATE OR REPLACE FUNCTION check_submission_deadline()
RETURNS TRIGGER AS $$
DECLARE
    v_scheduled_end TIMESTAMPTZ;
BEGIN
    IF NEW.submission_status = 'SUBMITTED' AND NEW.submitted_at IS NOT NULL THEN
        SELECT scheduled_end INTO v_scheduled_end
        FROM assignments WHERE id = NEW.assignment_id;
        
        IF v_scheduled_end IS NOT NULL AND NEW.submitted_at > v_scheduled_end THEN
            NEW.submission_status := 'LATE_SUBMISSION';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate assignment analytics
CREATE OR REPLACE FUNCTION calculate_assignment_analytics(p_assignment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_students INT;
    v_submitted_count INT;
    v_pending_count INT;
    v_average_score DECIMAL(6,2);
    v_highest_score DECIMAL(6,2);
    v_lowest_score DECIMAL(6,2);
    v_completion_rate DECIMAL(5,2);
BEGIN
    -- Get enrolled students count
    SELECT COUNT(DISTINCT sbe.student_id) INTO v_total_students
    FROM student_batch_enrollment sbe
    JOIN assignments a ON a.batch_id = sbe.batch_id
    WHERE a.id = p_assignment_id
    AND sbe.is_active = TRUE;
    
    -- Get submission statistics
    SELECT 
        COUNT(*) FILTER (WHERE submission_status IN ('SUBMITTED', 'LATE_SUBMISSION', 'GRADED')),
        COUNT(*) FILTER (WHERE submission_status IN ('NOT_STARTED', 'IN_PROGRESS')),
        AVG(score) FILTER (WHERE submission_status = 'GRADED'),
        MAX(score),
        MIN(score) FILTER (WHERE submission_status = 'GRADED')
    INTO v_submitted_count, v_pending_count, v_average_score, v_highest_score, v_lowest_score
    FROM assignment_submissions
    WHERE assignment_id = p_assignment_id;
    
    -- Calculate completion rate
    IF v_total_students > 0 THEN
        v_completion_rate := (v_submitted_count::DECIMAL / v_total_students) * 100;
    ELSE
        v_completion_rate := 0;
    END IF;
    
    -- Insert or update analytics
    INSERT INTO assignment_analytics (
        assignment_id, total_students, submitted_count, pending_count,
        average_score, highest_score, lowest_score, completion_rate, updated_at
    ) VALUES (
        p_assignment_id, v_total_students, v_submitted_count, v_pending_count,
        COALESCE(v_average_score, 0), COALESCE(v_highest_score, 0), v_lowest_score,
        v_completion_rate, NOW()
    )
    ON CONFLICT (assignment_id) DO UPDATE
    SET total_students = EXCLUDED.total_students,
        submitted_count = EXCLUDED.submitted_count,
        pending_count = EXCLUDED.pending_count,
        average_score = EXCLUDED.average_score,
        highest_score = EXCLUDED.highest_score,
        lowest_score = EXCLUDED.lowest_score,
        completion_rate = EXCLUDED.completion_rate,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Handle proctoring violation
CREATE OR REPLACE FUNCTION handle_proctoring_violation()
RETURNS TRIGGER AS $$
DECLARE
    v_total_violations INT;
    v_max_violations INT;
    v_proctoring_enabled BOOLEAN;
BEGIN
    -- Get current violation count for this submission
    SELECT COUNT(*) INTO v_total_violations
    FROM proctoring_violations
    WHERE submission_id = NEW.submission_id;
    
    -- Get max violations allowed and proctoring status
    SELECT a.max_violations, a.proctoring_enabled
    INTO v_max_violations, v_proctoring_enabled
    FROM assignment_submissions s
    JOIN assignments a ON s.assignment_id = a.id
    WHERE s.id = NEW.submission_id;
    
    -- If proctoring is enabled and max violations reached, auto-submit
    IF v_proctoring_enabled AND v_total_violations >= v_max_violations THEN
        UPDATE assignment_submissions
        SET submission_status = 'SUBMITTED',
            submitted_at = NOW(),
            time_taken_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))
        WHERE id = NEW.submission_id
        AND submission_status = 'IN_PROGRESS';
        
        -- Mark action taken
        NEW.action_taken := 'AUTO_SUBMIT';
        
        -- Send notification
        INSERT INTO notifications (
            recipient_id, sender_id, type, title, message, created_at
        )
        SELECT 
            s.student_id,
            NULL,
            'auto_submitted',
            'Assignment Auto-Submitted',
            'Your assignment "' || a.title || '" has been automatically submitted due to ' || v_max_violations || ' proctoring violations.',
            NOW()
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.id = NEW.submission_id;
    ELSE
        NEW.action_taken := 'WARNING';
        
        -- Send warning notification
        INSERT INTO notifications (
            recipient_id, sender_id, type, title, message, created_at
        )
        SELECT 
            s.student_id,
            NULL,
            'violation_warning',
            'Proctoring Violation Warning #' || v_total_violations,
            'Warning: Proctoring violation detected. ' || (v_max_violations - v_total_violations) || ' warnings remaining before auto-submission.',
            NOW()
        FROM assignment_submissions s
        WHERE s.id = NEW.submission_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Get available assignments for student
CREATE OR REPLACE FUNCTION get_student_assignments(p_student_id UUID, p_batch_id UUID)
RETURNS TABLE (
    assignment_id UUID,
    title VARCHAR,
    description TEXT,
    type assignment_type,
    status assignment_status,
    total_marks DECIMAL,
    duration_minutes INT,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    subject_name VARCHAR,
    has_submitted BOOLEAN,
    submission_status submission_status,
    score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.description,
        a.type,
        a.status,
        a.total_marks,
        a.duration_minutes,
        a.scheduled_start,
        a.scheduled_end,
        s.name,
        (sub.id IS NOT NULL) AS has_submitted,
        sub.submission_status,
        sub.score
    FROM assignments a
    LEFT JOIN subjects s ON a.subject_id = s.id
    LEFT JOIN assignment_submissions sub ON (
        sub.assignment_id = a.id 
        AND sub.student_id = p_student_id
        AND sub.attempt_number = (
            SELECT MAX(attempt_number) 
            FROM assignment_submissions 
            WHERE assignment_id = a.id AND student_id = p_student_id
        )
    )
    WHERE a.batch_id = p_batch_id
    AND a.is_published = TRUE
    ORDER BY a.scheduled_start DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get faculty assignments
CREATE OR REPLACE FUNCTION get_faculty_assignments(p_faculty_id UUID)
RETURNS TABLE (
    assignment_id UUID,
    title VARCHAR,
    batch_name VARCHAR,
    subject_name VARCHAR,
    type assignment_type,
    status assignment_status,
    total_students INT,
    submitted_count INT,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        b.name,
        s.name,
        a.type,
        a.status,
        COALESCE(aa.total_students, 0),
        COALESCE(aa.submitted_count, 0),
        a.scheduled_start,
        a.scheduled_end
    FROM assignments a
    JOIN batches b ON a.batch_id = b.id
    LEFT JOIN subjects s ON a.subject_id = s.id
    LEFT JOIN assignment_analytics aa ON a.id = aa.assignment_id
    WHERE a.created_by = p_faculty_id
    OR a.batch_id IN (
        SELECT batch_id FROM batch_subjects 
        WHERE assigned_faculty_id = p_faculty_id
        AND subject_id = a.subject_id
    )
    ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION auto_grade_submission(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_submission_deadline() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_assignment_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_proctoring_violation() TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_assignments(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_faculty_assignments(UUID) TO authenticated;
```

### 7. Create Triggers
**Location**: After existing triggers (after line 950)

```sql
-- Trigger: Auto-grade on submission
CREATE TRIGGER trigger_auto_grade_on_submit
    AFTER UPDATE OF submission_status ON assignment_submissions
    FOR EACH ROW
    WHEN (NEW.submission_status IN ('SUBMITTED', 'LATE_SUBMISSION') AND OLD.submission_status = 'IN_PROGRESS')
    EXECUTE FUNCTION auto_grade_submission(NEW.id);

-- Trigger: Check late submission
CREATE TRIGGER trigger_check_late_submission
    BEFORE INSERT OR UPDATE OF submitted_at ON assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION check_submission_deadline();

-- Trigger: Update analytics after submission changes
CREATE TRIGGER trigger_update_analytics_on_submission
    AFTER INSERT OR UPDATE OR DELETE ON assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_assignment_analytics(COALESCE(NEW.assignment_id, OLD.assignment_id));

-- Trigger: Handle proctoring violations
CREATE TRIGGER trigger_handle_violation
    BEFORE INSERT ON proctoring_violations
    FOR EACH ROW
    EXECUTE FUNCTION handle_proctoring_violation();

-- Trigger: Update timestamps on assignments
CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignment_questions_updated_at
    BEFORE UPDATE ON assignment_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignment_submissions_updated_at
    BEFORE UPDATE ON assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submission_answers_updated_at
    BEFORE UPDATE ON submission_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Audit logs for sensitive tables
CREATE TRIGGER audit_assignments
    AFTER INSERT OR UPDATE OR DELETE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_assignment_submissions
    AFTER INSERT OR UPDATE OR DELETE ON assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_proctoring_violations
    AFTER INSERT OR UPDATE OR DELETE ON proctoring_violations
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_changes();
```

### 8. Extend Notification System
**Location**: Update existing notification_type ENUM (around line 55)

```sql
-- Update notification_type ENUM to include assignment-related notifications
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'assignment_created';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'assignment_due_soon';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'submission_graded';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'violation_warning';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'auto_submitted';

-- Create trigger for assignment publication notifications
CREATE OR REPLACE FUNCTION notify_assignment_published()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_published = TRUE AND (OLD.is_published = FALSE OR OLD.is_published IS NULL) THEN
        INSERT INTO notifications (recipient_id, sender_id, type, title, message, created_at)
        SELECT 
            sbe.student_id,
            NEW.created_by,
            'assignment_created',
            'New Assignment: ' || NEW.title,
            'A new assignment has been published for your batch. Due: ' || 
            TO_CHAR(NEW.scheduled_end, 'DD Mon YYYY HH24:MI'),
            NOW()
        FROM student_batch_enrollment sbe
        WHERE sbe.batch_id = NEW.batch_id
        AND sbe.is_active = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_assignment_published
    AFTER UPDATE OF is_published ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION notify_assignment_published();

-- Create trigger for grading notifications
CREATE OR REPLACE FUNCTION notify_submission_graded()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.submission_status = 'GRADED' AND OLD.submission_status != 'GRADED' THEN
        INSERT INTO notifications (recipient_id, sender_id, type, title, message, created_at)
        SELECT 
            NEW.student_id,
            NEW.graded_by,
            'submission_graded',
            'Assignment Graded',
            'Your submission for "' || a.title || '" has been graded. Score: ' || 
            NEW.score || '/' || a.total_marks,
            NOW()
        FROM assignments a
        WHERE a.id = NEW.assignment_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_submission_graded
    AFTER UPDATE OF submission_status ON assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION notify_submission_graded();
```

---

## Further Considerations

### 1. Proctoring Implementation
**Question**: Frontend proctoring requires JavaScript event listeners for:
- `window.onblur` / `visibilitychange` API for tab switching detection
- `paste` event blocking
- `contextmenu` event blocking (right-click)
- Fullscreen API monitoring
- Optional: IP tracking, session fingerprinting, or webcam monitoring

**Decision needed**: Should we implement:
- **Option A**: Basic browser-based proctoring (current plan)
- **Option B**: Advanced proctoring with IP whitelisting + session fingerprinting
- **Option C**: Integration with third-party proctoring services (Proctorio, Respondus)

### 2. Coding Question Execution
**Question**: Code execution environment affects `question_data` JSONB structure and security:

**Decision needed**:
- **Option A**: Client-side sandboxed execution (WebAssembly) - Limited to JS/Python/C++, lower security
- **Option B**: Server-side containerized execution (Judge0/Piston API) - Supports 40+ languages, requires API integration
- **Option C**: Hybrid approach - Simple tests client-side, complex tests server-side

**Recommendation**: Option B (Server-side) for production security. Add `execution_logs` JSONB to `submission_answers` table.

### 3. File Upload Strategy
**Question**: Where to store assignment attachments (PDFs/images) and student essay/code submissions?

**Decision needed**:
- **Option A**: Supabase Storage with URLs in DB (integrated auth, automatic RLS)
- **Option B**: Third-party CDN (Cloudinary/S3) - Better performance, additional costs
- **Option C**: Base64 in JSONB - NOT recommended for files >1MB

**Recommendation**: Option A (Supabase Storage) with storage buckets:
- `assignment-attachments` bucket (faculty uploads)
- `submission-files` bucket (student uploads)
- Add RLS policies to buckets matching database policies

### 4. Real-time Proctoring Dashboard
**Question**: Faculty monitoring interface for live violations and submission tracking.

**Decision needed**:
- **Option A**: Polling-based (fetch violations every 10s) - Simpler implementation
- **Option B**: WebSocket/Supabase Realtime - True real-time updates, better UX
- **Option C**: Hybrid - Realtime for violations, polling for submission stats

**Recommendation**: Option B for critical violations, Option A for analytics updates.

### 5. Plagiarism Detection
**Question**: For essay/coding questions, how to detect copied content?

**Decision needed**:
- **Option A**: External API integration (Turnitin/Copyleaks) - Expensive, requires API keys
- **Option B**: Simple string similarity checks (Levenshtein distance) - Basic detection, store in `submission_metadata` JSONB
- **Option C**: Manual faculty review only - No automated detection

**Recommendation**: Option B for MVP, with Option A as premium feature. Add `plagiarism_score` column to `assignment_submissions`.

### 6. Assignment Templates
**Question**: Should faculty have predefined templates for common assignment types?

**Decision needed**:
- **Option A**: Add `assignment_templates` table with reusable question banks
- **Option B**: JSON import/export for sharing assignments between faculty
- **Option C**: No templates, manual creation each time

**Recommendation**: Option A with template library:
```sql
CREATE TABLE assignment_templates (
    id UUID PRIMARY KEY,
    college_id UUID REFERENCES colleges(id),
    created_by UUID REFERENCES users(id),
    template_name VARCHAR(255),
    description TEXT,
    type assignment_type,
    template_data JSONB, -- Stores full assignment + questions structure
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7. Offline Mode / Network Interruption
**Question**: What happens if a student loses internet connection during the assignment?

**Decision needed**:
- **Option A**: Auto-save draft answers every 30s to `submission_answers` (current plan supports this)
- **Option B**: IndexedDB/LocalStorage client-side backup with sync on reconnection
- **Option C**: No recovery - lost progress on disconnect

**Recommendation**: Option B with Option A as backup. Add `is_draft` boolean to `submission_answers` for unsaved changes.

### 8. Question Bank & Randomization
**Question**: Should assignments support randomized question pools to prevent cheating?

**Decision needed**:
- **Option A**: Add `question_pools` table with random selection logic
- **Option B**: Shuffle question order + shuffle MCQ options per student
- **Option C**: Fixed questions for all students (current plan)

**Recommendation**: Option B for MVP (simpler). Add `randomize_questions` and `randomize_options` booleans to `assignments` table.

---

## Database Schema Change Summary

### New Tables (8):
1. `assignments` - Core assignment metadata
2. `assignment_questions` - Question bank with JSONB flexibility
3. `assignment_submissions` - Student submission tracking
4. `submission_answers` - Individual answer storage
5. `proctoring_violations` - Violation log with auto-submit logic
6. `assignment_attachments` - File storage references
7. `coding_test_cases` - Coding question test cases
8. `assignment_analytics` - Aggregate statistics

### New ENUMs (5):
1. `assignment_type`
2. `assignment_status`
3. `submission_status`
4. `question_type`
5. `violation_type`

### New Functions (6):
1. `auto_grade_submission()` - MCQ/MSQ/Fill-in-blank grading
2. `check_submission_deadline()` - Late submission detection
3. `calculate_assignment_analytics()` - Statistics computation
4. `handle_proctoring_violation()` - 3-strike auto-submit
5. `get_student_assignments()` - Student dashboard query
6. `get_faculty_assignments()` - Faculty dashboard query

### New Triggers (11):
- Standard `updated_at` triggers for all tables
- `trigger_auto_grade_on_submit` - Automatic grading
- `trigger_check_late_submission` - Deadline enforcement
- `trigger_update_analytics_on_submission` - Real-time stats
- `trigger_handle_violation` - Proctoring logic
- `trigger_notify_assignment_published` - Student notifications
- `trigger_notify_submission_graded` - Grading notifications
- Audit triggers for sensitive operations

### RLS Policies (16):
- Full college-based isolation for all tables
- Faculty: Full CRUD on own assignments + batch subjects
- Students: SELECT published assignments in enrolled batches
- Students: INSERT/UPDATE own submissions only
- Violations: Hidden from students until graded
- Analytics: Faculty and admins only

### Indexes (12):
Optimized for:
- College-based queries (all tables)
- Student dashboard (assignment listing + submission status)
- Faculty dashboard (assignment analytics + grading queue)
- Proctoring monitoring (violation tracking)

---

## Next Steps After Database Implementation

1. **Backend API Endpoints** (Next.js API routes):
   - `POST /api/assignments` - Create assignment
   - `GET /api/assignments` - List assignments (role-based)
   - `POST /api/assignments/[id]/publish` - Publish assignment
   - `POST /api/submissions` - Submit assignment
   - `POST /api/submissions/[id]/violations` - Log violation
   - `GET /api/assignments/[id]/analytics` - Get statistics

2. **Frontend Pages**:
   - **Faculty**: Assignment creation wizard with question builder
   - **Faculty**: Grading interface with bulk actions
   - **Student**: Assignment dashboard with filtering
   - **Student**: Proctored test interface with violation tracker
   - **Both**: Results page with detailed feedback

3. **Proctoring System** (Client-side JavaScript):
   - Browser lock mode (prevent tab switching)
   - Copy-paste prevention
   - Right-click blocking
   - Fullscreen enforcement
   - Violation logging to `/api/submissions/[id]/violations`
   - Warning modal (1st, 2nd warning) → Auto-submit (3rd violation)

4. **Auto-grading Service**:
   - MCQ/MSQ: Immediate grading via trigger
   - Fill-in-blank: Fuzzy matching with Levenshtein distance
   - Coding: Integration with Judge0/Piston API
   - Essay: Manual grading with rubric support

5. **Testing Strategy**:
   - **Unit tests**: Database functions (grading logic, violation handling)
   - **Integration tests**: API endpoints with RLS policies
   - **E2E tests**: Student submission flow with proctoring
   - **Load tests**: Concurrent submissions stress testing

---

## Estimated Implementation Timeline

- **Database Schema**: 1-2 days (SQL creation + testing)
- **Backend APIs**: 3-4 days (8 endpoints + validation)
- **Faculty UI**: 4-5 days (Assignment builder + grading interface)
- **Student UI**: 3-4 days (Dashboard + test interface)
- **Proctoring System**: 2-3 days (Browser lock + violation tracking)
- **Auto-grading**: 2-3 days (MCQ/MSQ/coding execution)
- **Testing & QA**: 3-4 days (Unit + E2E tests)

**Total**: 18-25 days for complete implementation

---

**Ready to implement?** Start with Step 1 (ENUMs) and proceed sequentially through Step 8. Each step is independent and can be tested incrementally.
