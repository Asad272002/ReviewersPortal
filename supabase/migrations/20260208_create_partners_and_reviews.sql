-- Create partners table
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, -- In production, this should be hashed
    name TEXT NOT NULL,
    organization TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for partners" ON public.partners FOR SELECT USING (true);

-- Create partner_reviews table to store feedback on milestone reports
CREATE TABLE IF NOT EXISTS public.partner_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID REFERENCES public.milestone_review_reports(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    verdict TEXT CHECK (verdict IN ('Approve', 'Reject')),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(report_id, partner_id)
);

-- Enable RLS for partner_reviews
ALTER TABLE public.partner_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow partners to insert reviews" ON public.partner_reviews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow partners to read reviews" ON public.partner_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow partners to update their own reviews" ON public.partner_reviews FOR UPDATE TO authenticated USING (partner_id = auth.uid()::uuid);

-- Trigger for updated_at
CREATE TRIGGER set_partners_updated_at
BEFORE UPDATE ON public.partners
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_partner_reviews_updated_at
BEFORE UPDATE ON public.partner_reviews
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
