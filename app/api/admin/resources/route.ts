import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/service';
import { validateRequiredText, validateUrl, sanitizeInput } from '../../../utils/validation';

export const runtime = 'nodejs';

// GET - Fetch all resources
export async function GET() {
  try {
    const resources = await supabaseService.getResources();
    return NextResponse.json({ resources });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}

// POST - Create new resource
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { title, description, category, url, fileUrl, fileName } = body ?? {};

    // Validate required fields
    const titleV = validateRequiredText(title, 'Title', 3, 200);
    if (!titleV.isValid) return NextResponse.json({ error: titleV.error }, { status: 400 });

    const descriptionV = validateRequiredText(description, 'Description', 3, 2000);
    if (!descriptionV.isValid) return NextResponse.json({ error: descriptionV.error }, { status: 400 });

    const allowedCategories = ['review-tools', 'reference-materials', 'training-materials'];
    if (!allowedCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    if (url) {
      const urlV = validateUrl(url);
      if (!urlV.isValid) return NextResponse.json({ error: urlV.error }, { status: 400 });
    }

    // Sanitize
    title = sanitizeInput(String(title).trim());
    description = sanitizeInput(String(description).trim());
    category = sanitizeInput(String(category).trim());
    url = url ? sanitizeInput(String(url).trim()) : undefined;
    fileUrl = fileUrl ? sanitizeInput(String(fileUrl).trim()) : undefined;
    fileName = fileName ? sanitizeInput(String(fileName).trim()) : undefined;

    const id = `res_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const nowISO = new Date().toISOString();

    await supabaseService.createResource({
      id,
      title,
      description,
      category,
      url,
      fileUrl,
      fileName,
      createdAt: nowISO,
      updatedAt: nowISO,
    });

    supabaseService.invalidateAllCaches();

    return NextResponse.json({ message: 'Resource created successfully', id }, { status: 201 });
  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    );
  }
}