-- ============================================================================
-- ASSIGNMENT & PROCTORING SYSTEM - DATABASE SCHEMA
-- Created: December 29, 2025
-- Description: Complete schema for assignment creation, student submissions,
--              auto-grading, and proctoring with violation tracking
-- ============================================================================

-- ============================================================================
-- 1. CREATE NEW ENUM TYPES
-- ============================================================================

-- Assignment type enumeration
CREATE TYPE assignment_type AS ENUM (
    'MCQ',          -- Multiple Choice Question (Single Correct)
    'MSQ',          -- Multiple Select Question (Multiple Correct)
    'FILL_BLANK',   -- Fill in the Blanks
    'ESSAY',        -- Essay/Descriptive Answer
    'CODING',       -- Coding Problem
    'MIXED'         -- Mixed question types
);

-- Assignment status enumeration
CREATE TYPE assignment_status AS ENUM (
    'DRAFT',        -- Being created, not visible to students
    'SCHEDULED',    -- Scheduled for future release
    'ACTIVE',       -- Currently active and available
    'CLOSED',       -- Closed, no more submissions accepted
    'ARCHIVED'      -- Archived for record keeping
);

-- Submission status enumeration
CREATE TYPE submission_status AS ENUM (
    'NOT_STARTED',          -- Student has not started the assignment
    'IN_PROGRESS',          -- Assignment is currently being attempted
    'SUBMITTED',            -- Submitted on time
    'LATE_SUBMISSION',      -- Submitted after deadline
    'GRADED',               -- Graded by faculty
    'RESUBMISSION_REQUIRED' -- Requires resubmission
);

-- Question type enumeration
CREATE TYPE question_type AS ENUM (
    'MCQ',          -- Multiple Choice Question
    'MSQ',          -- Multiple Select Question
    'FILL_BLANK',   -- Fill in the Blanks
    'ESSAY',        -- Essay Question
    'CODING'        -- Coding Question
);

-- Violation type enumeration for proctoring
CREATE TYPE violation_type AS ENUM (
    'TAB_SWITCH',       -- Switched to another tab/window
    'WINDOW_BLUR',      -- Window lost focus
    'COPY_PASTE',       -- Copy-paste detected
    'RIGHT_CLICK',      -- Right-click attempt
    'DEVELOPER_TOOLS',  -- Developer tools opened
    'FULLSCREEN_EXIT'   -- Exited fullscreen mode
);

COMMENT ON TYPE assignment_type IS 'Types of assignments that can be created';
COMMENT ON TYPE assignment_status IS 'Lifecycle status of an assignment';
COMMENT ON TYPE submission_status IS 'Status of student submission';
COMMENT ON TYPE question_type IS 'Types of questions within an assignment';
COMMENT ON TYPE violation_type IS 'Types of proctoring violations that can be detected';

-- ============================================================================
-- 2. CORE ASSIGNMENT TABLES
-- ============================================================================

-- Main assignments table
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Assignment details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type assignment_type NOT NULL,
    status assignment_status DEFAULT 'DRAFT',
    instructions TEXT,
    
    -- Scoring configuration
    total_marks DECIMAL(6,2) NOT NULL CHECK (total_marks > 0),
    passing_marks DECIMAL(6,2) CHECK (passing_marks <= total_marks AND passing_marks >= 0),
    
    -- Timing configuration
    duration_minutes INT CHECK (duration_minutes > 0),
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    
    -- Attempt configuration
    max_attempts INT DEFAULT 1 CHECK (max_attempts > 0),
    
    -- Proctoring configuration
    proctoring_enabled BOOLEAN DEFAULT FALSE,
    max_violations INT DEFAULT 3 CHECK (max_violations >= 0),
    
    -- Result configuration
    show_results_immediately BOOLEAN DEFAULT FALSE,
    allow_review BOOLEAN DEFAULT TRUE,
    
    -- Publishing
    is_published BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_schedule CHECK (scheduled_start IS NULL OR scheduled_end IS NULL OR scheduled_start < scheduled_end),
    CONSTRAINT valid_passing_marks CHECK (passing_marks IS NULL OR passing_marks >= 0)
);

COMMENT ON TABLE assignments IS 'Main table storing assignment metadata and configuration';
COMMENT ON COLUMN assignments.proctoring_enabled IS 'Whether browser-based proctoring is enabled for this assignment';
COMMENT ON COLUMN assignments.max_violations IS 'Maximum proctoring violations before auto-submit (default 3)';
COMMENT ON COLUMN assignments.show_results_immediately IS 'Whether to show results immediately after submission';

