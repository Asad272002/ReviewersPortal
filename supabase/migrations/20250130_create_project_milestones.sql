-- Drop table if exists to allow clean recreation (removes constraints)
DROP TABLE IF EXISTS public.project_milestones CASCADE;

-- Create a table for project milestones
CREATE TABLE public.project_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_code TEXT NOT NULL REFERENCES public.awarded_teams_info(project_code) ON DELETE CASCADE,
    milestone_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    deliverables TEXT,
    budget NUMERIC,
    status TEXT DEFAULT 'pending', -- e.g., pending, submitted, approved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Allow public read access (so the form can fetch details)
CREATE POLICY "Allow public read access" 
ON public.project_milestones 
FOR SELECT 
USING (true);

-- 2. Allow authenticated users (admins) to insert/update/delete
CREATE POLICY "Allow authenticated full access" 
ON public.project_milestones 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.handle_project_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_project_milestones_updated_at
BEFORE UPDATE ON public.project_milestones
FOR EACH ROW
EXECUTE FUNCTION public.handle_project_milestones_updated_at();
