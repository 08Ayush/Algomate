-- ============================================================================
-- MAJOR SUBJECT LOCK CONSTRAINT (NEP 2020)
-- ============================================================================
-- This constraint ensures that once a student selects a MAJOR subject in 
-- Semester 3, they CANNOT change it in any subsequent semesters.
-- The major subjects from the same domain will be automatically mapped
-- and become compulsory for the student.
--
-- MINOR subjects can be changed freely in any semester.
-- ============================================================================

-- Step 1: Add columns to track major subject selections and their lock status
ALTER TABLE student_course_selections 
ADD COLUMN IF NOT EXISTS selection_type VARCHAR(20) DEFAULT 'ELECTIVE' CHECK (selection_type IN ('MAJOR', 'MINOR', 'ELECTIVE', 'CORE')),
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS continuation_of UUID REFERENCES student_course_selections(id) ON DELETE SET NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN student_course_selections.selection_type IS 'Type of selection: MAJOR (locked after sem 3), MINOR (changeable), ELECTIVE (changeable), CORE (mandatory)';
COMMENT ON COLUMN student_course_selections.is_locked IS 'TRUE if this is a MAJOR selection that cannot be changed';
COMMENT ON COLUMN student_course_selections.locked_at IS 'Timestamp when the MAJOR was locked (Semester 3)';
COMMENT ON COLUMN student_course_selections.continuation_of IS 'References the previous semester selection for continuation tracking';

-- Step 2: Add domain/track column to subjects table for mapping progression
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS subject_domain VARCHAR(100),
ADD COLUMN IF NOT EXISTS domain_sequence INTEGER,
ADD COLUMN IF NOT EXISTS prerequisite_subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

COMMENT ON COLUMN subjects.subject_domain IS 'Domain/Track name (e.g., "Computer Vision", "Deep Learning", "Network Security")';
COMMENT ON COLUMN subjects.domain_sequence IS 'Sequence number in the domain progression (3,4,5,6,7,8 for semesters)';
COMMENT ON COLUMN subjects.prerequisite_subject_id IS 'Previous semester subject in the same domain track';

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_student_selections_type_lock ON student_course_selections(student_id, selection_type, is_locked);
CREATE INDEX IF NOT EXISTS idx_subjects_domain_sequence ON subjects(subject_domain, domain_sequence, semester);
CREATE INDEX IF NOT EXISTS idx_student_selections_continuation ON student_course_selections(continuation_of);

-- Step 4: Create function to check if student can select/change a major
CREATE OR REPLACE FUNCTION check_major_lock_constraint()
RETURNS TRIGGER AS $$
DECLARE
    existing_major_lock RECORD;
    student_current_sem INTEGER;
BEGIN
    -- Only apply this constraint for MAJOR selections
    IF NEW.selection_type != 'MAJOR' THEN
        RETURN NEW;
    END IF;

    -- Get student's current semester
    SELECT current_semester INTO student_current_sem
    FROM users
    WHERE id = NEW.student_id;

    -- Check if student already has a locked MAJOR from semester 3 or later
    SELECT * INTO existing_major_lock
    FROM student_course_selections
    WHERE student_id = NEW.student_id
      AND selection_type = 'MAJOR'
      AND is_locked = TRUE
      AND semester >= 3
    LIMIT 1;

    -- If there's an existing locked MAJOR
    IF existing_major_lock.id IS NOT NULL THEN
        -- Check if the new selection is a continuation of the locked major
        -- (i.e., same domain, next semester)
        DECLARE
            new_subject_domain VARCHAR(100);
            locked_subject_domain VARCHAR(100);
        BEGIN
            -- Get domain of new subject
            SELECT subject_domain INTO new_subject_domain
            FROM subjects
            WHERE id = NEW.subject_id;

            -- Get domain of locked major subject
            SELECT s.subject_domain INTO locked_subject_domain
            FROM subjects s
            JOIN student_course_selections scs ON s.id = scs.subject_id
            WHERE scs.id = existing_major_lock.id;

            -- If domains don't match, reject the selection
            IF new_subject_domain IS NULL OR locked_subject_domain IS NULL OR 
               new_subject_domain != locked_subject_domain THEN
                RAISE EXCEPTION 'Cannot change MAJOR subject. You selected a MAJOR in Semester % and must continue with subjects from the same domain (%)',
                    existing_major_lock.semester, locked_subject_domain;
            END IF;

            -- If domains match, this is a valid continuation
            NEW.is_locked := TRUE;
            NEW.locked_at := existing_major_lock.locked_at;
            NEW.continuation_of := existing_major_lock.id;
        END;
    ELSE
        -- No existing locked major, check if this is semester 3 or later
        IF NEW.semester >= 3 THEN
            -- Lock this major selection
            NEW.is_locked := TRUE;
            NEW.locked_at := NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to enforce major lock
