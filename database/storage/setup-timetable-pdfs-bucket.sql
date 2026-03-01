-- ============================================================================
-- SUPABASE STORAGE SETUP: Timetable PDF Cache
-- ============================================================================

-- Create timetable-exports bucket (run this in Supabase SQL Editor or Dashboard)

/*
BUCKET CONFIGURATION:
---------------------
Bucket name: timetable-exports
Public: Yes (students and faculty need to download PDFs)
File size limit: 5MB (PDF files)
Allowed MIME types: application/pdf

STORAGE STRUCTURE:
------------------
timetable-exports/
  ├── {collegeId}/
  │   ├── {departmentId}/
  │   │   ├── {timetableId}/
  │   │   │   ├── v1_{timestamp}.pdf
  │   │   │   ├── v2_{timestamp}.pdf
  │   │   │   └── v3_{timestamp}.pdf

VERSIONING:
-----------
- Each time a timetable is updated and republished, a new version is created
- Version numbers increment: v1, v2, v3, etc.
- Old versions are retained for audit trail
- Most recent version is always fetched first

CACHE INVALIDATION:
-------------------
- When a timetable is updated, old PDFs can be deleted
- Call invalidateTimetablePDFCache() to remove old versions
- New PDF is generated and cached on next download

ROW LEVEL SECURITY POLICIES:
-----------------------------
*/

-- ============================================================================
-- TIMETABLE EXPORTS BUCKET POLICIES
-- ============================================================================

-- Policy 1: Faculty can upload timetable PDFs
CREATE POLICY "Faculty can upload timetable PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'timetable-exports' AND
  -- Check if user is faculty (or admin)
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('faculty', 'admin', 'college_admin')
  )
);

-- Policy 2: Faculty can update timetable PDFs
CREATE POLICY "Faculty can update timetable PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'timetable-exports' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('faculty', 'admin', 'college_admin')
  )
);

-- Policy 3: Faculty can delete timetable PDFs (for cache invalidation)
CREATE POLICY "Faculty can delete timetable PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'timetable-exports' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('faculty', 'admin', 'college_admin')
  )
);

-- Policy 4: Students and faculty can view/download PDFs
CREATE POLICY "Users can view timetable PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'timetable-exports'
);

-- Policy 5: Public access for timetable PDFs (optional)
-- Uncomment if you want unauthenticated users to download PDFs via links
CREATE POLICY "Public can view timetable PDFs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'timetable-exports');

-- ============================================================================
-- HOW TO CREATE THE BUCKET:
-- ============================================================================
/*
1. Go to Supabase Dashboard > Storage
2. Click "New bucket"
3. Set:
   - Name: timetable-exports
   - Public bucket: Enable (allows CDN caching and public download links)
   - File size limit: 5242880 (5MB in bytes)
   - Allowed MIME types: application/pdf
4. Create bucket
5. Run the RLS policies above in the SQL Editor

PERFORMANCE BENEFITS:
---------------------
- PDFs are generated once and cached
- Subsequent downloads serve from CDN (< 100ms)
- Reduces server CPU load (no regeneration)
- Students/faculty get instant downloads
- Version history for audit compliance

USAGE PATTERN:
--------------
1. Timetable is published → PDF generated and uploaded
2. Student clicks "Download PDF" → Serves cached version
3. Timetable is updated → Old PDF cache invalidated
4. Next download → New PDF generated and cached
5. Repeat
*/
