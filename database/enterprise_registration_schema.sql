-- ============================================================================
-- ACADEMIC COMPASS ERP - ENTERPRISE REGISTRATION SYSTEM
-- Database migration for demo requests and registration tokens
-- ============================================================================

-- Demo Requests Table
-- Stores all demo/trial requests from prospective institutions
CREATE TABLE IF NOT EXISTS demo_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Institution Information
    institution_name VARCHAR(255) NOT NULL,
    institution_type VARCHAR(100) NOT NULL,
    website VARCHAR(255),
    student_count VARCHAR(50) NOT NULL,
    faculty_count VARCHAR(50),
    
    -- Contact Person Information
    contact_name VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    
    -- Location
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    
    -- Requirements
    current_system VARCHAR(255),
    challenges TEXT[], -- Array of challenges they face
    preferred_date DATE,
    preferred_time VARCHAR(50),
    additional_notes TEXT,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending', -- pending, contacted, demo_scheduled, demo_completed, registered, rejected
    assigned_to UUID REFERENCES users(id), -- Sales rep assigned
    demo_scheduled_at TIMESTAMPTZ,
    demo_completed_at TIMESTAMPTZ,
    follow_up_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registration Tokens Table
-- Stores unique tokens for college registration (sent after demo approval)
CREATE TABLE IF NOT EXISTS registration_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Token details
    token VARCHAR(64) UNIQUE NOT NULL, -- Secure random token
    
    -- Associated data
    demo_request_id UUID REFERENCES demo_requests(id),
    institution_name VARCHAR(255),
    email VARCHAR(255),
    
    -- Token status
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    
    -- Tracking
    created_by UUID REFERENCES users(id), -- Super admin who created the token
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON demo_requests(status);
CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON demo_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON demo_requests(email);
CREATE INDEX IF NOT EXISTS idx_registration_tokens_token ON registration_tokens(token);
CREATE INDEX IF NOT EXISTS idx_registration_tokens_expires ON registration_tokens(expires_at) WHERE is_used = FALSE;

-- Add columns to colleges table if not exists
DO $$ 
BEGIN
    -- Add principal details columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colleges' AND column_name = 'principal_name') THEN
        ALTER TABLE colleges ADD COLUMN principal_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colleges' AND column_name = 'principal_email') THEN
        ALTER TABLE colleges ADD COLUMN principal_email VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colleges' AND column_name = 'principal_phone') THEN
        ALTER TABLE colleges ADD COLUMN principal_phone VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colleges' AND column_name = 'established_year') THEN
        ALTER TABLE colleges ADD COLUMN established_year INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colleges' AND column_name = 'affiliated_university') THEN
        ALTER TABLE colleges ADD COLUMN affiliated_university VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colleges' AND column_name = 'accreditation') THEN
        ALTER TABLE colleges ADD COLUMN accreditation VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colleges' AND column_name = 'pincode') THEN
        ALTER TABLE colleges ADD COLUMN pincode VARCHAR(10);
    END IF;
END $$;

-- Update timestamp trigger for demo_requests
CREATE OR REPLACE FUNCTION update_demo_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_demo_requests_timestamp ON demo_requests;
CREATE TRIGGER trigger_update_demo_requests_timestamp
    BEFORE UPDATE ON demo_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_demo_requests_updated_at();

-- RLS Policies for demo_requests (super admin only)
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all demo requests" 
ON demo_requests FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'super_admin'
    )
);

CREATE POLICY "Super admins can insert demo requests" 
ON demo_requests FOR INSERT 
TO authenticated 
WITH CHECK (true); -- Anyone can submit a demo request

CREATE POLICY "Super admins can update demo requests" 
ON demo_requests FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'super_admin'
    )
);

-- RLS Policies for registration_tokens (super admin only)
ALTER TABLE registration_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage registration tokens" 
ON registration_tokens FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'super_admin'
    )
);

-- Grant permissions
GRANT SELECT, INSERT ON demo_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON demo_requests TO service_role;
GRANT ALL ON registration_tokens TO service_role;

COMMENT ON TABLE demo_requests IS 'Stores demo/trial requests from prospective educational institutions';
COMMENT ON TABLE registration_tokens IS 'Stores unique registration tokens for approved institutions';
