import { NextRequest, NextResponse } from 'next/server';

// Import the GoogleSpreadsheet class and JWT for authentication
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'reviewerName',
      'proposalTitle',
      'projectCategory',
      'teamSize',
      'budgetEstimate',
      'timelineWeeks',
      'proposalSummary',
      'technicalApproach'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { success: false, message: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Log the data that would be sent to Google Sheets
    console.log('Proposal data to be submitted to Google Sheets:', data);
    
    // Google Sheets Integration
    try {
      // Check if environment variables are set
      if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        console.warn('Google Sheets environment variables not set. Skipping Google Sheets integration.');
      } else {
        // Initialize authentication with JWT
        const serviceAccountAuth = new JWT({
          email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        
        // Initialize the Google Sheet with authentication
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        
        // Add row to Google Sheet with properly mapped column names
        await sheet.addRow({
          'Reviewer Name': data.reviewerName,
          'Proposal Title': data.proposalTitle,
          'Project Category': data.projectCategory,
          'Team Size': data.teamSize,
          'Budget Estimate': data.budgetEstimate,
          'Timeline (Weeks)': data.timelineWeeks,
          'Proposal Summary': data.proposalSummary,
          'Technical Approach': data.technicalApproach,
          'Additional Notes': data.additionalNotes || '',
          'Submission Date': new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
            timeZoneName: 'short'
          }),
          'Proposal ID': `PROP-${Date.now()}`
        });
        
        console.log('Proposal data successfully added to Google Sheet');
      }
    } catch (error) {
      console.error('Error adding data to Google Sheet:', error);
      // Continue with the response even if Google Sheets integration fails
      // This way, the user still gets a response even if the Google Sheets part fails
    }
    
    // For now, we'll just simulate a successful submission
    // Once Google Sheets integration is set up, this will be replaced by the actual submission
    return NextResponse.json({
      success: true,
      message: 'Proposal submitted successfully',
      data: {
        id: `PROP-${Date.now()}`,
        submittedAt: new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  }),
      }
    });
    
  } catch (error) {
    console.error('Error submitting proposal:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}