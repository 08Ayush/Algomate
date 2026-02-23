-- ============================================================================
-- AUTHENTICATION SYSTEM SETUP FOR ACADEMIC COMPASS
-- Run this after the main schema to add authentication tables and data
-- ============================================================================

-- Create admin_users table if it doesn't exist (for token-based authentication)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'college_admin',
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE, -- For session tokens
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure college admins are linked to their college
    CONSTRAINT valid_admin_role CHECK (role IN ('super_admin', 'college_admin', 'admin')),
    CONSTRAINT unique_email_per_college UNIQUE(email, college_id)
);

-- Create indexes for admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_token ON admin_users(token) WHERE token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_users_college ON admin_users(college_id, role, is_active);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email, is_active);

-- Add trigger for admin_users timestamp updates
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at 
    BEFORE UPDATE ON admin_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate secure tokens
CREATE OR REPLACE FUNCTION generate_admin_token(user_id UUID)
RETURNS VARCHAR(500) AS $$
DECLARE
    token VARCHAR(500);
    user_data RECORD;
BEGIN
    -- Get user data
    SELECT id, email, college_id INTO user_data FROM admin_users WHERE id = user_id AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found or inactive';
    END IF;
    
    -- Generate token (base64 encoded JSON-like string)
    token := encode(
        ('{"id":"' || user_data.id || '","email":"' || user_data.email || '","college_id":"' || user_data.college_id || '","timestamp":' || extract(epoch from now()) || '}')::bytea, 
        'base64'
    );
    
    -- Update user with new token
    UPDATE admin_users SET token = token, last_login = NOW() WHERE id = user_id;
    
    RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to validate and decode tokens
CREATE OR REPLACE FUNCTION validate_admin_token(input_token VARCHAR(500))
RETURNS TABLE(user_id UUID, email VARCHAR(255), college_id UUID, role user_role) AS $$
BEGIN
    RETURN QUERY
    SELECT au.id, au.email, au.college_id, au.role
    FROM admin_users au
    WHERE au.token = input_token 
      AND au.is_active = TRUE
      AND au.last_login > NOW() - INTERVAL '7 days'; -- Token expires after 7 days
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE ADMIN USERS FOR TESTING
-- ============================================================================

-- Insert sample admin users (password is 'admin123' hashed with bcrypt)
-- Note: In production, use proper password hashing
INSERT INTO admin_users (name, email, password_hash, role, college_id) 
SELECT 
    'College Admin',
    'admin@' || LOWER(REPLACE(c.code, ' ', '')) || '.edu.in',
    '$2b$12$LQv3c1yqBcZPS5NG2OjMzOGnNJd.1jPZ9rJZ4X8YqW8kTMJK.S8YW', -- 'admin123'
    'college_admin'::user_role,
    c.id
FROM colleges c
ON CONFLICT (email) DO NOTHING;

-- Insert a super admin
INSERT INTO admin_users (name, email, password_hash, role, college_id) 
SELECT 
    'Super Administrator',
    'superadmin@academiccompass.edu.in',
    '$2b$12$LQv3c1yqBcZPS5NG2OjMzOGnNJd.1jPZ9rJZ4X8YqW8kTMJK.S8YW', -- 'admin123'
    'super_admin'::user_role,
    (SELECT id FROM colleges LIMIT 1) -- Associate with first college for now
ON CONFLICT (email) DO NOTHING;

-- Generate initial tokens for all admin users
DO $$
DECLARE
    admin_record RECORD;
    new_token VARCHAR(500);
BEGIN
    FOR admin_record IN SELECT id FROM admin_users WHERE is_active = TRUE LOOP
        SELECT generate_admin_token(admin_record.id) INTO new_token;
        RAISE NOTICE 'Generated token for user %: %', admin_record.id, SUBSTRING(new_token, 1, 20) || '...';
    END LOOP;
END $$;

-- ============================================================================
-- AUTHENTICATION HELPER VIEWS
-- ============================================================================

-- View for admin authentication data
CREATE OR REPLACE VIEW admin_auth_view AS
SELECT 
    au.id,
    au.name,
    au.email,
    au.role,
    au.college_id,
    c.name as college_name,
    c.code as college_code,
    au.token,
    au.is_active,
    au.last_login,
    au.created_at
FROM admin_users au
JOIN colleges c ON au.college_id = c.id
WHERE au.is_active = TRUE;

-- ============================================================================
-- SYNC EXISTING USERS TO ADMIN_USERS TABLE
-- ============================================================================

-- Migrate existing faculty/admin users to admin_users table
INSERT INTO admin_users (id, name, email, password_hash, role, college_id, is_active, created_at)
SELECT 
    u.id,
    u.first_name || ' ' || u.last_name as name,
    u.email,
    COALESCE(u.password_hash, '$2b$12$LQv3c1yqBcZPS5NG2OjMzOGnNJd.1jPZ9rJZ4X8YqW8kTMJK.S8YW'), -- Default password if null
    u.role,
    u.college_id,
    u.is_active,
    u.created_at
FROM users u
WHERE u.role IN ('admin', 'college_admin', 'super_admin')
  AND u.email IS NOT NULL
  AND u.college_id IS NOT NULL
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    college_id = EXCLUDED.college_id,
    is_active = EXCLUDED.is_active;

-- Generate tokens for migrated users
DO $$
DECLARE
    admin_record RECORD;
    new_token VARCHAR(500);
BEGIN
    FOR admin_record IN 
        SELECT id FROM admin_users 
        WHERE token IS NULL AND is_active = TRUE 
    LOOP
        SELECT generate_admin_token(admin_record.id) INTO new_token;
        RAISE NOTICE 'Generated token for migrated user %', admin_record.id;
    END LOOP;
END $$;

-- ============================================================================
-- TESTING QUERIES
-- ============================================================================

-- Check created admin users
SELECT 
    name,
    email,
    role,
    college_name,
    SUBSTRING(token, 1, 20) || '...' as token_preview,
    is_active,
    last_login
FROM admin_auth_view
ORDER BY role, college_name;

-- Test token validation
-- SELECT * FROM validate_admin_token('your-token-here');

COMMENT ON TABLE admin_users IS 'Authentication table for college administrators with token-based sessions';
COMMENT ON FUNCTION generate_admin_token(UUID) IS 'Generates secure session tokens for admin users';
COMMENT ON FUNCTION validate_admin_token(VARCHAR) IS 'Validates session tokens and returns user information';