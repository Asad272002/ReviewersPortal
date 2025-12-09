import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
export const runtime = 'nodejs';

// DELETE - Remove attachment from guide
export async function DELETE(_req: Request, context: any) {
  try {
    const params = await context?.params;
    const { id, attachmentId } =
      (params ?? {}) as { id?: string; attachmentId?: string };

    if (!id || !attachmentId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from('guides')
      .select('attachments')
      .eq('id', id)
      .limit(1);
    if (error) return NextResponse.json({ error: 'Failed to fetch guide' }, { status: 500 });
    const guide = data && data[0];
    if (!guide) return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    const list = Array.isArray(guide.attachments) ? guide.attachments : [];
    const updated = list.filter((att: any) => String(att?.id || '') !== String(attachmentId));
    if (updated.length === list.length) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    const { error: updErr } = await supabaseAdmin
      .from('guides')
      .update({ attachments: updated, updatedAt: new Date().toISOString() })
      .eq('id', id);
    if (updErr) return NextResponse.json({ error: 'Failed to update guide' }, { status: 500 });
    return NextResponse.json({ message: 'Attachment removed successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove attachment' }, { status: 500 });
  }
}
