import { NextRequest, NextResponse } from 'next/server';
import { syncProcessesToSheets, loadProcessesFromSheets } from './sync-helper';

export async function GET() {
  try {
    // Load processes from Google Sheets
    const processesData = await loadProcessesFromSheets();
    
    return NextResponse.json({ 
      success: true, 
      processes: processesData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
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

    // Normalize and validate status
    const allowedStatuses = ['published', 'draft', 'archived'] as const;
    const normalizedStatus = typeof status === 'string' && allowedStatuses.includes(status.toLowerCase() as any)
      ? (status.toLowerCase() as typeof allowedStatuses[number])
      : 'draft';

    // Load current processes from Google Sheets
    const currentProcesses = await loadProcessesFromSheets();

    // Create new process
     const newProcess = {
       id: Date.now().toString(),
       title,
       description,
       content,
       category,
       order: currentProcesses.length + 1,
       status: normalizedStatus,
       attachments: attachments || { links: [], files: [] },
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

    // Add to current processes
    currentProcesses.push(newProcess);

    // Sync updated processes to Google Sheets
    try {
      await syncProcessesToSheets(currentProcesses);
    } catch (syncError) {
      console.error('Auto-sync to sheets failed:', syncError);
      return NextResponse.json(
        { success: false, error: 'Failed to save to Google Sheets' },
        { status: 500 }
      );
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