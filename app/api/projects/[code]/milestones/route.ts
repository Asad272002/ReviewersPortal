import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ code: string }> }
) {
  try {
    const params = await props.params;
    const projectCode = params.code;

    if (!projectCode) {
      return NextResponse.json({ success: false, error: 'Project code is required' }, { status: 400 });
    }

    // Fetch milestones for the project
    const { data: milestones, error } = await supabaseAdmin
      .from('project_milestones')
      .select('*')
      .eq('project_code', projectCode)
      .order('milestone_number', { ascending: true });

    if (error) {
      console.error('Error fetching milestones:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: milestones });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
