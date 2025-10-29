-- Reviewer Tests schema for Supabase
-- Creates core tables for tests, questions, submissions, and answers

-- Enable required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Question type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'test_question_type'
  ) THEN
    CREATE TYPE test_question_type AS ENUM ('mcq', 'text');
  END IF;
END$$;

-- Tests table
CREATE TABLE IF NOT EXISTS public.reviewer_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  guidelines TEXT,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_by TEXT,
  created_by_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS public.reviewer_test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.reviewer_tests(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 1,
  type test_question_type NOT NULL,
  prompt TEXT NOT NULL,
  options JSONB,            -- for MCQ: array of option objects [{id,label}]
  correct_answers JSONB,    -- for MCQ: array of correct option ids
  marks INTEGER NOT NULL DEFAULT 1 CHECK (marks >= 0),
  required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Submissions table
CREATE TABLE IF NOT EXISTS public.reviewer_test_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.reviewer_tests(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','graded')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_taken_seconds INTEGER,
  total_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Answers table
CREATE TABLE IF NOT EXISTS public.reviewer_test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.reviewer_test_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.reviewer_test_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  selected_options JSONB,   -- for MCQ: array of selected option ids
  score NUMERIC,
  graded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_reviewer_tests_status ON public.reviewer_tests(status);
CREATE INDEX IF NOT EXISTS idx_questions_test ON public.reviewer_test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_submissions_test ON public.reviewer_test_submissions(test_id);
CREATE INDEX IF NOT EXISTS idx_answers_submission ON public.reviewer_test_answers(submission_id);

-- Update triggers (optional simple updated_at maintenance)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_touch_reviewer_tests'
  ) THEN
    CREATE TRIGGER trg_touch_reviewer_tests
    BEFORE UPDATE ON public.reviewer_tests
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_touch_reviewer_test_questions'
  ) THEN
    CREATE TRIGGER trg_touch_reviewer_test_questions
    BEFORE UPDATE ON public.reviewer_test_questions
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_touch_reviewer_test_submissions'
  ) THEN
    CREATE TRIGGER trg_touch_reviewer_test_submissions
    BEFORE UPDATE ON public.reviewer_test_submissions
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_touch_reviewer_test_answers'
  ) THEN
    CREATE TRIGGER trg_touch_reviewer_test_answers
    BEFORE UPDATE ON public.reviewer_test_answers
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END$$;

-- RLS policies can be added as needed; by default, use admin service key in APIs