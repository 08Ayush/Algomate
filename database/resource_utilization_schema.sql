-- Resource Utilization Summary Table
-- Tracks usage statistics for faculty, classrooms, and time slots across timetables

CREATE TABLE IF NOT EXISTS resource_utilization_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Resource identification
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('faculty', 'classroom', 'time_slot')),
    resource_id UUID NOT NULL,
    
    -- Scope (college-wide or department-specific)
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    department_id UUID, -- References departments(id) but nullable
    academic_year VARCHAR(9) NOT NULL, -- e.g., '2024-2025'
    semester VARCHAR(20) NOT NULL, -- e.g., 'Fall 2024', 'Spring 2025'
    
    -- Utilization metrics
    total_hours_scheduled DECIMAL(10,2) DEFAULT 0,
    total_classes_count INTEGER DEFAULT 0,
    unique_batches_count INTEGER DEFAULT 0,
    unique_subjects_count INTEGER DEFAULT 0,
    
    -- Capacity and utilization percentage
    available_capacity_hours DECIMAL(10,2), -- Total possible hours (e.g., 40 hours/week * weeks)
    utilization_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN available_capacity_hours > 0 
            THEN (total_hours_scheduled / available_capacity_hours * 100)
            ELSE 0
        END
    ) STORED,
    
    -- Status indicators
    capacity_status VARCHAR(20) DEFAULT 'underutilized' CHECK (
        capacity_status IN ('underutilized', 'optimal', 'near_capacity', 'overutilized')
    ),
    
    -- Conflict tracking
    total_conflicts_count INTEGER DEFAULT 0,
    critical_conflicts_count INTEGER DEFAULT 0,
    
    -- Additional statistics (stored as JSONB for flexibility)
    statistics JSONB DEFAULT '{}', -- { "avg_class_size": 30, "peak_hours": [...], etc. }
    
    -- Metadata
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    calculation_source VARCHAR(50) DEFAULT 'auto', -- 'auto', 'manual', 'scheduled_job'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(resource_type, resource_id, academic_year, semester, college_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_resource_util_type ON resource_utilization_summary(resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_util_resource ON resource_utilization_summary(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_util_college ON resource_utilization_summary(college_id, academic_year, semester);
-- Department index commented out temporarily due to column reference issue
-- CREATE INDEX IF NOT EXISTS idx_resource_util_department ON resource_utilization_summary(department_id, academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_resource_util_capacity ON resource_utilization_summary(capacity_status);
CREATE INDEX IF NOT EXISTS idx_resource_util_year_sem ON resource_utilization_summary(academic_year, semester);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resource_util_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_resource_utilization_summary_updated_at
    BEFORE UPDATE ON resource_utilization_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_util_updated_at();

-- Helper function to determine capacity status based on utilization percentage
CREATE OR REPLACE FUNCTION determine_capacity_status(utilization DECIMAL)
RETURNS VARCHAR AS $$
BEGIN
    RETURN CASE
        WHEN utilization < 50 THEN 'underutilized'
        WHEN utilization >= 50 AND utilization < 75 THEN 'optimal'
        WHEN utilization >= 75 AND utilization < 90 THEN 'near_capacity'
        ELSE 'overutilized'
    END;
END;
$$ LANGUAGE plpgsql;

-- Comments removed to avoid column reference issues in Supabase
-- Table tracks resource usage metrics for analytics and optimization
-- resource_type: faculty, classroom, or time_slot
-- utilization_percentage: Auto-calculated from total_hours / available_capacity * 100
-- capacity_status: underutilized (<50%), optimal (50-75%), near_capacity (75-90%), overutilized (>90%)
-- statistics: JSONB field for additional metrics like peak hours, class sizes, etc.
