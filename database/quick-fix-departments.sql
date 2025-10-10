-- Quick fix: Create departments table if it doesn't exist
-- Run this in Supabase SQL Editor

-- First, let's see what exists
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'departments';

-- Create departments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for now
ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;

-- Insert sample departments
INSERT INTO public.departments (name, code, description) VALUES
    ('Computer Science & Engineering', 'CSE', 'Department of Computer Science and Engineering'),
    ('Information Technology', 'IT', 'Department of Information Technology'),
    ('Electronics & Communication Engineering', 'ECE', 'Department of Electronics & Communication Engineering'),
    ('Mechanical Engineering', 'ME', 'Department of Mechanical Engineering'),
    ('Civil Engineering', 'CE', 'Department of Civil Engineering'),
    ('Electrical Engineering', 'EE', 'Department of Electrical Engineering')
ON CONFLICT (name) DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.departments TO anon, authenticated;

-- Verify it worked
SELECT id, name, code FROM public.departments ORDER BY name;