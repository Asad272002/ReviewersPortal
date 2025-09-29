import { NextRequest, NextResponse } from 'next/server';
import { getVotingDurationDays } from '@/lib/voting-settings';
import { googleSheetsService } from '@/lib/google-sheets-service';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || request.headers.get('x-user-id');

    // Check if we have cached proposals with votes for this user
    const cacheKey = CACHE_KEYS.PROPOSALS_WITH_VOTES(userId || undefined);
    const cachedProposals = cache.get(cacheKey);
    
    if (cachedProposals) {
      return NextResponse.json({ 
        success: true, 
        proposals: cachedProposals,
        cached: true,
        cacheStats: googleSheetsService.getCacheStats()
      });
    }

    // Get voting duration from settings
    const votingDurationDays = await getVotingDurationDays();

    // Load data using the cached service
    const [proposalRows, votingResultRows, voteRows] = await Promise.all([
      googleSheetsService.getProposals(),
      googleSheetsService.getVotingResults(),
      googleSheetsService.getVotes()
    ]);

    // Process proposals with voting data
    const proposals = proposalRows.map((proposalRow: any, index: number) => {
      // Generate proposal ID from row index + 1
      const proposalId = `PROP-${String(index + 1).padStart(3, '0')}`;
      
      // Find voting results for this proposal
      const votingResult = votingResultRows.find((row: any) => 
        row.proposalId === proposalId
      );

      // Find user's vote for this proposal
      const userVote = userId ? voteRows.find((row: any) => 
        row.proposalId === proposalId && row.userId === userId
      ) : null;

      // Get actual submission date and voting deadline from the RD sheet
      const submissionDateStr = proposalRow.submissionDate;
      const votingDeadlineStr = proposalRow.votingDeadline;
      
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
      const isExpired = now > votingDeadline;

      // Get voting stats - calculate from votes if no voting result exists yet
      let totalUpvotes, totalDownvotes, voterCount;
      
      if (votingResult) {
        totalUpvotes = parseInt(votingResult.totalUpvotes || '0');
        totalDownvotes = parseInt(votingResult.totalDownvotes || '0');
        voterCount = parseInt(votingResult.voterCount || '0');
      } else {
        // Calculate directly from votes sheet for real-time display
        const proposalVotes = voteRows.filter((row: any) => 
          row.proposalId === proposalId
        );
        totalUpvotes = proposalVotes.filter((row: any) => row.voteType === 'upvote').length;
        totalDownvotes = proposalVotes.filter((row: any) => row.voteType === 'downvote').length;
        
        // Count unique voters
        const uniqueVoters = new Set(proposalVotes.map((row: any) => row.userId));
        voterCount = uniqueVoters.size;
      }
      
      const netScore = totalUpvotes - totalDownvotes;

      return {
        proposalId,
        proposalTitle: proposalRow.proposalTitle || '',
        reviewerName: proposalRow.reviewerName || '',
        projectCategory: proposalRow.projectCategory || '',
        teamSize: proposalRow.teamSize || '',
        budgetEstimate: proposalRow.budgetEstimate || '',
        timelineWeeks: proposalRow.timelineWeeks || '',
        proposalSummary: proposalRow.proposalSummary || '',
        technicalApproach: proposalRow.technicalApproach || '',
        submissionDate: isNaN(submissionDate.getTime()) ? new Date().toISOString() : submissionDate.toISOString(),
        votingDeadline: isNaN(votingDeadline.getTime()) ? new Date().toISOString() : votingDeadline.toISOString(),
        status: isExpired ? 'expired' : 'active',
        totalUpvotes,
        totalDownvotes,
        netScore,
        voterCount,
        userVote: userVote ? userVote.voteType : null
      };
    });

    // Cache the processed proposals with votes for this user
    if (userId) {
      cache.set(`${CACHE_KEYS.PROPOSALS_WITH_VOTES}_${userId}`, proposals, CACHE_TTL.PROPOSALS);
    }

    // Only update voting results if there are missing entries (reduce API calls)
    const missingResults = proposals.filter(proposal => 
      !votingResultRows.find((row: any) => row.proposalId === proposal.proposalId)
    );
    
    // Batch create missing voting result entries to reduce API calls
    if (missingResults.length > 0) {
      try {
        await googleSheetsService.updateVotingResults(missingResults);
        // Invalidate cache after updating
        cache.delete(CACHE_KEYS.VOTING_RESULTS);
      } catch (writeError) {
        console.warn('Warning: Could not create voting result entries due to quota limits:', writeError instanceof Error ? writeError.message : String(writeError));
        // Continue without creating entries - the system will still work for reading
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