-- Assignment questions table
CREATE TABLE assignment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    
    -- Question details
    question_order INT NOT NULL CHECK (question_order > 0),
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    
    -- Scoring
    marks DECIMAL(5,2) NOT NULL CHECK (marks > 0),
    negative_marking DECIMAL(5,2) DEFAULT 0 CHECK (negative_marking >= 0),
    
    -- Question data (JSONB for flexibility)
    -- Structure varies by question_type:
    -- MCQ/MSQ: {"options": [{"id": "A", "text": "...", "is_correct": true}]}
    -- FILL_BLANK: {"blanks": [{"position": 1, "correct_answers": ["ans1", "ans2"]}]}
    -- CODING: {"language": "python", "starter_code": "...", "time_limit": 1000}
    question_data JSONB NOT NULL DEFAULT '{}',
    
    -- Explanation for correct answer
    explanation TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(assignment_id, question_order)
);

COMMENT ON TABLE assignment_questions IS 'Individual questions within an assignment';
COMMENT ON COLUMN assignment_questions.question_data IS 'JSONB field storing question-specific data (options, test cases, blanks, etc.)';
COMMENT ON COLUMN assignment_questions.negative_marking IS 'Marks to deduct for incorrect answer (0 for no negative marking)';

-- Student submissions table
CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    
    -- Attempt tracking
    attempt_number INT NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
    submission_status submission_status DEFAULT 'NOT_STARTED',
    
    -- Timing
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    time_taken_seconds INT,
    
    -- Scoring
    score DECIMAL(6,2) DEFAULT 0,
    percentage DECIMAL(5,2),
    
    -- Grading
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ,
    feedback TEXT,
    auto_graded BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(assignment_id, student_id, attempt_number),
    CONSTRAINT valid_submission_times CHECK (submitted_at IS NULL OR started_at IS NULL OR submitted_at >= started_at)
);

COMMENT ON TABLE assignment_submissions IS 'Student submission records for assignments';
COMMENT ON COLUMN assignment_submissions.auto_graded IS 'Whether the submission was automatically graded (MCQ/MSQ/Fill-blank)';
COMMENT ON COLUMN assignment_submissions.time_taken_seconds IS 'Total time spent on assignment in seconds';

-- Individual answers table
CREATE TABLE submission_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
    
    -- Answer data (JSONB for flexibility)
    -- Structure varies by question_type:
    -- MCQ: {"selected_option": "B"}
    -- MSQ: {"selected_options": ["A", "C"]}
    -- FILL_BLANK: {"answers": ["answer1", "answer2"]}
    -- ESSAY: {"essay_text": "..."}
    -- CODING: {"code": "...", "language": "python", "execution_results": [...]}
    answer_data JSONB NOT NULL DEFAULT '{}',
    
    -- Grading
    is_correct BOOLEAN,
    marks_awarded DECIMAL(5,2) DEFAULT 0,
    evaluator_comments TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(submission_id, question_id)
);

COMMENT ON TABLE submission_answers IS 'Individual answers for each question in a submission';
COMMENT ON COLUMN submission_answers.answer_data IS 'JSONB field storing answer data (selected options, text, code, etc.)';

-- Proctoring violations table
CREATE TABLE proctoring_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    
    -- Violation details
    violation_type violation_type NOT NULL,
    violation_count INT NOT NULL DEFAULT 1 CHECK (violation_count > 0),
    
    -- Detection details
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    snapshot_data JSONB DEFAULT '{}',
    action_taken VARCHAR(50),
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE proctoring_violations IS 'Log of proctoring violations during assignment attempts';
COMMENT ON COLUMN proctoring_violations.snapshot_data IS 'JSONB field storing browser info, user agent, and other context';
COMMENT ON COLUMN proctoring_violations.action_taken IS 'Action taken: WARNING or AUTO_SUBMIT';

-- ============================================================================
-- 3. SUPPORTING TABLES
-- ============================================================================

-- Assignment attachments (reference files, question papers, etc.)
CREATE TABLE assignment_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    
    -- File details
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    
    -- Uploader
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE assignment_attachments IS 'File attachments for assignments (PDFs, images, reference materials)';
COMMENT ON COLUMN assignment_attachments.file_url IS 'URL to file in storage (Supabase Storage, S3, etc.)';

