import { NextRequest, NextResponse } from 'next/server';
import { processes } from '../data';
import { syncProcessesToSheets } from '../sync-helper';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, content, category, status, order, attachments } = body;

    // Find the process to update
    const processIndex = processes.findIndex(p => p.id === id);
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
    processes[processIndex] = {
      ...processes[processIndex],
      title,
      description,
      content,
      category,
      status: status ?? 'draft',
      order: order ?? 0,
      attachments: attachments ?? [],
      updatedAt: new Date().toISOString()
    };

    // Auto-sync to Google Sheets
    try {
      await syncProcessesToSheets(processes);
    } catch (syncError) {
      console.error('Auto-sync to sheets failed:', syncError);
      // Don't fail the main operation if sync fails
    }

    return NextResponse.json({ 
      success: true, 
      process: processes[processIndex],
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

    // Find the process to delete
    const processIndex = processes.findIndex(p => p.id === id);
    if (processIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Process document not found' },
        { status: 404 }
      );
    }

    // Remove the process
    const deletedProcess = processes.splice(processIndex, 1)[0];

    // Auto-sync to Google Sheets
    try {
      await syncProcessesToSheets(processes);
    } catch (syncError) {
      console.error('Auto-sync to sheets failed:', syncError);
      // Don't fail the main operation if sync fails
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