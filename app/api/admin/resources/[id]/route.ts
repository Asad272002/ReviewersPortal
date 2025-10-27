// app/api/admin/resources/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/service';
import { validateRequiredText, validateUrl, sanitizeInput } from '../../../../utils/validation';

export const runtime = 'nodejs';

// PUT - Update resource
export async function PUT(req: Request, context: any) {
  try {
    const params = await context?.params;
    const { id } = (params ?? {}) as { id?: string };
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    const body = await req.json();
    let { title, description, category, url, fileUrl, fileName } = body ?? {};

    // Validate fields if provided
    if (title !== undefined) {
      const v = validateRequiredText(title, 'Title', 3, 200);
      if (!v.isValid) return NextResponse.json({ error: v.error }, { status: 400 });
    }
    if (description !== undefined) {
      const v = validateRequiredText(description, 'Description', 3, 2000);
      if (!v.isValid) return NextResponse.json({ error: v.error }, { status: 400 });
    }
    if (category !== undefined) {
      const allowedCategories = ['review-tools', 'reference-materials', 'training-materials'];
      if (!allowedCategories.includes(category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
    }
    if (url !== undefined) {
      const v = validateUrl(url);
      if (!v.isValid) return NextResponse.json({ error: v.error }, { status: 400 });
    }

    // Sanitize
    title = title !== undefined ? sanitizeInput(String(title).trim()) : undefined;
    description = description !== undefined ? sanitizeInput(String(description).trim()) : undefined;
    category = category !== undefined ? sanitizeInput(String(category).trim()) : undefined;
    url = url !== undefined ? sanitizeInput(String(url).trim()) : undefined;
    fileUrl = fileUrl !== undefined ? sanitizeInput(String(fileUrl).trim()) : undefined;
    fileName = fileName !== undefined ? sanitizeInput(String(fileName).trim()) : undefined;

    const nowISO = new Date().toISOString();

    await supabaseService.updateResource(id, {
      title,
      description,
      category,
      url: url ?? null,
      fileUrl: fileUrl ?? null,
      fileName: fileName ?? null,
      updatedAt: nowISO,
    });

    supabaseService.invalidateAllCaches();

    return NextResponse.json({ message: 'Resource updated successfully' });
  } catch (error) {
    console.error('Error updating resource:', error);
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
  }
}

// DELETE - Delete resource
export async function DELETE(_req: Request, context: any) {
  try {
    const params = await context?.params;
    const { id } = (params ?? {}) as { id?: string };
    if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

    await supabaseService.deleteResource(id);
    supabaseService.invalidateAllCaches();

    return NextResponse.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
  }
}