DROP TRIGGER IF EXISTS enforce_major_lock ON student_course_selections;
CREATE TRIGGER enforce_major_lock
    BEFORE INSERT OR UPDATE ON student_course_selections
    FOR EACH ROW
    EXECUTE FUNCTION check_major_lock_constraint();

-- Step 6: Create function to prevent deletion of locked majors
CREATE OR REPLACE FUNCTION prevent_locked_major_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.selection_type = 'MAJOR' AND OLD.is_locked = TRUE THEN
        RAISE EXCEPTION 'Cannot delete a locked MAJOR subject. MAJOR selections are permanent from Semester 3 onwards.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to prevent deletion
DROP TRIGGER IF EXISTS prevent_major_deletion ON student_course_selections;
CREATE TRIGGER prevent_major_deletion
    BEFORE DELETE ON student_course_selections
    FOR EACH ROW
    EXECUTE FUNCTION prevent_locked_major_deletion();

-- Step 8: Create view for student's major progression tracking
CREATE OR REPLACE VIEW student_major_progression AS
SELECT 
    scs.student_id,
    u.first_name || ' ' || u.last_name AS student_name,
    u.current_semester,
    s.subject_domain,
    scs.semester AS major_selected_semester,
    scs.locked_at,
    s.id AS subject_id,
    s.code AS subject_code,
    s.name AS subject_name,
    s.semester AS subject_semester,
    scs.is_locked,
    CASE 
        WHEN scs.continuation_of IS NOT NULL THEN 'Continuation'
        WHEN scs.is_locked THEN 'Initial Lock'
        ELSE 'Not Locked'
    END AS lock_status
FROM student_course_selections scs
JOIN users u ON scs.student_id = u.id
JOIN subjects s ON scs.subject_id = s.id
WHERE scs.selection_type = 'MAJOR'
ORDER BY scs.student_id, scs.semester;

-- Step 9: Create helper function to get available subjects for student
CREATE OR REPLACE FUNCTION get_available_subjects_for_student(
    p_student_id UUID,
    p_semester INTEGER,
    p_academic_year VARCHAR(10)
)
RETURNS TABLE (
    subject_id UUID,
    subject_code VARCHAR(20),
    subject_name VARCHAR(255),
    subject_domain VARCHAR(100),
    nep_category nep_category,
    is_selectable BOOLEAN,
    selection_type VARCHAR(20),
    reason TEXT
) AS $$
DECLARE
    locked_major_domain VARCHAR(100);
    has_locked_major BOOLEAN := FALSE;
BEGIN
    -- Check if student has a locked major
    SELECT s.subject_domain INTO locked_major_domain
    FROM student_course_selections scs
    JOIN subjects s ON scs.subject_id = s.id
    WHERE scs.student_id = p_student_id
      AND scs.selection_type = 'MAJOR'
      AND scs.is_locked = TRUE
    LIMIT 1;

    has_locked_major := (locked_major_domain IS NOT NULL);

    RETURN QUERY
    SELECT 
        s.id AS subject_id,
        s.code AS subject_code,
        s.name AS subject_name,
        s.subject_domain,
        s.nep_category,
        CASE
            -- If student has locked major and this is a MAJOR subject
            WHEN has_locked_major AND s.nep_category IN ('MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR') THEN
                -- Only allow if it's from the same domain
                (s.subject_domain = locked_major_domain)
            -- MINOR and other electives are always selectable
            WHEN s.nep_category IN ('MINOR', 'CORE MINOR', 'OPEN ELECTIVE', 'MULTIDISCIPLINARY', 'AEC', 'VAC') THEN
                TRUE
            -- Core subjects are mandatory
            WHEN s.nep_category IN ('CORE', 'CORE PARTIAL') THEN
                TRUE
            ELSE
                TRUE
        END AS is_selectable,
        CASE
            WHEN has_locked_major AND s.nep_category IN ('MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR') AND s.subject_domain = locked_major_domain THEN
                'MAJOR'
            WHEN s.nep_category IN ('MINOR', 'CORE MINOR') THEN
                'MINOR'
            WHEN s.nep_category IN ('CORE', 'CORE PARTIAL') THEN
                'CORE'
            ELSE
                'ELECTIVE'
        END AS selection_type,
        CASE
            WHEN has_locked_major AND s.nep_category IN ('MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR') AND s.subject_domain != locked_major_domain THEN
                'You have already selected a MAJOR in ' || locked_major_domain || ' domain. Cannot select from different domain.'
            WHEN has_locked_major AND s.nep_category IN ('MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR') AND s.subject_domain = locked_major_domain THEN
                'Continuation of your locked MAJOR domain'
            WHEN s.nep_category IN ('MINOR', 'CORE MINOR') THEN
                'MINOR subjects can be changed in any semester'
            WHEN s.nep_category IN ('CORE', 'CORE PARTIAL') THEN
                'Core subject - Mandatory'
            ELSE
                'Elective - Can be selected or changed'
        END AS reason
    FROM subjects s
    WHERE s.semester = p_semester
      AND s.is_active = TRUE
    ORDER BY 
        CASE 
            WHEN has_locked_major AND s.subject_domain = locked_major_domain THEN 1
            WHEN s.nep_category IN ('CORE', 'CORE PARTIAL') THEN 2
            ELSE 3
        END,
        s.name;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create helper function to check if student can delete a selection