-- Coding question test cases
CREATE TABLE coding_test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
    
    -- Test case details
    test_case_order INT NOT NULL CHECK (test_case_order > 0),
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    
    -- Configuration
    is_sample BOOLEAN DEFAULT FALSE,
    points DECIMAL(5,2) DEFAULT 0,
    time_limit_ms INT DEFAULT 1000,
    memory_limit_mb INT DEFAULT 256,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(question_id, test_case_order)
);

COMMENT ON TABLE coding_test_cases IS 'Test cases for coding questions with input/output validation';
COMMENT ON COLUMN coding_test_cases.is_sample IS 'Whether this test case is visible to students (sample test case)';

-- Assignment analytics (cached statistics)
CREATE TABLE assignment_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE UNIQUE,
    
    -- Statistics
    total_students INT DEFAULT 0,
    submitted_count INT DEFAULT 0,
    pending_count INT DEFAULT 0,
    average_score DECIMAL(6,2) DEFAULT 0,
    highest_score DECIMAL(6,2) DEFAULT 0,
    lowest_score DECIMAL(6,2),
    completion_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamp
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE assignment_analytics IS 'Cached analytics and statistics for assignments';
COMMENT ON COLUMN assignment_analytics.completion_rate IS 'Percentage of enrolled students who have submitted';

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Assignment indexes
CREATE INDEX idx_assignments_college_batch_subject ON assignments(college_id, batch_id, subject_id, status);
CREATE INDEX idx_assignments_status_scheduled ON assignments(status, scheduled_start, scheduled_end) WHERE is_published = TRUE;
CREATE INDEX idx_assignments_created_by ON assignments(created_by, status);
CREATE INDEX idx_assignments_batch_published ON assignments(batch_id, is_published, status);

-- Submission indexes
CREATE INDEX idx_submissions_college_student ON assignment_submissions(student_id, assignment_id, submission_status);
CREATE INDEX idx_submissions_assignment_status ON assignment_submissions(assignment_id, submission_status);
CREATE INDEX idx_submissions_batch ON assignment_submissions(batch_id, submission_status);
CREATE INDEX idx_submissions_grading ON assignment_submissions(graded_by, graded_at) WHERE graded_by IS NOT NULL;
CREATE INDEX idx_submissions_student_active ON assignment_submissions(student_id, submission_status) WHERE submission_status IN ('IN_PROGRESS', 'NOT_STARTED');

-- Question indexes
CREATE INDEX idx_questions_assignment_order ON assignment_questions(assignment_id, question_order);
CREATE INDEX idx_questions_type ON assignment_questions(question_type);

-- Answer indexes
CREATE INDEX idx_answers_submission ON submission_answers(submission_id, question_id);
CREATE INDEX idx_answers_grading ON submission_answers(is_correct) WHERE is_correct IS NOT NULL;

-- Violation indexes
CREATE INDEX idx_violations_submission_time ON proctoring_violations(submission_id, detected_at);
CREATE INDEX idx_violations_type ON proctoring_violations(violation_type, detected_at);
CREATE INDEX idx_violations_submission_count ON proctoring_violations(submission_id, violation_count);

-- Analytics indexes
CREATE INDEX idx_analytics_assignment ON assignment_analytics(assignment_id);

-- Attachment indexes
CREATE INDEX idx_attachments_assignment ON assignment_attachments(assignment_id);

-- Test case indexes
CREATE INDEX idx_test_cases_question ON coding_test_cases(question_id, test_case_order);
CREATE INDEX idx_test_cases_sample ON coding_test_cases(question_id, is_sample) WHERE is_sample = TRUE;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all assignment tables
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctoring_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_analytics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ASSIGNMENTS TABLE POLICIES
-- ============================================================================

-- Faculty can create, read, update, delete their own assignments
CREATE POLICY "assignments_faculty_crud" ON assignments
FOR ALL
USING (
    college_id = current_app_college_id()
    AND (
        -- Faculty who created it
        created_by = current_app_user_id()
        OR
        -- Faculty assigned to teach this subject in this batch
        (current_app_role() = 'faculty' AND batch_id IN (
            SELECT batch_id FROM batch_subjects 
            WHERE assigned_faculty_id = current_app_user_id() 
            AND subject_id = assignments.subject_id
        ))
        OR
        -- Admins and HODs can manage all assignments
        current_app_role() IN ('college_admin', 'admin', 'hod')
    )
);

-- Students can view published assignments in their enrolled batches
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

-- ============================================================================
-- ASSIGNMENT QUESTIONS POLICIES
-- ============================================================================

-- Faculty can CRUD questions for their assignments
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

