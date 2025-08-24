import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

interface ProposalRow {
  'Reviewer Name': string;
  'Proposal Title': string;
  'Project Category': string;
  'Team Size': string;
  'Budget Estimate': string;
  'Timeline (Weeks)': string;
  'Proposal Summary': string;
  'Technical Approach': string;
  'Additional Notes': string;
}

interface VoteRow {
  'Proposal ID': string;
  'User ID': string;
  'Username': string;
  'Vote Type': string;
  'Vote Date': string;
}

interface VotingResultRow {
  'Proposal ID': string;
  'Proposal Title': string;
  'Total Upvotes': string;
  'Total Downvotes': string;
  'Net Score': string;
  'Voter Count': string;
  'Voting Deadline': string;
  'Status': string;
  'Last Updated': string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || request.headers.get('x-user-id');

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();

    // Get proposals from the RD (Requirement Documents) sheet
    const proposalsSheet = doc.sheetsByTitle['RD'];
    if (!proposalsSheet) {
      return NextResponse.json({ success: false, message: 'RD (Requirement Documents) sheet not found' });
    }

    // Get voting results
    const votingResultsSheet = doc.sheetsByTitle['Voting Results'];
    if (!votingResultsSheet) {
      return NextResponse.json({ success: false, message: 'Voting Results sheet not found' });
    }

    // Get votes sheet for user vote status
    const votesSheet = doc.sheetsByTitle['Votes'];
    if (!votesSheet) {
      return NextResponse.json({ success: false, message: 'Votes sheet not found' });
    }

    // Load all data
    const proposalRows = await proposalsSheet.getRows() as any[];
    const votingResultRows = await votingResultsSheet.getRows() as any[];
    const voteRows = await votesSheet.getRows() as any[];

    // Process proposals with voting data
    const proposals = proposalRows.map((proposalRow: any, index: number) => {
      // Generate proposal ID from row index + 1
      const proposalId = `PROP-${String(index + 1).padStart(3, '0')}`;
      
      // Find voting results for this proposal
      const votingResult = votingResultRows.find((row: any) => 
        row.get('proposalId') === proposalId
      );

      // Find user's vote for this proposal
      const userVote = userId ? voteRows.find((row: any) => 
        row.get('proposalId') === proposalId && row.get('userId') === userId
      ) : null;

      // Get actual submission date from the RD sheet
      const submissionDateStr = proposalRow.get('Submission Date');
      let submissionDate;
      
      if (submissionDateStr) {
        // Try to parse the human-readable format: "August 24, 2025 at 12:15 PM UTC"
        const humanReadableMatch = submissionDateStr.match(/^(\w+ \d+, \d+) at (\d+:\d+ (?:AM|PM)) UTC$/);
        if (humanReadableMatch) {
          const [, datePart, timePart] = humanReadableMatch;
          submissionDate = new Date(`${datePart} ${timePart} UTC`);
        } else {
          // Fallback to standard Date parsing
          submissionDate = new Date(submissionDateStr);
        }
      } else {
        submissionDate = new Date();
      }
      
      // Handle invalid dates
      if (isNaN(submissionDate.getTime())) {
        submissionDate = new Date();
      }
      
      const votingDeadline = new Date(submissionDate.getTime() + (30 * 24 * 60 * 60 * 1000));
      const now = new Date();
      const isExpired = now > votingDeadline;

      // Get voting stats - calculate from votes if no voting result exists yet
      let totalUpvotes, totalDownvotes, voterCount;
      
      if (votingResult) {
        totalUpvotes = parseInt(votingResult.get('totalUpvotes') || '0');
        totalDownvotes = parseInt(votingResult.get('totalDownvotes') || '0');
        voterCount = parseInt(votingResult.get('voterCount') || '0');
      } else {
        // Calculate directly from votes sheet for real-time display
        const proposalVotes = voteRows.filter((row: any) => 
          row.get('proposalId') === proposalId
        );
        totalUpvotes = proposalVotes.filter((row: any) => row.get('voteType') === 'upvote').length;
        totalDownvotes = proposalVotes.filter((row: any) => row.get('voteType') === 'downvote').length;
        
        // Count unique voters
        const uniqueVoters = new Set(proposalVotes.map((row: any) => row.get('userId')));
        voterCount = uniqueVoters.size;
      }
      
      const netScore = totalUpvotes - totalDownvotes;

      return {
        proposalId,
        proposalTitle: proposalRow.get('Proposal Title') || '',
        reviewerName: proposalRow.get('Reviewer Name') || '',
        projectCategory: proposalRow.get('Project Category') || '',
        teamSize: proposalRow.get('Team Size') || '',
        budgetEstimate: proposalRow.get('Budget Estimate') || '',
        timelineWeeks: proposalRow.get('Timeline (Weeks)') || '',
        proposalSummary: proposalRow.get('Proposal Summary') || '',
        technicalApproach: proposalRow.get('Technical Approach') || '',
        submissionDate: isNaN(submissionDate.getTime()) ? new Date().toISOString() : submissionDate.toISOString(),
        votingDeadline: isNaN(votingDeadline.getTime()) ? new Date().toISOString() : votingDeadline.toISOString(),
        status: isExpired ? 'expired' : 'active',
        totalUpvotes,
        totalDownvotes,
        netScore,
        voterCount,
        userVote: userVote ? userVote.get('voteType') : null
      };
    });

    // Only update voting results if there are missing entries (reduce API calls)
    const missingResults = proposals.filter(proposal => 
      !votingResultRows.find((row: any) => row.get('Proposal ID') === proposal.proposalId)
    );
    
    // Batch create missing voting result entries to reduce API calls
    if (missingResults.length > 0) {
      try {
        for (const proposal of missingResults) {
          await votingResultsSheet.addRow({
            'Proposal ID': proposal.proposalId,
            'Proposal Title': proposal.proposalTitle,
            'Total Upvotes': '0',
            'Total Downvotes': '0',
            'Net Score': '0',
            'Voter Count': '0',
            'Voting Deadline': proposal.votingDeadline,
            'Status': proposal.status,
            'Last Updated': new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    })
          });
        }
      } catch (writeError) {
        console.warn('Warning: Could not create voting result entries due to quota limits:', writeError instanceof Error ? writeError.message : String(writeError));
        // Continue without creating entries - the system will still work for reading
      }
    }
    
    // Update status for existing entries only if status has changed (reduce writes)
    const statusUpdates = [];
    for (const proposal of proposals) {
      const existingResult = votingResultRows.find((row: any) => 
        row.get('Proposal ID') === proposal.proposalId
      );
      
      if (existingResult) {
        const currentStatus = existingResult.get('Status');
        if (currentStatus !== proposal.status) {
          statusUpdates.push({ result: existingResult, proposal });
        }
      }
    }
    
    // Batch update status changes
    if (statusUpdates.length > 0) {
      try {
        for (const { result, proposal } of statusUpdates) {
          result.set('Status', proposal.status);
          result.set('Last Updated', new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    }));
          await result.save();
        }
      } catch (updateError) {
        console.warn('Warning: Could not update voting result status due to quota limits:', updateError instanceof Error ? updateError.message : String(updateError));
        // Continue - status will be updated on next successful request
      }
    }

    return NextResponse.json({
      success: true,
      proposals,
      message: `Found ${proposals.length} proposals`
    });

  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch proposals',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}