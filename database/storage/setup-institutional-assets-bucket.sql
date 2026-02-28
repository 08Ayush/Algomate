-- ============================================================================
-- SUPABASE STORAGE SETUP: Institutional Assets (Logos)
-- ============================================================================

-- Create institutional-assets bucket (run this in Supabase SQL Editor or Dashboard)

/*
BUCKET CONFIGURATION:
---------------------
Bucket name: institutional-assets
Public: Yes (logos displayed publicly on website/headers)
File size limit: 2MB
Allowed MIME types: image/jpeg,image/png,image/svg+xml,image/webp

STORAGE STRUCTURE:
------------------
institutional-assets/
  ├── colleges/
  │   ├── {collegeId}/
  │   │   └── logo.{ext}
  │   └── {collegeId2}/
  │       └── logo.{ext}
  ├── departments/
  │   ├── {departmentId}/
  │   │   └── logo.{ext}
  │   └── {departmentId2}/
  │       └── logo.{ext}

ROW LEVEL SECURITY POLICIES:
-----------------------------
*/

-- ============================================================================
-- INSTITUTIONAL ASSETS BUCKET POLICIES
-- ============================================================================

-- Policy 1: Admins can upload college logos
CREATE POLICY "Admins can upload college logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'institutional-assets' AND
  (storage.foldername(name))[1] = 'colleges' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'college_admin', 'super_admin')
  )
);

-- Policy 2: Admins can update college logos
CREATE POLICY "Admins can update college logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'institutional-assets' AND
  (storage.foldername(name))[1] = 'colleges' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'college_admin', 'super_admin')
  )
);

-- Policy 3: Admins can delete college logos
CREATE POLICY "Admins can delete college logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'institutional-assets' AND
  (storage.foldername(name))[1] = 'colleges' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'college_admin', 'super_admin')
  )
);

-- Policy 4: Admins and HODs can upload department logos
CREATE POLICY "Admins can upload department logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'institutional-assets' AND
  (storage.foldername(name))[1] = 'departments' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'college_admin', 'super_admin')
  )
);

-- Policy 5: Adminsand HODs can update department logos
CREATE POLICY "Admins can update department logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'institutional-assets' AND
  (storage.foldername(name))[1] = 'departments' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'college_admin', 'super_admin')
  )
);

-- Policy 6: Admins and HODs can delete department logos
CREATE POLICY "Admins can delete department logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'institutional-assets' AND
  (storage.foldername(name))[1] = 'departments' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'college_admin', 'super_admin')
  )
);

-- Policy 7: Public read access for all logos
CREATE POLICY "Logos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'institutional-assets');

-- ============================================================================
-- ADD LOGO URL COLUMNS TO TABLES
-- ============================================================================

-- Add logo_url to colleges table
ALTER TABLE colleges 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN colleges.logo_url IS 'URL to college logo in institutional-assets bucket';

-- Add logo_url to departments table
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN departments.logo_url IS 'URL to department logo in institutional-assets bucket';

-- ============================================================================
-- HOW TO CREATE THE BUCKET:
-- ============================================================================
/*
1. Go to Supabase Dashboard > Storage
2. Click "New bucket"
3. Set:
   - Name: institutional-assets
   - Public bucket: Enable
   - File size limit: 2097152 (2MB in bytes)
   - Allowed MIME types: image/jpeg,image/png,image/svg+xml,image/webp
4. Create bucket
5. Run the RLS policies above in the SQL Editor
6. Run the ALTER TABLE commands to add logo_url columns

USE CASES:
----------
- College logo in header/navigation
- Department logo on timetables
- Logos on PDF exports and reports
- Institutional branding on emails
- Website header/footer logos
*/