-- Students can view questions only for published assignments they're enrolled in
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

-- ============================================================================
-- ASSIGNMENT SUBMISSIONS POLICIES
-- ============================================================================

-- Students can manage their own submissions
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

-- Faculty can view all submissions for their assignments
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

-- Faculty can grade submissions for their assignments
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

-- ============================================================================
-- SUBMISSION ANSWERS POLICIES
-- ============================================================================

-- Students can manage answers for their own submissions
CREATE POLICY "answers_student_own" ON submission_answers
FOR ALL
USING (
    submission_id IN (
        SELECT id FROM assignment_submissions 
        WHERE student_id = current_app_user_id()
    )
);

-- Faculty can view answers for submissions in their assignments
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

-- ============================================================================
-- PROCTORING VIOLATIONS POLICIES
-- ============================================================================

-- Faculty can view all violations for their assignments
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

-- Students can view their violations only after grading
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

-- System can insert violations (students' client-side code reports violations)
CREATE POLICY "violations_insert" ON proctoring_violations
FOR INSERT
WITH CHECK (
    submission_id IN (
        SELECT id FROM assignment_submissions 
        WHERE student_id = current_app_user_id()
    )
);

-- ============================================================================
-- ASSIGNMENT ATTACHMENTS POLICIES
-- ============================================================================

-- Faculty can CRUD attachments for their assignments
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

-- Students can view attachments for published assignments they're enrolled in
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

-- ============================================================================
-- CODING TEST CASES POLICIES
-- ============================================================================

-- Faculty can CRUD test cases for their questions
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

-- Students can view only sample test cases
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

-- ============================================================================
-- ASSIGNMENT ANALYTICS POLICIES
-- ============================================================================

-- Faculty and admins can view analytics for their assignments
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

-- ============================================================================
-- 6. DATABASE FUNCTIONS
-- ============================================================================

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
    
    -- Loop through all auto-gradable questions
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
        
        -- MCQ Grading: Check if selected option matches correct option
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
        
        -- MSQ Grading: All correct options must be selected, no incorrect ones
        ELSIF v_question.question_type = 'MSQ' THEN
            DECLARE
                v_correct_options TEXT[];
                v_selected_options TEXT[];
            BEGIN
                -- Get correct option IDs
                SELECT ARRAY_AGG(opt->>'id')
                INTO v_correct_options
                FROM jsonb_array_elements(v_question.question_data->'options') AS opt
                WHERE (opt->>'is_correct')::boolean = true;
                
                -- Get selected option IDs
                SELECT ARRAY_AGG(value::text)
                INTO v_selected_options
                FROM jsonb_array_elements_text(v_answer.answer_data->'selected_options');
                
                -- Check if arrays match exactly (both ways to ensure no extra/missing selections)
                v_is_correct := (
                    v_correct_options IS NOT NULL AND 
                    v_selected_options IS NOT NULL AND
                    v_correct_options @> v_selected_options AND 
                    v_correct_options <@ v_selected_options
                );
                
                IF v_is_correct THEN
                    v_marks_awarded := v_question.marks;
                ELSE
                    v_marks_awarded := -v_question.negative_marking;
                END IF;
            END;
        
        -- Fill in the Blank Grading: Partial credit for correct answers
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
                    SELECT 
                        (blank->>'position')::int AS position, 
                        blank->'correct_answers' AS correct_answers
                    FROM jsonb_array_elements(v_question.question_data->'blanks') AS blank
                LOOP
                    -- Get student's answer for this blank (0-indexed in array)
                    v_student_answer := v_answer.answer_data->'answers'->(v_blank.position - 1);
                    v_student_answer := TRIM(BOTH '"' FROM v_student_answer);
                    
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
                IF v_total_blanks > 0 THEN
                    v_marks_awarded := (v_question.marks * v_correct_count::DECIMAL) / v_total_blanks;
                END IF;
            END;
        END IF;
        
        -- Update submission_answers with grading results
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

COMMENT ON FUNCTION auto_grade_submission(UUID) IS 'Automatically grades MCQ, MSQ, and Fill-in-blank questions for a submission';

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

COMMENT ON FUNCTION check_submission_deadline() IS 'Trigger function to mark submissions as LATE_SUBMISSION if submitted after deadline';

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
    -- Get total enrolled students for this assignment's batch
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

COMMENT ON FUNCTION calculate_assignment_analytics(UUID) IS 'Calculates and updates aggregate statistics for an assignment';

-- Function: Handle proctoring violation
CREATE OR REPLACE FUNCTION handle_proctoring_violation()
RETURNS TRIGGER AS $$
DECLARE
    v_total_violations INT;
    v_max_violations INT;
    v_proctoring_enabled BOOLEAN;
    v_assignment_title TEXT;
BEGIN
    -- Get current total violation count for this submission
    SELECT COUNT(*) INTO v_total_violations
    FROM proctoring_violations
    WHERE submission_id = NEW.submission_id;
    
    -- Get assignment proctoring settings
    SELECT a.max_violations, a.proctoring_enabled, a.title
    INTO v_max_violations, v_proctoring_enabled, v_assignment_title
    FROM assignment_submissions s
    JOIN assignments a ON s.assignment_id = a.id
    WHERE s.id = NEW.submission_id;
    
    -- If proctoring is enabled and max violations reached, auto-submit
    IF v_proctoring_enabled AND v_total_violations >= v_max_violations THEN
        UPDATE assignment_submissions
        SET submission_status = 'SUBMITTED',
            submitted_at = NOW(),
            time_taken_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INT
        WHERE id = NEW.submission_id
        AND submission_status = 'IN_PROGRESS';
        
        -- Mark action taken
        NEW.action_taken := 'AUTO_SUBMIT';
        
        -- Send notification to student
        INSERT INTO notifications (
            recipient_id, sender_id, type, title, message, created_at
        )
        SELECT 
            s.student_id,
            NULL,
            'system_alert',
            'Assignment Auto-Submitted',
            'Your assignment "' || v_assignment_title || '" has been automatically submitted due to ' || v_max_violations || ' proctoring violations.',
            NOW()
        FROM assignment_submissions s
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
            'system_alert',
            'Proctoring Violation Warning #' || v_total_violations,
            'Warning: Proctoring violation detected. ' || (v_max_violations - v_total_violations) || ' warnings remaining before auto-submission.',
            NOW()
        FROM assignment_submissions s
        WHERE s.id = NEW.submission_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION handle_proctoring_violation() IS 'Handles proctoring violations: sends warnings and auto-submits after max violations';

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
    score DECIMAL,
    attempt_number INT
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
        sub.score,
        sub.attempt_number
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
    ORDER BY a.scheduled_start DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_student_assignments(UUID, UUID) IS 'Returns all available assignments for a student in their batch';

-- Function: Get faculty assignments with statistics
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

COMMENT ON FUNCTION get_faculty_assignments(UUID) IS 'Returns all assignments created by or assigned to a faculty member';

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION auto_grade_submission(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_submission_deadline() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_assignment_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_proctoring_violation() TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_assignments(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_faculty_assignments(UUID) TO authenticated;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Trigger: Auto-grade on submission
CREATE TRIGGER trigger_auto_grade_on_submit
    AFTER UPDATE OF submission_status ON assignment_submissions
    FOR EACH ROW
    WHEN (NEW.submission_status IN ('SUBMITTED', 'LATE_SUBMISSION') AND OLD.submission_status = 'IN_PROGRESS')
    EXECUTE FUNCTION auto_grade_submission(NEW.id);

COMMENT ON TRIGGER trigger_auto_grade_on_submit ON assignment_submissions IS 'Automatically grades auto-gradable questions when submission status changes to SUBMITTED';

-- Trigger: Check late submission
CREATE TRIGGER trigger_check_late_submission
    BEFORE INSERT OR UPDATE OF submitted_at ON assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION check_submission_deadline();

COMMENT ON TRIGGER trigger_check_late_submission ON assignment_submissions IS 'Checks if submission is late and updates status accordingly';

-- Trigger: Update analytics after submission changes
CREATE TRIGGER trigger_update_analytics_on_submission
    AFTER INSERT OR UPDATE OR DELETE ON assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_assignment_analytics(COALESCE(NEW.assignment_id, OLD.assignment_id));

COMMENT ON TRIGGER trigger_update_analytics_on_submission ON assignment_submissions IS 'Updates assignment analytics when submissions change';

-- Trigger: Handle proctoring violations
CREATE TRIGGER trigger_handle_violation
    BEFORE INSERT ON proctoring_violations
    FOR EACH ROW
    EXECUTE FUNCTION handle_proctoring_violation();

COMMENT ON TRIGGER trigger_handle_violation ON proctoring_violations IS 'Handles violation logic: sends warnings or auto-submits based on violation count';

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

-- ============================================================================
-- 8. EXTEND NOTIFICATION SYSTEM
-- ============================================================================

-- Add new notification types for assignments (only if not exists)
DO $$ 
BEGIN
    -- Check and add assignment_created
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'assignment_created' AND enumtypid = 'notification_type'::regtype) THEN
        ALTER TYPE notification_type ADD VALUE 'assignment_created';
    END IF;
    
    -- Check and add assignment_due_soon
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'assignment_due_soon' AND enumtypid = 'notification_type'::regtype) THEN
        ALTER TYPE notification_type ADD VALUE 'assignment_due_soon';
    END IF;
    
    -- Check and add submission_graded
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'submission_graded' AND enumtypid = 'notification_type'::regtype) THEN
        ALTER TYPE notification_type ADD VALUE 'submission_graded';
    END IF;
    
    -- Check and add violation_warning
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'violation_warning' AND enumtypid = 'notification_type'::regtype) THEN
        ALTER TYPE notification_type ADD VALUE 'violation_warning';
    END IF;
    
    -- Check and add auto_submitted
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'auto_submitted' AND enumtypid = 'notification_type'::regtype) THEN
        ALTER TYPE notification_type ADD VALUE 'auto_submitted';
    END IF;
