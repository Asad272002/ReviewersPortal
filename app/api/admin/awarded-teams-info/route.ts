import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// GET /api/admin/awarded-teams-info
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('awarded_teams_info')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching awarded teams info:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Unexpected error fetching awarded teams info:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/admin/awarded-teams-info
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { project_code, project_title, proposal_link, round_name, awarded_amount, total_milestones, has_service } = body;

    // Validation
    if (!project_code || !project_title) {
      return NextResponse.json({ success: false, message: 'Project code and title are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('awarded_teams_info')
      .insert([{
        project_code,
        project_title,
        proposal_link,
        round_name,
        awarded_amount: awarded_amount ? Number(awarded_amount) : null,
        total_milestones: total_milestones ? Number(total_milestones) : null,
        has_service: has_service || false
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating awarded team info:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Unexpected error creating awarded team info:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/admin/awarded-teams-info
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('awarded_teams_info')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating awarded team info:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Unexpected error updating awarded team info:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/admin/awarded-teams-info
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('awarded_teams_info')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting awarded team info:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Unexpected error deleting awarded team info:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
