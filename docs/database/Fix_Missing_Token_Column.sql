-- Add token and last_login columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS token text,
ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- Comment on columns
COMMENT ON COLUMN public.users.token IS 'Session token for authentication';
COMMENT ON COLUMN public.users.last_login IS 'Timestamp of last successful login';
