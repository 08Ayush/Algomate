-- ============================================================================
-- ADD AVATAR_URL COLUMN TO USERS TABLE
-- ============================================================================
-- This migration adds avatar_url support for user profile pictures
-- Run this in Supabase SQL Editor

-- Add avatar_url column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.avatar_url IS 'URL to user profile picture stored in Supabase Storage avatars bucket';

-- Optional: Add an index if you frequently query by avatar existence
-- CREATE INDEX IF NOT EXISTS idx_users_avatar ON users(avatar_url) WHERE avatar_url IS NOT NULL;
