import { NextRequest, NextResponse } from 'next/server';
import { syncProcessesToSheets, loadProcessesFromSheets } from '../sync-helper';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, content, category, status, order, attachments } = body;

    // Load current processes from Google Sheets
    const currentProcesses = await loadProcessesFromSheets();

    // Find the process to update
    const processIndex = currentProcesses.findIndex(p => p.id === id);
    if (processIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Process document not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!title || !description || !content || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update the process
    currentProcesses[processIndex] = {
      ...currentProcesses[processIndex],
      title,
      description,
      content,
      category,
      status: status ?? 'draft',
      order: order ?? 0,
      attachments: attachments ?? { links: [], files: [] },
      updatedAt: new Date().toISOString()
    };

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
      process: currentProcesses[processIndex],
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Load current processes from Google Sheets
    const currentProcesses = await loadProcessesFromSheets();

    // Find the process to delete
    const processIndex = currentProcesses.findIndex(p => p.id === id);
    if (processIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Process document not found' },
        { status: 404 }
      );
    }

    // Remove the process
    const deletedProcess = currentProcesses.splice(processIndex, 1)[0];

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
      process: deletedProcess,
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