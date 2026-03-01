-- Add logo_url columns to colleges and departments tables
ALTER TABLE colleges 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN colleges.logo_url IS 'URL to college logo in institutional-assets storage bucket';
COMMENT ON COLUMN departments.logo_url IS 'URL to department logo in institutional-assets storage bucket';
