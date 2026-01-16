-- ============================================================================
-- ADDITIONAL TABLES FOR SUPER ADMIN FEATURES
-- Run this after the main schema to add calendars and settings functionality
-- ============================================================================

-- Academic Calendar Types/Templates
CREATE TABLE IF NOT EXISTS academic_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    calendar_type VARCHAR(50) NOT NULL DEFAULT 'semester' CHECK (calendar_type IN ('semester', 'trimester', 'quarter', 'annual')),
    duration_months INT NOT NULL DEFAULT 6 CHECK (duration_months BETWEEN 1 AND 12),
    terms_per_year INT NOT NULL DEFAULT 2 CHECK (terms_per_year BETWEEN 1 AND 4),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- College to Calendar association
CREATE TABLE IF NOT EXISTS college_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    calendar_id UUID NOT NULL REFERENCES academic_calendars(id) ON DELETE CASCADE,
    academic_year VARCHAR(10) NOT NULL DEFAULT '2025-26',
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(college_id, calendar_id, academic_year)
);

-- System Settings (Key-Value store)
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'notifications', 'security', 'system', 'email')),
    is_secret BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category) VALUES
    ('site_name', 'Academic Compass', 'string', 'Name of the application', 'general'),
    ('site_url', 'http://localhost:3000', 'string', 'Base URL of the application', 'general'),
    ('admin_email', 'admin@academiccompass.edu', 'string', 'Primary admin email address', 'general'),
    ('default_timezone', 'Asia/Kolkata', 'string', 'Default timezone for the application', 'general'),
    ('enable_notifications', 'true', 'boolean', 'Enable in-app notifications', 'notifications'),
    ('enable_email_alerts', 'true', 'boolean', 'Enable email alert notifications', 'notifications'),
    ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', 'system'),
    ('allow_registration', 'true', 'boolean', 'Allow new user registrations', 'system'),
    ('session_timeout', '30', 'number', 'Session timeout in minutes', 'security'),
    ('max_login_attempts', '5', 'number', 'Maximum failed login attempts before lockout', 'security')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default academic calendars
INSERT INTO academic_calendars (name, description, calendar_type, duration_months, terms_per_year, is_default) VALUES
    ('Semester System', 'Two semesters per academic year (6 months each)', 'semester', 6, 2, TRUE),
    ('Trimester System', 'Three trimesters per academic year (4 months each)', 'trimester', 4, 3, FALSE),
    ('Annual System', 'One continuous academic year (12 months)', 'annual', 12, 1, FALSE)
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_academic_calendars_type ON academic_calendars(calendar_type);
CREATE INDEX IF NOT EXISTS idx_academic_calendars_active ON academic_calendars(is_active);
CREATE INDEX IF NOT EXISTS idx_college_calendars_college ON college_calendars(college_id);
CREATE INDEX IF NOT EXISTS idx_college_calendars_calendar ON college_calendars(calendar_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Enable RLS
ALTER TABLE academic_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all for authenticated
CREATE POLICY "Allow all for academic_calendars" ON academic_calendars FOR ALL USING (true);
CREATE POLICY "Allow all for college_calendars" ON college_calendars FOR ALL USING (true);
CREATE POLICY "Allow all for system_settings" ON system_settings FOR ALL USING (true);
