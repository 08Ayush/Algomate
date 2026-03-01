-- ============================================================================
-- CREATE ALL 8 SEMESTER BATCHES - SIMPLE & FAST
-- Run this script in Supabase SQL Editor to populate your batches table
-- ============================================================================

DO $$
DECLARE
    v_college_id UUID;
    v_dept_id UUID;
    v_dept_code TEXT;
    v_college_code TEXT;
    batch_count INT := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating batches for all departments...';
    RAISE NOTICE '========================================';
    
    -- Loop through all active colleges and departments
    FOR v_college_id, v_college_code, v_dept_id, v_dept_code IN
        SELECT c.id, c.code, d.id, d.code
        FROM colleges c
        JOIN departments d ON c.id = d.college_id
        WHERE c.is_active = TRUE AND d.is_active = TRUE
    LOOP
        RAISE NOTICE 'Processing: % - %', v_college_code, v_dept_code;
        
        -- Create all 8 semesters for this department
        FOR i IN 1..8 LOOP
            INSERT INTO batches (
                name,
                college_id,
                department_id,
                semester,
                academic_year,
                section,
                division,
                expected_strength,
                actual_strength,
                is_active,
                is_current_semester,
                semester_start_date,
                semester_end_date
            ) VALUES (
                v_dept_code || ' - Semester ' || i || ' (2025-26)',
                v_college_id,
                v_dept_id,
                i,
                '2025-26',
                'A',
                1,
                60,
                0,
                TRUE,
                CASE WHEN i = 3 THEN TRUE ELSE FALSE END, -- Mark semester 3 as current
                CASE WHEN i % 2 = 1 THEN '2025-07-01'::DATE ELSE '2026-01-01'::DATE END, -- ODD: Jul, EVEN: Jan
                CASE WHEN i % 2 = 1 THEN '2025-12-31'::DATE ELSE '2026-06-30'::DATE END  -- ODD: Dec, EVEN: Jun
            )
            ON CONFLICT (college_id, department_id, semester, academic_year, name, section) 
            DO UPDATE SET
                is_active = TRUE,
                is_current_semester = CASE WHEN batches.semester = 3 THEN TRUE ELSE FALSE END,
                updated_at = NOW();
            
            batch_count := batch_count + 1;
        END LOOP;
        
        RAISE NOTICE '  ✓ Created 8 batches for %', v_dept_code;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SUCCESS! Created/Updated % batches', batch_count;
    RAISE NOTICE '========================================';
END $$;

-- Verify the results
SELECT 
    c.code as college,
    d.code as department,
    COUNT(*) as total_batches,
    COUNT(*) FILTER (WHERE b.is_current_semester = TRUE) as current_batches,
    STRING_AGG(b.semester::TEXT, ',' ORDER BY b.semester) as semesters
FROM batches b
JOIN colleges c ON b.college_id = c.id
JOIN departments d ON b.department_id = d.id
WHERE b.is_active = TRUE
GROUP BY c.code, d.code
ORDER BY c.code, d.code;

-- Show all batches
SELECT 
    c.code as college,
    d.code as dept,
    b.semester,
    b.name,
    b.is_active,
    b.is_current_semester,
    b.expected_strength
FROM batches b
JOIN colleges c ON b.college_id = c.id
JOIN departments d ON b.department_id = d.id
WHERE b.is_active = TRUE
ORDER BY c.code, d.code, b.semester;

-- ============================================================================
-- CREATE ALL 8 SEMESTER BATCHES - SIMPLE & FAST
-- Run this script in Supabase SQL Editor to populate your batches table
-- ============================================================================

DO $$
DECLARE
    v_college_id UUID;
    v_dept_id UUID;
    v_dept_code TEXT;
    v_college_code TEXT;
    batch_count INT := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating batches for all departments...';
    RAISE NOTICE '========================================';
    
    -- Loop through all active colleges and departments
    FOR v_college_id, v_college_code, v_dept_id, v_dept_code IN
        SELECT c.id, c.code, d.id, d.code
        FROM colleges c
        JOIN departments d ON c.id = d.college_id
        WHERE c.is_active = TRUE AND d.is_active = TRUE
    LOOP
        RAISE NOTICE 'Processing: % - %', v_college_code, v_dept_code;
        
        -- Create all 8 semesters for this department
        FOR i IN 1..8 LOOP
            INSERT INTO batches (
                name,
                college_id,
                department_id,
                semester,
                academic_year,
                section,
                division,
                expected_strength,
                actual_strength,
                is_active,
                is_current_semester,
                semester_start_date,
                semester_end_date
            ) VALUES (
                v_dept_code || ' - Semester ' || i || ' (2025-26)',
                v_college_id,
                v_dept_id,
                i,
                '2025-26',
                'A',
                1,
                60,
                0,
                TRUE,
                CASE WHEN i = 3 THEN TRUE ELSE FALSE END, -- Mark semester 3 as current
                CASE WHEN i % 2 = 1 THEN '2025-07-01'::DATE ELSE '2026-01-01'::DATE END, -- ODD: Jul, EVEN: Jan
                CASE WHEN i % 2 = 1 THEN '2025-12-31'::DATE ELSE '2026-06-30'::DATE END  -- ODD: Dec, EVEN: Jun
            )
            ON CONFLICT (college_id, department_id, semester, academic_year, name, section) 
            DO UPDATE SET
                is_active = TRUE,
                is_current_semester = CASE WHEN batches.semester = 3 THEN TRUE ELSE FALSE END,
                updated_at = NOW();
            
            batch_count := batch_count + 1;
        END LOOP;
        
        RAISE NOTICE '  ✓ Created 8 batches for %', v_dept_code;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SUCCESS! Created/Updated % batches', batch_count;
    RAISE NOTICE '========================================';
END $$;

-- Verify the results
SELECT 
    c.code as college,
    d.code as department,
    COUNT(*) as total_batches,
    COUNT(*) FILTER (WHERE b.is_current_semester = TRUE) as current_batches,
    STRING_AGG(b.semester::TEXT, ',' ORDER BY b.semester) as semesters
FROM batches b
JOIN colleges c ON b.college_id = c.id
JOIN departments d ON b.department_id = d.id
WHERE b.is_active = TRUE
GROUP BY c.code, d.code
ORDER BY c.code, d.code;

-- Show all batches
SELECT 
    c.code as college,
    d.code as dept,
    b.semester,
    b.name,
    b.is_active,
    b.is_current_semester,
    b.expected_strength
FROM batches b
JOIN colleges c ON b.college_id = c.id
JOIN departments d ON b.department_id = d.id
WHERE b.is_active = TRUE
ORDER BY c.code, d.code, b.semester;
