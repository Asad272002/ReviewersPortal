import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/service';

export async function GET() {
  try {
    const importantUpdates = await supabaseService.getImportantAnnouncements();
    return NextResponse.json(importantUpdates);
  } catch (error) {
    console.error('Error fetching important updates:', error);
    return NextResponse.json({ error: 'Failed to fetch important updates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, duration, expiresAt } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
    }

    const id = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const nowISO = new Date().toISOString();

    const expiresAtValue = expiresAt
      ? String(expiresAt)
      : duration
        ? new Date(Date.now() + Number(duration) * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

    await supabaseService.createAnnouncement({
      id,
      title,
      content,
      category: 'important',
      status: 'live',
      duration: duration !== undefined ? Number(duration) : undefined,
      expiresAt: expiresAtValue,
      createdAt: nowISO,
      updatedAt: nowISO,
    });

    supabaseService.invalidateAllCaches();

    return NextResponse.json({ message: 'Important update created successfully', id });
  } catch (error) {
    console.error('Error creating important update:', error);
    return NextResponse.json({ error: 'Failed to create important update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await supabaseService.deleteAnnouncement(id);
    supabaseService.invalidateAllCaches();

    return NextResponse.json({ message: 'Important update deleted successfully' });
  } catch (error) {
    console.error('Error deleting important update:', error);
    return NextResponse.json({ error: 'Failed to delete important update' }, { status: 500 });
  }
}