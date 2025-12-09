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

    // Fetch assignment from modern table; gracefully fall back to legacy table shape
    let tableType: 'modern' | 'legacy' = 'modern';
    let row: any = null;

    {
      const { data: existingModern, error: fetchErrModern } = await supabaseAdmin
        .from('team_reviewer_assignments')
        .select('*')
        .eq('id', id)
        .limit(1);
      if (!fetchErrModern && existingModern && existingModern[0]) {
        row = existingModern[0];
        tableType = 'modern';
      } else {
        // Try legacy table with spaced, quoted columns
        const { data: existingLegacy, error: fetchErrLegacy } = await supabaseAdmin
          .from('team_reviewer_assignment')
          .select('"ID", "Team ID", "Reviewer ID", "Assigned By", "Assigned At", "Status", "Approved By", "Approved At", "Revoked By", "Revoked At", "Notes", "Created At", "Updated At"')
          .eq('ID', id)
          .limit(1);
        if (fetchErrLegacy) {
          console.error('Supabase select assignment error:', fetchErrLegacy);
          return NextResponse.json({ success: false, message: 'Failed to fetch assignment' }, { status: 500 });
        }
        if (existingLegacy && existingLegacy[0]) {
          row = existingLegacy[0];
          tableType = 'legacy';
        }
      }
    }

    if (!row) {
      return NextResponse.json({ success: false, message: 'Assignment not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updatesModern: Record<string, any> = { updatedAt: now };
    const updatesLegacy: Record<string, any> = { 'Updated At': now };

    const currentStatus = tableType === 'modern'
      ? String(row.status || '').toLowerCase()
      : String(row['Status'] || '').toLowerCase();

    switch (action) {
      case 'approve':
        updatesModern.status = 'approved';
        updatesModern.approvedAt = now;
        if (adminId) updatesModern.approvedBy = adminId;
        updatesLegacy['Status'] = 'approved';
        updatesLegacy['Approved At'] = now;
        if (adminId) updatesLegacy['Approved By'] = adminId;
        break;
      case 'activate':
        if (currentStatus !== 'approved') {
          return NextResponse.json(
            { success: false, message: 'Assignment must be approved before activation' },
            { status: 400 }
          );
        }
        updatesModern.status = 'active';
        updatesLegacy['Status'] = 'active';
        break;
      case 'revoke':
        updatesModern.status = 'revoked';
        updatesModern.revokedAt = now;
        if (adminId) updatesModern.revokedBy = adminId;
        updatesLegacy['Status'] = 'revoked';
        updatesLegacy['Revoked At'] = now;
        if (adminId) updatesLegacy['Revoked By'] = adminId;
        break;
      case 'complete':
        updatesModern.status = 'completed';
        updatesModern.completedAt = now;
        updatesLegacy['Status'] = 'completed';
        break;
      case 'update_notes':
      case 'notes':
        if (typeof notes === 'string') {
          updatesModern.notes = notes;
          updatesLegacy['Notes'] = notes;
        } else {
          return NextResponse.json({ success: false, message: 'Notes must be a string' }, { status: 400 });
        }
        break;
      default:
        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    }

    let updatedRows: any[] | null = null;
    let updateErr: any = null;

    if (tableType === 'modern') {
      const resp = await supabaseAdmin
        .from('team_reviewer_assignments')
        .update(updatesModern)
        .eq('id', id)
        .select('*')
        .limit(1);
      updatedRows = resp.data;
      updateErr = resp.error;
    } else {
      const resp = await supabaseAdmin
        .from('team_reviewer_assignment')
        .update(updatesLegacy)
        .eq('ID', id)
        .select('"ID", "Status", "Updated At"')
        .limit(1);
      updatedRows = resp.data;
      updateErr = resp.error;
    }

    if (updateErr) {
      console.error('Supabase update assignment error:', updateErr);
      return NextResponse.json({ success: false, message: 'Failed to update assignment' }, { status: 500 });
    }

    const updatedRaw = (updatedRows ?? [])[0];
    const updated = tableType === 'modern'
      ? (updatedRaw ?? { id, status: updatesModern.status, updatedAt: now })
      : ({ id: updatedRaw?.['ID'] ?? id, status: updatedRaw?.['Status'] ?? updatesLegacy['Status'], updatedAt: updatedRaw?.['Updated At'] ?? now });

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