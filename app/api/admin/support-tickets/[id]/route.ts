import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// PUT - Update support ticket
export async function PUT(req: Request, context: any) {
  try {
    const { id } = (context?.params ?? {}) as { id?: string };
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const body = await req.json();
    const { status, priority, assignedTo, notes } = body ?? {};

    // Fetch existing ticket
    const { data: rows, error: fetchError } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (fetchError) {
      console.error('Supabase support_tickets fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch support ticket' }, { status: 500 });
    }

    const existing = rows && rows[0];
    if (!existing) {
      return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    const payload: any = { updatedAt: now };
    if (status !== undefined) payload.status = status;
    if (priority !== undefined) payload.priority = priority;
    if (assignedTo !== undefined) payload.assignedTo = assignedTo || '';
    if (notes !== undefined) payload.notes = notes || '';

    const { error: updateError } = await supabaseAdmin
      .from('support_tickets')
      .update(payload)
      .eq('id', id);

    if (updateError) {
      console.error('Supabase support_tickets update error:', updateError);
      return NextResponse.json({ error: 'Failed to update support ticket' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Support ticket updated successfully',
      ticket: {
        ...existing,
        ...payload,
      },
    });
  } catch (error) {
    console.error('Error updating support ticket:', error);
    return NextResponse.json({ error: 'Failed to update support ticket' }, { status: 500 });
  }
}

// DELETE - Delete support ticket
export async function DELETE(_req: Request, context: any) {
  try {
    const { id } = (context?.params ?? {}) as { id?: string };
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    // Fetch existing ticket
    const { data: rows, error: fetchError } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (fetchError) {
      console.error('Supabase support_tickets fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch support ticket' }, { status: 500 });
    }

    const existing = rows && rows[0];
    if (!existing) {
      return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('support_tickets')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Supabase support_tickets delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete support ticket' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Support ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting support ticket:', error);
    return NextResponse.json({ error: 'Failed to delete support ticket' }, { status: 500 });
  }
}
