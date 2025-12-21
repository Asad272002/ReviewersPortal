-- 1. Clear existing data (remove fake/old data)
TRUNCATE TABLE processes;

-- 2. Add new columns for structured data
-- We use quoted identifiers "Steps" and "Requirements" to match the PascalCase convention used in the existing table
ALTER TABLE processes 
ADD COLUMN IF NOT EXISTS "Steps" JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "Requirements" JSONB DEFAULT '[]'::jsonb;

-- Note: The "Content" column will now strictly store the main content text (if any), 
-- while "Steps" and "Requirements" will store the structured arrays.