CREATE OR REPLACE FUNCTION can_student_delete_selection(
    p_student_id UUID,
    p_subject_id UUID
)
RETURNS TABLE (
    can_delete BOOLEAN,
    reason TEXT
) AS $$
DECLARE
    v_selection_type VARCHAR(20);
    v_is_locked BOOLEAN;
    v_semester INTEGER;
BEGIN
    -- Get selection details
    SELECT selection_type, is_locked, semester 
    INTO v_selection_type, v_is_locked, v_semester
    FROM student_course_selections
    WHERE student_id = p_student_id
      AND subject_id = p_subject_id
    LIMIT 1;

    -- Check if can delete
    IF v_selection_type = 'MAJOR' AND v_is_locked = TRUE THEN
        RETURN QUERY SELECT FALSE, 'Cannot delete locked MAJOR subject. MAJOR selections are permanent from Semester 3.';
    ELSIF v_selection_type = 'CORE' THEN
        RETURN QUERY SELECT FALSE, 'Cannot delete core/mandatory subjects.';
    ELSE
        RETURN QUERY SELECT TRUE, 'Selection can be deleted.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATA MIGRATION: Update existing selections
-- ============================================================================

-- Update existing selections to mark them appropriately based on nep_category
UPDATE student_course_selections scs
SET selection_type = CASE 
    WHEN s.nep_category IN ('MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR') THEN 'MAJOR'
    WHEN s.nep_category IN ('MINOR', 'CORE MINOR') THEN 'MINOR'
    WHEN s.nep_category IN ('CORE', 'CORE PARTIAL') THEN 'CORE'
    ELSE 'ELECTIVE'
END,
is_locked = CASE 
    WHEN s.nep_category IN ('MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR') AND scs.semester >= 3 THEN TRUE
    ELSE FALSE
END,
locked_at = CASE 
    WHEN s.nep_category IN ('MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR') AND scs.semester >= 3 THEN scs.enrolled_at
    ELSE NULL
END
FROM subjects s
WHERE scs.subject_id = s.id;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Get available subjects for a student in semester 4
-- SELECT * FROM get_available_subjects_for_student(
--     '123e4567-e89b-12d3-a456-426614174000'::UUID,
--     4,
--     '2024-25'
-- );

-- Example 2: Check if student can delete a selection
-- SELECT * FROM can_student_delete_selection(
--     '123e4567-e89b-12d3-a456-426614174000'::UUID,
--     '987fcdeb-51a2-43f7-b8d9-123456789abc'::UUID
-- );

-- Example 3: View all students' major progressions
-- SELECT * FROM student_major_progression;

COMMENT ON TABLE student_course_selections IS 'Tracks student subject selections with MAJOR lock enforcement from Semester 3';
COMMENT ON FUNCTION check_major_lock_constraint() IS 'Enforces that MAJOR subjects selected in Sem 3+ cannot be changed';
COMMENT ON FUNCTION get_available_subjects_for_student(UUID, INTEGER, VARCHAR) IS 'Returns subjects available for student considering their locked MAJOR';
COMMENT ON VIEW student_major_progression IS 'Shows all students MAJOR subject progressions and lock status';
