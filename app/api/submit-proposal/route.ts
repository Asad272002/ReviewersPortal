import { NextRequest, NextResponse } from 'next/server';

// Import the GoogleSpreadsheet class and JWT for authentication
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { getVotingDurationDaysFresh } from '../../lib/voting-settings';
import { googleSheetsService } from '@/lib/google-sheets-service';
import { validateInput, validateRequiredText, validateNumber, sanitizeInput } from '../../utils/validation';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields presence first
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

    // Stricter server-side validation
    const errors: string[] = [];

    const nameValidation = validateRequiredText(data.reviewerName, 'Reviewer Name', 1, 100);
    if (!nameValidation.isValid) errors.push(nameValidation.error!);

    const titleValidation = validateRequiredText(data.proposalTitle, 'Proposal Title', 1, 200);
    if (!titleValidation.isValid) errors.push(titleValidation.error!);

    const allowedCategories = new Set(['development','research','infrastructure','community','other']);
    if (!allowedCategories.has(data.projectCategory)) {
      errors.push('Please select a valid project category');
    }

    const allowedTeamSizes = new Set(['1','2-5','6-10','11+']);
    if (!allowedTeamSizes.has(data.teamSize)) {
      errors.push('Please select a valid team size');
    }

    const budgetValidation = validateNumber(data.budgetEstimate, 'Budget Estimate', 0);
    if (!budgetValidation.isValid) errors.push(budgetValidation.error!);

    const timelineValidation = validateNumber(data.timelineWeeks, 'Timeline (weeks)', 1, 104);
    if (!timelineValidation.isValid) errors.push(timelineValidation.error!);

    const summaryValidation = validateRequiredText(data.proposalSummary, 'Proposal Summary', 1, 2000);
    if (!summaryValidation.isValid) errors.push(summaryValidation.error!);
    const summaryInjectionCheck = validateInput(data.proposalSummary, 'Proposal Summary');
    if (!summaryInjectionCheck.isValid) errors.push(summaryInjectionCheck.error!);

    const approachValidation = validateRequiredText(data.technicalApproach, 'Technical Approach', 1, 2000);
    if (!approachValidation.isValid) errors.push(approachValidation.error!);
    const approachInjectionCheck = validateInput(data.technicalApproach, 'Technical Approach');
    if (!approachInjectionCheck.isValid) errors.push(approachInjectionCheck.error!);

    if (data.additionalNotes) {
      const notesCheck = validateInput(data.additionalNotes, 'Additional Notes');
      if (!notesCheck.isValid) errors.push(notesCheck.error!);
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: errors[0] },
        { status: 400 }
      );
    }

    // Build sanitized payload
    const payload = {
      reviewerName: sanitizeInput(String(data.reviewerName)).trim(),
      proposalTitle: sanitizeInput(String(data.proposalTitle)).trim(),
      projectCategory: String(data.projectCategory),
      teamSize: String(data.teamSize),
      budgetEstimate: String(data.budgetEstimate).trim(),
      timelineWeeks: String(data.timelineWeeks).trim(),
      proposalSummary: sanitizeInput(String(data.proposalSummary)).trim(),
      technicalApproach: sanitizeInput(String(data.technicalApproach)).trim(),
      additionalNotes: sanitizeInput(String(data.additionalNotes || '')).trim(),
    };
    
    // Log the data that would be sent to Google Sheets
    console.log('Proposal data to be submitted to Google Sheets:', payload);
    
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
        // Ensure we write to the RD (Requirement Documents) sheet
        let sheet = doc.sheetsByTitle['RD'];
        if (!sheet) {
          // Create RD sheet if it does not exist with proper headers
          sheet = await doc.addSheet({
            title: 'RD',
            headerValues: [
              'Reviewer Name',
              'Proposal Title',
              'Project Category',
              'Team Size',
              'Budget Estimate',
              'Timeline (Weeks)',
              'Proposal Summary',
              'Technical Approach',
              'Additional Notes',
              'Submission Date',
              'Voting Deadline'
            ]
          });
        }
        
        // Get current voting duration setting at the time of submission (fresh, no cache)
        const votingDurationDays = await getVotingDurationDaysFresh();
        const submissionDate = new Date();
        const votingDeadline = new Date(submissionDate.getTime() + (votingDurationDays * 24 * 60 * 60 * 1000));
        
        // Add row to Google Sheet with properly mapped column names
        await sheet.addRow({
          'Reviewer Name': payload.reviewerName,
          'Proposal Title': payload.proposalTitle,
          'Project Category': payload.projectCategory,
          'Team Size': payload.teamSize,
          'Budget Estimate': payload.budgetEstimate,
          'Timeline (Weeks)': payload.timelineWeeks,
          'Proposal Summary': payload.proposalSummary,
          'Technical Approach': payload.technicalApproach,
          'Additional Notes': payload.additionalNotes,
          'Submission Date': submissionDate.toISOString(),
          'Voting Deadline': votingDeadline.toISOString(),
        });
        // Invalidate proposals cache so subsequent reads reflect the new submission immediately
        googleSheetsService.invalidateAllCaches();
        
        console.log('Proposal data successfully added to Google Sheet');
      }
    } catch (error) {
      console.error('Error adding data to Google Sheet:', error);
      // Continue with the response even if Google Sheets integration fails
      // This way, the user still gets a response even if the Google Sheets part fails
    }
    
    // Success response
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