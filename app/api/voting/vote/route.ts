import { NextRequest, NextResponse } from 'next/server';
import { getVotingDurationDays, getVotingDurationDaysAt } from '@/lib/voting-settings';
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

    // Get voting duration from settings (used only when history is unavailable)
    const votingDurationDays = await getVotingDurationDays();

    // Load data using the service
    const voteRows = await googleSheetsService.getVotes();
    const proposalRows = await googleSheetsService.getProposals();

    // Find proposal by normalized ID to avoid index/order mismatches
    const normalizedProposals = proposalRows.map((row: any, idx: number) => {
      const idRaw = String(row.id || row.ID || row.proposalId || '').trim();
      const idMatch = idRaw.match(/^PROP-(\d+)$/);
      const normalizedId = idMatch ? idRaw : `PROP-${String(idx + 1).padStart(3, '0')}`;
      return { row, normalizedId };
    });

    const found = normalizedProposals.find(p => p.normalizedId === proposalId);
    if (!found) {
      return NextResponse.json({
        success: false,
        message: 'Proposal not found'
      }, { status: 404 });
    }
    const proposal = found.row;

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
      
      // Handle invalid dates - fallback to calculated deadline using historical duration
      if (isNaN(votingDeadline.getTime())) {
        const durationAtSubmission = await getVotingDurationDaysAt(submissionDate);
        votingDeadline = new Date(submissionDate.getTime() + (durationAtSubmission * 24 * 60 * 60 * 1000));
      }
    } else {
      // For older proposals without stored deadline, calculate from submission date using historical duration
      const durationAtSubmission = await getVotingDurationDaysAt(submissionDate);
      votingDeadline = new Date(submissionDate.getTime() + (durationAtSubmission * 24 * 60 * 60 * 1000));
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
    // Duplicate vote check: compare by string userId OR username
    const hasVoted = voteRows.some((v: any) => {
      const vUid = String(v.userId || '').trim();
      const vUname = String(v.username || '').trim().toLowerCase();
      return (v.proposalId === proposalId) && (
        vUid === String(userId).trim() || vUname === String(username).trim().toLowerCase()
      );
    });
    if (hasVoted) {
      return NextResponse.json({ success: false, message: 'You have already voted on this proposal. Vote changes are not allowed.' }, { status: 409 });
    }
    const existingVote = voteRows.find((row: any) => 
      row.proposalId === proposalId && row.userId === String(userId)
    );

    if (existingVote) {
      return NextResponse.json({
        success: false,
        message: 'You have already voted on this proposal. Vote changes are not allowed.'
      }, { status: 400 });
    }

    // Add new vote using the service
    await googleSheetsService.addVote(proposalId, String(userId), username, voteType);

    // Recompute aggregated voting results for this proposal and persist
    try {
      const freshVotes = await googleSheetsService.getVotes();
      const proposalVotes = freshVotes.filter((row: any) => row.proposalId === proposalId);
      const totalUpvotes = proposalVotes.filter((row: any) => row.voteType === 'upvote').length;
      const totalDownvotes = proposalVotes.filter((row: any) => row.voteType === 'downvote').length;
      const voterCount = new Set(proposalVotes.map((row: any) => row.userId)).size;
      const netScore = totalUpvotes - totalDownvotes;

      await googleSheetsService.updateVotingResult(proposalId, {
        'Total Upvotes': totalUpvotes,
        'Total Downvotes': totalDownvotes,
        'Net Score': netScore,
        'Voter Count': voterCount
      });
    } catch (aggErr) {
      console.warn('Warning: Could not update aggregated voting results:', aggErr instanceof Error ? aggErr.message : String(aggErr));
    }

    // Invalidate user-specific proposal cache with correct key
    cache.delete(CACHE_KEYS.PROPOSALS_WITH_VOTES(String(userId)));

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