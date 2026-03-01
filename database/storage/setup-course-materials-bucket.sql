-- ============================================================================
-- SUPABASE STORAGE SETUP: Course Materials
-- ============================================================================

-- Create course-materials bucket (run this in Supabase SQL Editor or Dashboard)

/*
BUCKET CONFIGURATION:
---------------------
Bucket name: course-materials
Public: Yes (students need to access materials)
File size limit: 20MB
Allowed MIME types: application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,image/jpeg,image/png,image/webp,text/plain,application/zip

STORAGE STRUCTURE:
------------------
course-materials/
  ├── {subjectId}/
  │   ├── lectures/
  │   │   ├── {timestamp}_lecture1.pdf
  │   │   └── {timestamp}_lecture2.pptx
  │   ├── notes/
  │   │   ├── {timestamp}_chapter1.pdf
  │   │   └── {timestamp}_summary.docx
  │   ├── assignments/
  │   │   └── {timestamp}_homework.pdf
  │   └── misc/
  │       └── {timestamp}_syllabus.pdf

ROW LEVEL SECURITY POLICIES:
-----------------------------
*/

-- ============================================================================
-- COURSE MATERIALS BUCKET POLICIES
-- ============================================================================

-- Policy 1: Faculty can upload materials for subjects they teach
CREATE POLICY "Faculty can upload course materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-materials' AND
  -- Check if faculty teaches this subject
  (storage.foldername(name))[1] IN (
    SELECT DISTINCT s.id::text 
    FROM subjects s
    JOIN batch_subjects bs ON bs.subject_id = s.id
    WHERE bs.assigned_faculty_id = auth.uid()
  )
);

-- Policy 2: Faculty can update materials for subjects they teach
CREATE POLICY "Faculty can update course materials"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-materials' AND
  (storage.foldername(name))[1] IN (
    SELECT DISTINCT s.id::text 
    FROM subjects s
    JOIN batch_subjects bs ON bs.subject_id = s.id
    WHERE bs.assigned_faculty_id = auth.uid()
  )
);

-- Policy 3: Faculty can delete materials for subjects they teach
CREATE POLICY "Faculty can delete course materials"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-materials' AND
  (storage.foldername(name))[1] IN (
    SELECT DISTINCT s.id::text 
    FROM subjects s
    JOIN batch_subjects bs ON bs.subject_id = s.id
    WHERE bs.assigned_faculty_id = auth.uid()
  )
);

-- Policy 4: Students can view materials for subjects they're enrolled in
CREATE POLICY "Students can view course materials"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-materials' AND
  (
    -- Students enrolled in this subject
    (storage.foldername(name))[1] IN (
      SELECT DISTINCT s.id::text 
      FROM subjects s
      JOIN batch_subjects bs ON bs.subject_id = s.id
      JOIN student_batch_enrollment sbe ON sbe.batch_id = bs.batch_id
      WHERE sbe.student_id = auth.uid() AND sbe.is_active = TRUE
    )
    OR
    -- Faculty who teach this subject
    (storage.foldername(name))[1] IN (
      SELECT DISTINCT s.id::text 
      FROM subjects s
      JOIN batch_subjects bs ON bs.subject_id = s.id
      WHERE bs.assigned_faculty_id = auth.uid()
    )
  )
);

-- Policy 5: Admins and HODs can manage all materials
CREATE POLICY "Admins can manage all course materials"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'course-materials' AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'college_admin')
  )
);

-- ============================================================================
-- HOW TO CREATE THE BUCKET:
-- ============================================================================
/*
1. Go to Supabase Dashboard > Storage
2. Click "New bucket"
3. Set:
   - Name: course-materials
   - Public bucket: Enable (so students can access via public URLs)
   - File size limit: 20971520 (20MB in bytes)
   - Allowed MIME types: application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,image/jpeg,image/png,image/webp,text/plain,application/zip
4. Create bucket
5. Run the RLS policies above in the SQL Editor

FOLDER ORGANIZATION TIPS:
--------------------------
Recommended categories for materials:
- lectures: Lecture slides and recordings
- notes: Study notes and summaries
- assignments: Practice problems
- exams: Past papers and solutions
- misc: Syllabus, resources, etc.
*/
