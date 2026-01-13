-- Add grading_mode to reviewer_tests (auto or manual)
ALTER TABLE IF EXISTS public.reviewer_tests
ADD COLUMN IF NOT EXISTS grading_mode TEXT NOT NULL DEFAULT 'auto' CHECK (grading_mode IN ('auto','manual'));

