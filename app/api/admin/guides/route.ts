import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// GET - Fetch all guides from Supabase

// GET - Fetch all guides
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('guides')
      .select('*')
      .order('order', { ascending: true });
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch guides' }, { status: 500 });
    }
    const guides = (data || []).map((row: any) => ({
      id: row.id || '',
      title: row.title || '',
      description: row.description || '',
      content: row.content || '',
      order: Number(row.order ?? 1),
      isPublished: Boolean(row.isPublished ?? true),
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
      createdAt: row.createdAt || '',
      updatedAt: row.updatedAt || '',
    }));
    return NextResponse.json({ guides });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch guides' }, { status: 500 });
  }
}

// POST - Create new guide
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, content, order, isPublished, attachments } = body;
    if (!title || !description || !content) {
      return NextResponse.json({ error: 'Title, description, and content are required' }, { status: 400 });
    }
    const id = `guide_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const processedAttachments = (attachments || []).map((attachment: any) => ({
      ...attachment,
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));
    const payload: any = {
      id,
      title,
      description,
      content,
      order: Number(order ?? 1),
      isPublished: Boolean(isPublished ?? true),
      attachments: processedAttachments,
      createdAt: now,
      updatedAt: now,
    };
    const { error } = await supabaseAdmin
      .from('guides')
      .insert([payload]);
    if (error) {
      return NextResponse.json({ error: 'Failed to create guide' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Guide created successfully', guide: payload });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create guide' }, { status: 500 });
  }
}
