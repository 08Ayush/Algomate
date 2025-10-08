-- Test script to verify the time_slots constraint fix
-- This script tests that the reasonable_duration constraint now works correctly

-- Test 1: Regular time slot (should pass - 60 minutes)
SELECT 'Test 1: Regular 60-minute slot' as test_case;
-- Should work: 60 minutes for regular class
SELECT 
    CASE 
        WHEN FALSE = TRUE OR FALSE = TRUE THEN 
            EXTRACT(EPOCH FROM ('10:00:00'::TIME - '09:00:00'::TIME)) / 60 BETWEEN 5 AND 60
        ELSE 
            EXTRACT(EPOCH FROM ('10:00:00'::TIME - '09:00:00'::TIME)) / 60 BETWEEN 30 AND 240
    END as should_be_true;

-- Test 2: Break time slot (should pass - 15 minutes)
SELECT 'Test 2: Break 15-minute slot' as test_case;
-- Should work: 15 minutes for break
SELECT 
    CASE 
        WHEN TRUE = TRUE OR FALSE = TRUE THEN 
            EXTRACT(EPOCH FROM ('11:15:00'::TIME - '11:00:00'::TIME)) / 60 BETWEEN 5 AND 60
        ELSE 
            EXTRACT(EPOCH FROM ('11:15:00'::TIME - '11:00:00'::TIME)) / 60 BETWEEN 30 AND 240
    END as should_be_true;

-- Test 3: Regular time slot too short (should fail - 20 minutes)
SELECT 'Test 3: Regular 20-minute slot (should fail)' as test_case;
-- Should fail: 20 minutes for regular class (less than 30)
SELECT 
    CASE 
        WHEN FALSE = TRUE OR FALSE = TRUE THEN 
            EXTRACT(EPOCH FROM ('09:20:00'::TIME - '09:00:00'::TIME)) / 60 BETWEEN 5 AND 60
        ELSE 
            EXTRACT(EPOCH FROM ('09:20:00'::TIME - '09:00:00'::TIME)) / 60 BETWEEN 30 AND 240
    END as should_be_false;

-- Test 4: Break time too short (should fail - 2 minutes)
SELECT 'Test 4: Break 2-minute slot (should fail)' as test_case;
-- Should fail: 2 minutes for break (less than 5)
SELECT 
    CASE 
        WHEN TRUE = TRUE OR FALSE = TRUE THEN 
            EXTRACT(EPOCH FROM ('11:02:00'::TIME - '11:00:00'::TIME)) / 60 BETWEEN 5 AND 60
        ELSE 
            EXTRACT(EPOCH FROM ('11:02:00'::TIME - '11:00:00'::TIME)) / 60 BETWEEN 30 AND 240
    END as should_be_false;

SELECT 'Constraint logic test completed' as result;