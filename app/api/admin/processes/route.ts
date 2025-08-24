import { NextRequest, NextResponse } from 'next/server';
import { processes } from './data';
import { syncProcessesToSheets } from './sync-helper';

export async function GET() {
  try {
    return NextResponse.json({ 
      success: true, 
      processes: processes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    });
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
    const { title, description, content, category, status = 'draft', attachments = [] } = body;

    // Validate required fields
    if (!title || !description || !content || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new process
     const newProcess = {
       id: Date.now().toString(),
       title,
       description,
       content,
       category,
       order: processes.length + 1,
       status,
       attachments,
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

    processes.push(newProcess);

    // Auto-sync to Google Sheets
    try {
      await syncProcessesToSheets(processes);
    } catch (syncError) {
      console.error('Auto-sync to sheets failed:', syncError);
      // Don't fail the main operation if sync fails
    }

    return NextResponse.json({ 
      success: true, 
      process: newProcess,
      message: 'Process document created successfully'
    });
  } catch (error) {
    console.error('Error creating process:', error);
    return NextResponse.json({ error: 'Failed to create process' }, { status: 500 });
  }
}