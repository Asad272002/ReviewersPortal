import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numericId = isNaN(Number(id)) ? id : Number(id);
    const body = await request.json();
    const { title, description, content, category, status, order, attachments, steps = [], requirements = [] } = body;

    // Validate required fields
    if (!title || !description || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store steps and requirements in dedicated columns
    // const content = JSON.stringify({ steps, requirements }); // Deprecated

    // Check if process exists
    const { data: existingRows, error: fetchError } = await supabaseAdmin
      .from('processes')
      .select('*')
      .eq('ID', numericId)
      .limit(1);

    if (fetchError) {
      console.error('Supabase processes fetch error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch process' },
        { status: 500 }
      );
    }

    const existing = existingRows && existingRows[0];
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Process document not found' },
        { status: 404 }
      );
    }

    const allowedStatuses = ['published', 'draft', 'archived'] as const;
    const normalizedStatus = typeof status === 'string' && allowedStatuses.includes(status.toLowerCase() as any)
      ? (status.toLowerCase() as typeof allowedStatuses[number])
      : 'draft';

    const serializeAttachments = (att: any): string => {
      if (!att) return '';
      if (typeof att === 'string') return att;
      const links = Array.isArray(att.links) ? att.links : [];
      const files = Array.isArray(att.files) ? att.files : [];
      const parts: string[] = [];
      for (const l of links) {
        if (l?.title && l?.url) parts.push(`${l.title}: ${l.url}`);
      }
      for (const f of files) {
        if (f?.title && f?.url) parts.push(`${f.title}: ${f.url}`);
      }
      return parts.join(', ');
    };

    const now = new Date().toISOString();

    const payload: any = {
      Title: title,
      Description: description,
      Content: content || '', // Use content if provided, otherwise empty
      Steps: steps,
      Requirements: requirements,
      Category: category,
      Status: normalizedStatus,
      Order: order ?? 0,
      Attachments: serializeAttachments(attachments),
      UpdatedAt: now,
    };

    const { error: updateError } = await supabaseAdmin
      .from('processes')
      .update(payload)
      .eq('ID', numericId);

    if (updateError) {
      console.error('Supabase processes update error:', updateError);
      return NextResponse.json(
        { success: false, error: `Failed to update process: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      process: {
        ...existing,
        ...payload,
      },
      message: 'Process document updated successfully'
    });
  } catch (error) {
    console.error('Error updating process:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update process document' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numericId = isNaN(Number(id)) ? id : Number(id);

    // Fetch existing for return value
    const { data: existingRows, error: fetchError } = await supabaseAdmin
      .from('processes')
      .select('*')
      .eq('ID', numericId)
      .limit(1);

    if (fetchError) {
      console.error('Supabase processes fetch error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch process' },
        { status: 500 }
      );
    }

    const existing = existingRows && existingRows[0];
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Process document not found' },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from('processes')
      .delete()
      .eq('ID', numericId);

    if (deleteError) {
      console.error('Supabase processes delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete process' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      process: existing,
      message: 'Process document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting process:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete process document' },
      { status: 500 }
    );
  }
}