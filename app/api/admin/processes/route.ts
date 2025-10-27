import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Try Supabase first
    const { data, error } = await supabaseAdmin
      .from('processes')
      .select('*');

    if (!error && Array.isArray(data) && data.length > 0) {
      const parseAttachments = (attachmentsStr: string | null | undefined) => {
        const attachments = { links: [] as { title: string; url: string }[], files: [] as { title: string; url: string; type: 'pdf' | 'doc' | 'excel' | 'powerpoint' }[] };
        const raw = String(attachmentsStr || '').trim();
        if (!raw) return attachments;
        try {
          const parts = raw.split(', ');
          parts.forEach((part) => {
            const trimmed = part.trim();
            const idx = trimmed.indexOf(': ');
            if (idx > 0) {
              const title = trimmed.substring(0, idx).trim();
              const url = trimmed.substring(idx + 2).trim();
              if (!title || !url) return;
              const lower = url.toLowerCase();
              if (lower.includes('.pdf') || lower.includes('.doc') || lower.includes('.docx') || lower.includes('.xls') || lower.includes('.xlsx') || lower.includes('.ppt') || lower.includes('.pptx')) {
                let fileType: 'pdf' | 'doc' | 'excel' | 'powerpoint' = 'pdf';
                if (lower.includes('.doc')) fileType = 'doc';
                else if (lower.includes('.xls')) fileType = 'excel';
                else if (lower.includes('.ppt')) fileType = 'powerpoint';
                attachments.files.push({ title, url, type: fileType });
              } else {
                attachments.links.push({ title, url });
              }
            }
          });
        } catch {}
        return attachments;
      };

      const processesData = (data as any[]).map((row) => ({
        id: row.ID || row.id || '',
        title: row.Title || row.title || '',
        description: row.Description || row.description || '',
        content: row.Content || row.content || '',
        category: (row.Category || row.category || 'workflow').toString(),
        order: Number(row.Order ?? row.order ?? 0),
        status: (row.Status || row.status || 'draft').toString().toLowerCase(),
        attachments: parseAttachments(row.Attachments ?? row.attachments),
        createdAt: row.CreatedAt || row.createdAt || new Date().toISOString(),
        updatedAt: row.UpdatedAt || row.updatedAt || new Date().toISOString(),
      })).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return NextResponse.json({ success: true, processes: processesData });
    }

    // If Supabase is empty, return empty array (no Sheets fallback)
    return NextResponse.json({ success: true, processes: [] });
  } catch (error) {
    console.error('Error fetching processes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch processes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, content, category, status = 'draft', attachments = { links: [], files: [] } } = body;

    // Validate required fields
    if (!title || !description || !content || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
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

    const id = Date.now().toString();
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('processes')
      .insert([{ 
        ID: id, 
        Title: title, 
        Description: description, 
        Content: content, 
        Category: category, 
        Order: 0, 
        Status: normalizedStatus, 
        Attachments: serializeAttachments(attachments), 
        CreatedAt: now, 
        UpdatedAt: now, 
      }]);

    if (error) {
      console.error('Supabase processes POST error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save process' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      process: {
        id,
        title,
        description,
        content,
        category,
        order: 0,
        status: normalizedStatus,
        attachments,
        createdAt: now,
        updatedAt: now,
      },
      message: 'Process document created successfully'
    });
  } catch (error) {
    console.error('Error creating process:', error);
    return NextResponse.json({ error: 'Failed to create process' }, { status: 500 });
  }
}