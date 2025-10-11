-- ============================================================================
-- ADD is_continuation COLUMN TO scheduled_classes TABLE
-- This column is needed to properly display lab continuation slots
-- ============================================================================

-- Add is_continuation column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'scheduled_classes' 
        AND column_name = 'is_continuation'
    ) THEN
        ALTER TABLE scheduled_classes 
        ADD COLUMN is_continuation BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE '✅ Added is_continuation column to scheduled_classes table';
    ELSE
        RAISE NOTICE 'ℹ️ Column is_continuation already exists';
    END IF;
END $$;

-- Add is_lab column if it doesn't exist (for easier querying)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'scheduled_classes' 
        AND column_name = 'is_lab'
    ) THEN
        ALTER TABLE scheduled_classes 
        ADD COLUMN is_lab BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE '✅ Added is_lab column to scheduled_classes table';
    ELSE
        RAISE NOTICE 'ℹ️ Column is_lab already exists';
    END IF;
END $$;

-- Add session_number column if it doesn't exist (to track which session of a lab)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'scheduled_classes' 
        AND column_name = 'session_number'
    ) THEN
        ALTER TABLE scheduled_classes 
        ADD COLUMN session_number INT DEFAULT 1;
        
        RAISE NOTICE '✅ Added session_number column to scheduled_classes table';
    ELSE
        RAISE NOTICE 'ℹ️ Column session_number already exists';
    END IF;
END $$;

-- Verify the changes
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'scheduled_classes'
AND column_name IN ('is_continuation', 'is_lab', 'session_number')
ORDER BY column_name;

-- Success message
SELECT 
    '✅ Migration complete!' as status,
    'Added is_continuation, is_lab, and session_number columns' as changes,
    'These columns enable proper lab continuation display' as purpose;