END $$;

-- Function: Notify students when assignment is published
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
            'A new assignment has been published for your batch. ' || 
            CASE 
                WHEN NEW.scheduled_end IS NOT NULL THEN 'Due: ' || TO_CHAR(NEW.scheduled_end, 'DD Mon YYYY HH24:MI')
                ELSE 'No deadline specified.'
            END,
            NOW()
        FROM student_batch_enrollment sbe
        WHERE sbe.batch_id = NEW.batch_id
        AND sbe.is_active = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_assignment_published() IS 'Sends notifications to all students when an assignment is published';

CREATE TRIGGER trigger_notify_assignment_published
    AFTER UPDATE OF is_published ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION notify_assignment_published();

-- Function: Notify student when submission is graded
CREATE OR REPLACE FUNCTION notify_submission_graded()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.submission_status = 'GRADED' AND (OLD.submission_status IS NULL OR OLD.submission_status != 'GRADED') THEN
        INSERT INTO notifications (recipient_id, sender_id, type, title, message, created_at)
        SELECT 
            NEW.student_id,
            NEW.graded_by,
            'submission_graded',
            'Assignment Graded',
            'Your submission for "' || a.title || '" has been graded. Score: ' || 
            NEW.score || '/' || a.total_marks || ' (' || ROUND(NEW.percentage, 2) || '%)',
            NOW()
        FROM assignments a
        WHERE a.id = NEW.assignment_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_submission_graded() IS 'Sends notification to student when their submission is graded';

