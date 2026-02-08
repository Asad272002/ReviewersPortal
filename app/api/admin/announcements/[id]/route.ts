import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/service';
import { validateRequiredText, validateInput, sanitizeInput } from '../../../../utils/validation';

// Ensure Node.js runtime
export const runtime = 'nodejs';

// PUT /api/admin/announcements/:id
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const body = await req.json();
    const { title, content, category, status, duration, expiresAt } = body ?? {};

    const patch: any = {};
    const nowISO = new Date().toISOString();

    if (title !== undefined) {
      const titleReq = validateRequiredText(title, 'Title', 1, 200);
      if (!titleReq.isValid) return NextResponse.json({ error: titleReq.error }, { status: 400 });
      const titleInj = validateInput(title, 'Title');
      if (!titleInj.isValid) return NextResponse.json({ error: titleInj.error }, { status: 400 });
      patch.title = sanitizeInput(title);
    }
    if (content !== undefined) {
      const contentReq = validateRequiredText(content, 'Content', 1, 2000);
      if (!contentReq.isValid) return NextResponse.json({ error: contentReq.error }, { status: 400 });
      const contentInj = validateInput(content, 'Content');
      if (!contentInj.isValid) return NextResponse.json({ error: contentInj.error }, { status: 400 });
      patch.content = sanitizeInput(content);
    }
    if (category !== undefined) patch.category = category;
    if (status !== undefined) {
      const allowedStatuses = ['live', 'expired', 'upcoming'];
      if (allowedStatuses.includes(status)) patch.status = status;
    }
    if (duration !== undefined) patch.duration = duration !== null ? Number(duration) : null;
    if (expiresAt !== undefined) patch.expiresAt = expiresAt ?? null;

    patch.updatedAt = nowISO;

    await supabaseService.updateAnnouncement(id, patch);

    const updated = await supabaseService.getAnnouncementById(id);

    return NextResponse.json({
      message: 'Announcement updated successfully',
      announcement: updated,
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}

// DELETE /api/admin/announcements/:id
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    await supabaseService.deleteAnnouncement(id);
    supabaseService.invalidateAllCaches();

    return NextResponse.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
  }
}
