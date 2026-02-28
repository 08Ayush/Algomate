-- ============================================================================
-- SUPABASE STORAGE SETUP: User Avatars
-- ============================================================================

-- Create avatars bucket (run this in Supabase SQL Editor or Dashboard)

-- Note: Buckets are created through Supabase Dashboard Storage section
-- This file documents the required configuration

/*
BUCKET CONFIGURATION:
--------------------
Bucket name: avatars
Public: Yes (allows public access to avatar images)
File size limit: 2MB
Allowed MIME types: image/jpeg, image/png, image/webp

ROW LEVEL SECURITY POLICIES:
----------------------------
*/

-- Policy 1: Allow users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow users to update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow public access to view all avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ============================================================================
-- HOW TO CREATE THE BUCKET:
-- ============================================================================
/*
1. Go to Supabase Dashboard > Storage
2. Click "New bucket"
3. Set:
   - Name: avatars
   - Public bucket: Enable
   - File size limit: 2097152 (2MB in bytes)
   - Allowed MIME types: image/jpeg,image/png,image/webp
4. Create bucket
5. Run the RLS policies above in the SQL Editor
*/
