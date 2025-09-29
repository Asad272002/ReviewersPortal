import { NextRequest, NextResponse } from 'next/server';
import { getVotingDurationDays } from '@/lib/voting-settings';
import { googleSheetsService } from '@/lib/google-sheets-service';
import { cache, CACHE_KEYS } from '@/lib/cache';

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

    // Get voting duration from settings
    const votingDurationDays = await getVotingDurationDays();

    // Load data using the service
    const voteRows = await googleSheetsService.getVotes();
    const proposalRows = await googleSheetsService.getProposals();

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

    // Check if voting period is still active using stored deadline
    const submissionDateStr = proposal.submissionDate;
    const votingDeadlineStr = proposal.votingDeadline;
    
    let submissionDate;
    let votingDeadline;
    
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
    
    // Use stored voting deadline if available, otherwise calculate from submission date
    if (votingDeadlineStr) {
      // Try to parse the human-readable format: "August 24, 2025 at 12:15 PM UTC"
      const humanReadableMatch = votingDeadlineStr.match(/^(\w+ \d+, \d+) at (\d+:\d+ (?:AM|PM)) UTC$/);
      if (humanReadableMatch) {
        const [, datePart, timePart] = humanReadableMatch;
        votingDeadline = new Date(`${datePart} ${timePart} UTC`);
      } else {
        // Fallback to standard Date parsing
        votingDeadline = new Date(votingDeadlineStr);
      }
      
      // Handle invalid dates - fallback to calculated deadline
      if (isNaN(votingDeadline.getTime())) {
        votingDeadline = new Date(submissionDate.getTime() + (votingDurationDays * 24 * 60 * 60 * 1000));
      }
    } else {
      // For older proposals without stored deadline, calculate from submission date
      votingDeadline = new Date(submissionDate.getTime() + (votingDurationDays * 24 * 60 * 60 * 1000));
    }
    
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
      row.proposalId === proposalId && row.userId === userId
    );

    if (existingVote) {
      return NextResponse.json({
        success: false,
        message: 'You have already voted on this proposal. Vote changes are not allowed.'
      }, { status: 400 });
    }

    // Add new vote using the service
    await googleSheetsService.addVote(proposalId, userId, username, voteType);

    // Invalidate user-specific proposal cache
    cache.delete(`${CACHE_KEYS.PROPOSALS_WITH_VOTES}_${userId}`);

    // Return success response - the service handles all the vote counting and result updates
    return NextResponse.json({
      success: true,
      message: 'Vote submitted successfully'
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