import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const jwt = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: SCOPES,
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, jwt);

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, adminId, notes } = body;

    await doc.loadInfo();
    
    let assignmentsSheet = doc.sheetsByTitle['TeamReviewerAssignments'];
    if (!assignmentsSheet) {
      return NextResponse.json(
        { success: false, message: 'Assignments sheet not found' },
        { status: 404 }
      );
    }

    const rows = await assignmentsSheet.getRows();
    const assignmentRow = rows.find(row => row.get('ID') === id);
    
    if (!assignmentRow) {
      return NextResponse.json(
        { success: false, message: 'Assignment not found' },
        { status: 404 }
      );
    }

    const currentTime = new Date().toISOString();

    switch (action) {
      case 'approve':
        assignmentRow.set('Status', 'approved');
        assignmentRow.set('ApprovedAt', currentTime);
        break;

      case 'activate':
        if (assignmentRow.get('Status') !== 'approved') {
          return NextResponse.json(
            { success: false, message: 'Assignment must be approved before activation' },
            { status: 400 }
          );
        }
        assignmentRow.set('Status', 'active');
        break;

      case 'revoke':
        assignmentRow.set('Status', 'revoked');
        break;

      case 'complete':
        assignmentRow.set('Status', 'completed');
        assignmentRow.set('CompletedAt', currentTime);
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

    await assignmentRow.save();

    return NextResponse.json({
      success: true,
      message: `Assignment ${action}d successfully`,
      data: {
        id: assignmentRow.get('ID'),
        status: assignmentRow.get('Status'),
        updatedAt: assignmentRow.get('CompletedAt') || assignmentRow.get('ApprovedAt') || assignmentRow.get('AssignedAt')
      }
    });

  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update assignment' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    await doc.loadInfo();
    
    let assignmentsSheet = doc.sheetsByTitle['TeamReviewerAssignments'];
    if (!assignmentsSheet) {
      return NextResponse.json(
        { success: false, message: 'Assignments sheet not found' },
        { status: 404 }
      );
    }

    const rows = await assignmentsSheet.getRows();
    const assignmentRow = rows.find(row => row.get('ID') === id);
    
    if (!assignmentRow) {
      return NextResponse.json(
        { success: false, message: 'Assignment not found' },
        { status: 404 }
      );
    }

    await assignmentRow.delete();

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete assignment' },
      { status: 500 }
    );
  }
}