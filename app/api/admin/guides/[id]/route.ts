import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
export const runtime = 'nodejs';

// PUT - Update guide
export async function PUT(req: Request, context: any) {
  try {
    const params = await context?.params;
    const { id } = (params ?? {}) as { id?: string };
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const body = await req.json();
    const { title, description, content, order, isPublished, attachments } = body ?? {};
    const patch: any = {};
    if (title !== undefined) patch.title = title;
    if (description !== undefined) patch.description = description;
    if (content !== undefined) patch.content = content;
    if (order !== undefined) patch.order = Number(order);
    if (isPublished !== undefined) patch.isPublished = Boolean(isPublished);
    if (attachments !== undefined) {
      const list = Array.isArray(attachments) ? attachments : [];
      const processed = list.map((att: any) => ({
        ...att,
        id: att?.id || `att_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
      }));
      patch.attachments = processed;
    }
    patch.updatedAt = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('guides')
      .update(patch)
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'Failed to update guide' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Guide updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update guide' }, { status: 500 });
  }
}

// DELETE - Delete guide
export async function DELETE(_req: Request, context: any) {
  try {
    const params = await context?.params;
    const { id } = (params ?? {}) as { id?: string };
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('guides')
      .delete()
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'Failed to delete guide' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Guide deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete guide' }, { status: 500 });
  }
}
