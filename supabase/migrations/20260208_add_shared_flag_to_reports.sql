-- Add is_shared_with_partner column to milestone_review_reports
ALTER TABLE IF EXISTS public.milestone_review_reports
ADD COLUMN IF NOT EXISTS is_shared_with_partner BOOLEAN DEFAULT FALSE;

-- Update RLS policies to ensure partners can only see shared reports
-- (Assuming partners use a specific role or just public access filtered by client - better to enforce at RLS if possible, but currently "Allow public read access" might be too broad if it exists. 
-- The previous migration `2025-12-03-milestone-review-reports.sql` has `mrr_select_authenticated`.
-- Partners are authenticated users. We might want to restrict them, but for now, filtering in API/Client is the first step, and RLS is better security.)

-- Let's create a policy for partners if they are distinct. 
-- Currently partners are in `partners` table and use `partner` role? 
-- The auth implementation details are in `auth.ts` or `AuthContext`. 
-- If they use Supabase Auth, they have a UUID.
-- If they use custom auth (likely, given `partners` table with password), they might just be "authenticated" or "anon" with a custom token. 
-- Based on `api/auth/route.ts`, it seems custom JWT.

-- For now, just adding the column.
