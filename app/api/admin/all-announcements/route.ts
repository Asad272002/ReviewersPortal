import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/service';

// GET /api/admin/all-announcements (list all announcements for management)
export async function GET(_req: Request) {
  try {
    const data = await supabaseService.getAllAnnouncements();

    // Helper to parse various date formats
    const parseDate = (dateString?: string): Date | null => {
      if (!dateString) return null;
      try {
        if (dateString.includes(' at ') && dateString.includes(' UTC')) {
          const cleaned = dateString.replace(' UTC', '').replace(' at ', ' ');
          const d = new Date(cleaned);
          if (!isNaN(d.getTime())) return d;
        }
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    };

    // Auto-update statuses to 'expired' when past expiresAt
    const now = new Date();
    const toExpire = data.filter(a => {
      const exp = parseDate(a.expiresAt);
      return exp !== null && exp.getTime() <= now.getTime() && a.status !== 'expired';
    });

    for (const a of toExpire) {
      try {
        await supabaseService.updateAnnouncement(a.id, { status: 'expired' });
      } catch (e) {
        console.warn('Failed to auto-expire announcement', a.id, e);
      }
    }

    // Refetch to return normalized statuses
    const refreshed = toExpire.length > 0 ? await supabaseService.getAllAnnouncements() : data;
    return NextResponse.json({ announcements: refreshed });
  } catch (e) {
    console.error('GET /all-announcements error:', e);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}