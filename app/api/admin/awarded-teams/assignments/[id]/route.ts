import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, adminId, notes } = body as { action: string; adminId?: string; notes?: string };

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing id param' }, { status: 400 });
    }
    if (!action) {
      return NextResponse.json({ success: false, message: 'Missing action in body' }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('team_reviewer_assignments')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (fetchErr) {
      console.error('Supabase select assignment error:', fetchErr);
      return NextResponse.json({ success: false, message: 'Failed to fetch assignment' }, { status: 500 });
    }

    const row = (existing ?? [])[0];
    if (!row) {
      return NextResponse.json({ success: false, message: 'Assignment not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = { updatedAt: now };

    switch (action) {
      case 'approve':
        updates.status = 'approved';
        updates.approvedAt = now;
        if (adminId) updates.approvedBy = adminId;
        break;
      case 'activate':
        if (row.status !== 'approved') {
          return NextResponse.json(
            { success: false, message: 'Assignment must be approved before activation' },
            { status: 400 }
          );
        }
        updates.status = 'active';
        break;
      case 'revoke':
        updates.status = 'revoked';
        updates.revokedAt = now;
        if (adminId) updates.revokedBy = adminId;
        break;
      case 'complete':
        updates.status = 'completed';
        updates.completedAt = now;
        break;
      case 'update_notes':
      case 'notes':
        if (typeof notes === 'string') {
          updates.notes = notes;
        } else {
          return NextResponse.json({ success: false, message: 'Notes must be a string' }, { status: 400 });
        }
        break;
      default:
        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    }

    const { data: updatedRows, error: updateErr } = await supabaseAdmin
      .from('team_reviewer_assignments')
      .update(updates)
      .eq('id', id)
      .select('*')
      .limit(1);

    if (updateErr) {
      console.error('Supabase update assignment error:', updateErr);
      return NextResponse.json({ success: false, message: 'Failed to update assignment' }, { status: 500 });
    }

    const updated = (updatedRows ?? [])[0] ?? { id, status: updates.status, updatedAt: now };

    return NextResponse.json({
      success: true,
      message: `Assignment ${action}d successfully`,
      data: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt ?? now,
      },
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update assignment' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) return NextResponse.json({ success: false, message: 'Missing id param' }, { status: 400 });

    const { error: deleteErr } = await supabaseAdmin
      .from('team_reviewer_assignments')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      console.error('Supabase delete assignment error:', deleteErr);
      return NextResponse.json({ success: false, message: 'Failed to delete assignment' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete assignment' },
      { status: 500 }
    );
  }
}