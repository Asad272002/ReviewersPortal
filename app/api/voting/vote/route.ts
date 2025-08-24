import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export async function POST(request: NextRequest) {
  try {
    const { proposalId, voteType, userId, username } = await request.json();

    // Validate input
    if (!proposalId || !voteType || !userId || !username) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: proposalId, voteType, userId, username'
      }, { status: 400 });
    }

    if (!['upvote', 'downvote'].includes(voteType)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid vote type. Must be "upvote" or "downvote"'
      }, { status: 400 });
    }

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();

    // Get required sheets
    const votesSheet = doc.sheetsByTitle['Votes'];
    const votingResultsSheet = doc.sheetsByTitle['Voting Results'];
    const proposalsSheet = doc.sheetsByTitle['RD'];

    if (!votesSheet || !votingResultsSheet || !proposalsSheet) {
      return NextResponse.json({
        success: false,
        message: 'Required sheets not found'
      }, { status: 500 });
    }

    // Load data
    const voteRows = await votesSheet.getRows();
    const votingResultRows = await votingResultsSheet.getRows();
    const proposalRows = await proposalsSheet.getRows();

    // Extract proposal index from proposalId (e.g., PROP-001 -> index 0)
    const proposalMatch = proposalId.match(/PROP-(\d+)/);
    if (!proposalMatch) {
      return NextResponse.json({
        success: false,
        message: 'Invalid proposal ID format'
      }, { status: 400 });
    }
    
    const proposalIndex = parseInt(proposalMatch[1]) - 1;
    const proposal = proposalRows[proposalIndex];

    if (!proposal) {
      return NextResponse.json({
        success: false,
        message: 'Proposal not found'
      }, { status: 404 });
    }

    // Check if voting period is still active (30 days from submission date)
    const submissionDateStr = proposal.get('Submission Date');
    const submissionDate = submissionDateStr ? new Date(submissionDateStr) : new Date();
    const votingDeadline = new Date(submissionDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    const now = new Date();

    // Check if voting is still active based on actual submission date
    const isVotingActive = now <= votingDeadline;

    if (!isVotingActive) {
      return NextResponse.json({
        success: false,
        message: 'Voting period has expired for this proposal'
      }, { status: 400 });
    }

    // Check if user has already voted on this proposal
    const existingVote = voteRows.find((row: any) => 
      row.get('proposalId') === proposalId && row.get('userId') === userId
    );

    if (existingVote) {
      return NextResponse.json({
        success: false,
        message: 'You have already voted on this proposal. Vote changes are not allowed.'
      }, { status: 400 });
    }

    // Add new vote
    const voteId = `VOTE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await votesSheet.addRow({
      'voteId': voteId,
      'proposalId': proposalId,
      'userId': userId,
      'username': username,
      'voteType': voteType,
      'votedAt': new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short'
      }),
      'ipAddress': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      'userAgent': request.headers.get('user-agent') || 'unknown'
    });

    // Recalculate voting results (reload to include the new vote)
    const updatedVoteRows = await votesSheet.getRows();
    const allVotesForProposal = updatedVoteRows.filter((row: any) => 
      row.get('proposalId') === proposalId
    );

    // Count all votes for this proposal
    let upvotes = 0;
    let downvotes = 0;
    const voterIds = new Set<string>();

    allVotesForProposal.forEach((row: any) => {
      const rowVoteType = row.get('voteType');
      const rowUserId = row.get('userId');
      
      if (rowVoteType === 'upvote') {
        upvotes++;
      } else if (rowVoteType === 'downvote') {
        downvotes++;
      }
      voterIds.add(rowUserId);
    });

    const netScore = upvotes - downvotes;
    const voterCount = voterIds.size;

    // Update or create voting results
    let votingResult = votingResultRows.find((row: any) => 
      row.get('proposalId') === proposalId
    );

    if (votingResult) {
      // Update existing result
      votingResult.set('totalUpvotes', upvotes.toString());
      votingResult.set('totalDownvotes', downvotes.toString());
      votingResult.set('netScore', netScore.toString());
      votingResult.set('voterCount', voterCount.toString());
      votingResult.set('updatedAt', new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  }));
      await votingResult.save();
    } else {
      // Create new result
      await votingResultsSheet.addRow({
        'proposalId': proposalId,
        'proposalTitle': proposal.get('Proposal Title') || '',
        'reviewerName': proposal.get('Reviewer Name') || '',
        'projectCategory': proposal.get('Project Category') || '',
        'teamSize': proposal.get('Team Size') || '',
        'budgetEstimate': proposal.get('Budget Estimate') || '',
        'timelineWeeks': proposal.get('Timeline (Weeks)') || '',
        'proposalSummary': proposal.get('Proposal Summary') || '',
        'technicalApproach': proposal.get('Technical Approach') || '',
        'submissionDate': submissionDate.toISOString(),
        'votingDeadline': votingDeadline.toISOString(),
        'status': 'active',
        'totalUpvotes': upvotes.toString(),
        'totalDownvotes': downvotes.toString(),
        'netScore': netScore.toString(),
        'voterCount': voterCount.toString(),
        'isWinner': 'FALSE',
        'createdAt': new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  }),
        'updatedAt': new Date().toLocaleString('en-US', {
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

    // Return updated proposal data
    const updatedProposal = {
      proposalId,
      proposalTitle: proposal.get('Proposal Title') || '',
      reviewerName: proposal.get('Reviewer Name') || '',
      projectCategory: proposal.get('Project Category') || '',
      teamSize: proposal.get('Team Size') || '',
      budgetEstimate: proposal.get('Budget Estimate') || '',
      timelineWeeks: proposal.get('Timeline (Weeks)') || '',
      proposalSummary: proposal.get('Proposal Summary') || '',
      technicalApproach: proposal.get('Technical Approach') || '',
      submissionDate: proposal.get('Submission Date') || '',
      votingDeadline: votingDeadline.toISOString(),
      status: 'active' as const,
      totalUpvotes: upvotes,
      totalDownvotes: downvotes,
      netScore,
      voterCount,
      userVote: voteType as 'upvote' | 'downvote'
    };

    return NextResponse.json({
      success: true,
      message: 'Vote submitted successfully',
      proposal: updatedProposal
    });

  } catch (error) {
    console.error('Error processing vote:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to process vote',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}