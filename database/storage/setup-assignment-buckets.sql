-- ============================================================================
-- SUPABASE STORAGE SETUP: Assignment Files
-- ============================================================================

-- Create assignment-attachments bucket (run this in Supabase SQL Editor or Dashboard)
-- Create submission-files bucket

/*
BUCKET 1: assignment-attachments
---------------------------------
Bucket name: assignment-attachments
Public: Yes (allows students to view faculty attachments)
File size limit: 10MB
Allowed MIME types: application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp

BUCKET 2: submission-files
---------------------------
Bucket name: submission-files
Public: No (private, only accessible to student owner and faculty)
File size limit: 5MB
Allowed MIME types: application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp,text/plain,application/zip

STORAGE STRUCTURE:
------------------
assignment-attachments/
  ├── {assignmentId}/
  │   ├── {timestamp}_{filename}.pdf
  │   └── {timestamp}_{filename}.docx

submission-files/
  ├── {submissionId}/
  │   ├── {questionId}/
  │   │   ├── {timestamp}_{filename}.pdf
  │   │   └── {timestamp}_{filename}.zip

ROW LEVEL SECURITY POLICIES:
-----------------------------
*/

-- ============================================================================
-- BUCKET 1: assignment-attachments
-- ============================================================================

-- Policy 1: Faculty can upload assignment attachments
CREATE POLICY "Faculty can upload assignment attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assignment-attachments' AND
  -- Check if user is faculty who created this assignment
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM assignments 
    WHERE created_by = auth.uid()
  )
);

-- Policy 2: Faculty can update their assignment attachments
CREATE POLICY "Faculty can update assignment attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'assignment-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM assignments 
    WHERE created_by = auth.uid()
  )
);

-- Policy 3: Faculty can delete their assignment attachments
CREATE POLICY "Faculty can delete assignment attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assignment-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM assignments 
    WHERE created_by = auth.uid()
  )
);

-- Policy 4: Students can view published assignment attachments
CREATE POLICY "Students can view assignment attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignment-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM assignments 
    WHERE is_published = TRUE
    AND batch_id IN (
      SELECT batch_id FROM student_batch_enrollment 
      WHERE student_id = auth.uid() AND is_active = TRUE
    )
  )
);

-- Policy 5: Public read for assignment attachments (optional - if you want unauthenticated access)
-- Uncomment if needed:
-- CREATE POLICY "Public read assignment attachments"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'assignment-attachments');

-- ============================================================================
-- BUCKET 2: submission-files
-- ============================================================================

-- Policy 1: Students can upload files to their own submissions
CREATE POLICY "Students can upload submission files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-files' AND
  -- Check if submission belongs to the student
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM assignment_submissions 
    WHERE student_id = auth.uid()
  )
);

-- Policy 2: Students can update their submission files (before submission deadline)
CREATE POLICY "Students can update own submission files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM assignment_submissions 
    WHERE student_id = auth.uid()
    AND submission_status NOT IN ('SUBMITTED', 'GRADED')
  )
);

-- Policy 3: Students can delete their submission files (before submission)
CREATE POLICY "Students can delete own submission files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM assignment_submissions 
    WHERE student_id = auth.uid()
    AND submission_status NOT IN ('SUBMITTED', 'GRADED')
  )
);

-- Policy 4: Students can view their own submission files
CREATE POLICY "Students can view own submissions"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM assignment_submissions 
    WHERE student_id = auth.uid()
  )
);

-- Policy 5: Faculty can view submission files for their assignments
CREATE POLICY "Faculty can view submission files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (storage.foldername(name))[1] IN (
    SELECT s.id::text FROM assignment_submissions s
    JOIN assignments a ON s.assignment_id = a.id
    WHERE a.created_by = auth.uid()
  )
);

-- Policy 6: Faculty can delete submission files (for grading/moderation)
CREATE POLICY "Faculty can delete submission files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'submission-files' AND
  (storage.foldername(name))[1] IN (
    SELECT s.id::text FROM assignment_submissions s
    JOIN assignments a ON s.assignment_id = a.id
    WHERE a.created_by = auth.uid()
  )
);

-- ============================================================================
-- HOW TO CREATE THE BUCKETS:
-- ============================================================================
/*
1. Go to Supabase Dashboard > Storage
2. Click "New bucket"

BUCKET 1:
---------
3. Set:
   - Name: assignment-attachments
   - Public bucket: Enable
   - File size limit: 10485760 (10MB in bytes)
   - Allowed MIME types: application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp
4. Create bucket
5. Run the RLS policies for assignment-attachments above

BUCKET 2:
---------
6. Click "New bucket" again
7. Set:
   - Name: submission-files
   - Public bucket: Disable (private)
   - File size limit: 5242880 (5MB in bytes)
   - Allowed MIME types: application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp,text/plain,application/zip
8. Create bucket
9. Run the RLS policies for submission-files above
*/
