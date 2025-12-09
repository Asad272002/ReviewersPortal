// app/api/admin/announcements/route.ts
import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/service';
import { validateRequiredText, validateInput, sanitizeInput } from '../../../utils/validation';

export const runtime = 'nodejs';

// GET /api/admin/announcements (list general announcements)
export async function GET(_req: Request) {
  try {
    const data = await supabaseService.getGeneralAnnouncements();
    return NextResponse.json({ announcements: data });
  } catch (e) {
    console.error('GET /announcements error:', e);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

// POST /api/admin/announcements (create)
export async function POST(req: Request) {
  try {
    const { id, title, content, category, duration, expiresAt, status } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // Validate against formula injection and invalid inputs
    const titleReq = validateRequiredText(title, 'Title', 1, 200);
    if (!titleReq.isValid) return NextResponse.json({ error: titleReq.error }, { status: 400 });
    const contentReq = validateRequiredText(content, 'Content', 1, 2000);
    if (!contentReq.isValid) return NextResponse.json({ error: contentReq.error }, { status: 400 });
    const titleInj = validateInput(title, 'Title');
    if (!titleInj.isValid) return NextResponse.json({ error: titleInj.error }, { status: 400 });
    const contentInj = validateInput(content, 'Content');
    if (!contentInj.isValid) return NextResponse.json({ error: contentInj.error }, { status: 400 });

    const safeTitle = sanitizeInput(title);
    const safeContent = sanitizeInput(content);

    const announcementId = id || `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const nowISO = new Date().toISOString();
    const allowedStatuses = ['live', 'expired', 'upcoming'] as const;
    const finalStatus = allowedStatuses.includes(status) ? status : 'live';

    const expiresAtValue = expiresAt
      ? String(expiresAt)
      : duration
        ? new Date(Date.now() + Number(duration) * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

    await supabaseService.createAnnouncement({
      id: announcementId,
      title: safeTitle,
      content: safeContent,
      category,
      status: finalStatus,
      duration: duration !== undefined ? Number(duration) : undefined,
      expiresAt: expiresAtValue,
      createdAt: nowISO,
      updatedAt: nowISO,
    });

    supabaseService.invalidateAllCaches();

    return NextResponse.json({ message: 'Announcement created' }, { status: 201 });
  } catch (e) {
    console.error('POST /announcements error:', e);
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
}