CREATE TRIGGER trigger_notify_submission_graded
    AFTER UPDATE OF submission_status ON assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION notify_submission_graded();

-- ============================================================================
-- 9. VALIDATION AND COMMENTS
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    trigger_count INTEGER;
BEGIN
    -- Count new tables
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'assignments', 'assignment_questions', 'assignment_submissions',
        'submission_answers', 'proctoring_violations', 'assignment_attachments',
        'coding_test_cases', 'assignment_analytics'
    );
    
    -- Count new functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'auto_grade_submission', 'check_submission_deadline',
        'calculate_assignment_analytics', 'handle_proctoring_violation',
        'get_student_assignments', 'get_faculty_assignments',
        'notify_assignment_published', 'notify_submission_graded'
    );
    
    -- Count new triggers
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgname LIKE '%assignment%' OR tgname LIKE '%submission%' OR tgname LIKE '%violation%';
    
    RAISE NOTICE '==============================================================';
    RAISE NOTICE 'ASSIGNMENT SYSTEM SCHEMA INSTALLATION COMPLETE';
    RAISE NOTICE '==============================================================';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE 'Functions created: %', function_count;
    RAISE NOTICE 'Triggers created: %', trigger_count;
    RAISE NOTICE '==============================================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Review RLS policies to ensure proper access control';
    RAISE NOTICE '2. Test assignment creation and submission workflows';
    RAISE NOTICE '3. Implement frontend proctoring JavaScript listeners';
    RAISE NOTICE '4. Set up Supabase Storage buckets for file uploads';
    RAISE NOTICE '5. Integrate coding question execution service (Judge0/Piston)';
    RAISE NOTICE '==============================================================';
END $$;

-- ============================================================================
-- END OF ASSIGNMENT SYSTEM SCHEMA
-- ============================================================================
