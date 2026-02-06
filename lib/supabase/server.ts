import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn('Supabase server missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Fallback to dummy values to prevent build-time crash if env vars are missing
// This allows the build to complete, though actual API calls will fail if env vars aren't set in runtime
const finalUrl = url || 'https://placeholder.supabase.co';
const finalKey = serviceKey || 'placeholder';

export const supabaseAdmin = createClient(finalUrl, finalKey, {
  auth: { persistSession: false },
});

export default supabaseAdmin;