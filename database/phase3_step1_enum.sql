-- ============================================================================
-- PHASE 3 MIGRATION - STEP 1: Add Enum Values
-- ============================================================================
-- RUN THIS FILE FIRST, then run phase3_step2_schema.sql
-- ============================================================================

-- Add TEACHING_PRACTICE enum value
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TEACHING_PRACTICE' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'nep_category')
    ) THEN
        EXECUTE 'ALTER TYPE nep_category ADD VALUE ''TEACHING_PRACTICE''';
    END IF;
END $$;

-- Add DISSERTATION enum value
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'DISSERTATION' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'nep_category')
    ) THEN
        EXECUTE 'ALTER TYPE nep_category ADD VALUE ''DISSERTATION''';
    END IF;
END $$;

-- ============================================================================
-- ✅ STEP 1 COMPLETE
-- Now run phase3_step2_schema.sql
-- ============================================================================
