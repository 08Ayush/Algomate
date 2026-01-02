-- ============================================================================
-- BACKFILL EXISTING COLLEGES INTO ENTERPRISE REGISTRATION SYSTEM
-- Run this script to link existing colleges to the demo/registration tracking
-- ============================================================================

-- Step 1: View your existing colleges
SELECT id, name, code, email, city, state, created_at 
FROM colleges 
WHERE is_active = true;

-- Step 2: Create demo_requests entries for existing colleges (status = 'registered')
-- This creates a record showing these colleges went through the "legacy" registration
INSERT INTO demo_requests (
    institution_name,
    institution_type,
    student_count,
    contact_name,
    email,
    phone,
    city,
    state,
    country,
    status,
    follow_up_notes,
    created_at,
    updated_at
)
SELECT 
    c.name as institution_name,
    'College' as institution_type,
    '1000-5000' as student_count,  -- Default estimate
    COALESCE(c.principal_name, 'Admin') as contact_name,
    COALESCE(c.email, 'admin@' || LOWER(c.code) || '.edu') as email,
    COALESCE(c.phone, 'N/A') as phone,
    COALESCE(c.city, 'Unknown') as city,
    COALESCE(c.state, 'Unknown') as state,
    COALESCE(c.country, 'India') as country,
    'registered' as status,
    'Pre-existing college - backfilled into enterprise registration system on ' || NOW()::date as follow_up_notes,
    c.created_at,
    NOW()
FROM colleges c
WHERE c.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM demo_requests dr 
    WHERE dr.institution_name = c.name
);

-- Step 3: Create registration_tokens entries (marked as used)
-- Links the demo requests to the actual colleges
INSERT INTO registration_tokens (
    token,
    demo_request_id,
    institution_name,
    email,
    expires_at,
    is_used,
    used_at,
    college_id,
    created_at
)
SELECT 
    'LEGACY-' || UPPER(c.code) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8) as token,
    dr.id as demo_request_id,
    c.name as institution_name,
    c.email,
    NOW() as expires_at,  -- Already expired (doesn't matter since it's used)
    true as is_used,
    c.created_at as used_at,  -- When the college was originally created
    c.id as college_id,
    c.created_at
FROM colleges c
JOIN demo_requests dr ON dr.institution_name = c.name AND dr.status = 'registered'
WHERE c.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM registration_tokens rt 
    WHERE rt.college_id = c.id
);

-- Step 4: Verify the backfill
SELECT 
    c.name as college_name,
    c.code as college_code,
    dr.status as demo_status,
    rt.token as registration_token,
    rt.is_used,
    rt.used_at
FROM colleges c
LEFT JOIN registration_tokens rt ON rt.college_id = c.id
LEFT JOIN demo_requests dr ON dr.id = rt.demo_request_id
WHERE c.is_active = true;

-- ============================================================================
-- ALTERNATIVE: Manual Entry for Specific Colleges
-- ============================================================================
-- If you want to manually add entries for specific colleges, use this template:

/*
-- For College 1 (replace with your actual college details)
INSERT INTO demo_requests (
    institution_name, institution_type, student_count, contact_name, 
    email, phone, city, state, country, status, follow_up_notes, created_at
) VALUES (
    'Your College Name',
    'Engineering College',
    '2000-5000',
    'Principal Name',
    'admin@college.edu',
    '+91-XXXXXXXXXX',
    'City',
    'State',
    'India',
    'registered',
    'Pre-existing college - manually added to enterprise registration system',
    '2025-01-01'  -- Original registration date
);

-- Then link it
INSERT INTO registration_tokens (
    token, demo_request_id, institution_name, email, 
    expires_at, is_used, used_at, college_id, created_at
)
SELECT 
    'LEGACY-COLLEGECODE-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
    dr.id,
    'Your College Name',
    'admin@college.edu',
    NOW(),
    true,
    '2025-01-01',
    'your-college-uuid-here',
    '2025-01-01'
FROM demo_requests dr
WHERE dr.institution_name = 'Your College Name';
*/
