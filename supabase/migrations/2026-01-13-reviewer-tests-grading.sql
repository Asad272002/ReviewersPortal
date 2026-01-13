-- Add final decision to reviewer test submissions for admin grading visibility
ALTER TABLE IF EXISTS public.reviewer_test_submissions
ADD COLUMN IF NOT EXISTS final_decision TEXT;

