import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { cache, CACHE_KEYS, CACHE_TTL } from './cache';

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
  'Submission Date': string;
  'Voting Deadline': string;
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

class GoogleSheetsService {
  private doc: GoogleSpreadsheet | null = null;
  private lastConnectionTime = 0;
  private connectionTTL = 5 * 60 * 1000; // 5 minutes

  private async getDocument(): Promise<GoogleSpreadsheet> {
    const now = Date.now();
    
    // Reuse existing connection if it's still valid
    if (this.doc && (now - this.lastConnectionTime) < this.connectionTTL) {
      // Ensure loadInfo is called even for cached connections
      await this.doc.loadInfo();
      return this.doc;
    }

    // Create new connection
    this.doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await this.doc.loadInfo();
    this.lastConnectionTime = now;
    
    return this.doc;
  }

  async getProposals(): Promise<any[]> {
    // Check cache first
    const cached = cache.get<any[]>(CACHE_KEYS.PROPOSALS);
    if (cached) {
      return cached;
    }

    const doc = await this.getDocument();
    const proposalsSheet = doc.sheetsByTitle['RD'];
    
    if (!proposalsSheet) {
      throw new Error('RD (Requirement Documents) sheet not found');
    }

    const rows = await proposalsSheet.getRows();
    const proposals = rows.map((row: any) => ({
      reviewerName: row.get('Reviewer Name') || '',
      proposalTitle: row.get('Proposal Title') || '',
      projectCategory: row.get('Project Category') || '',
      teamSize: row.get('Team Size') || '',
      budgetEstimate: row.get('Budget Estimate') || '',
      timelineWeeks: row.get('Timeline (Weeks)') || '',
      proposalSummary: row.get('Proposal Summary') || '',
      technicalApproach: row.get('Technical Approach') || '',
      additionalNotes: row.get('Additional Notes') || '',
      submissionDate: row.get('Submission Date') || '',
      votingDeadline: row.get('Voting Deadline') || ''
    }));

    // Cache the results
    cache.set(CACHE_KEYS.PROPOSALS, proposals, CACHE_TTL.PROPOSALS);
    
    return proposals;
  }

  async getVotes(): Promise<any[]> {
    // Check cache first
    const cached = cache.get<any[]>(CACHE_KEYS.VOTES);
    if (cached) {
      return cached;
    }

    const doc = await this.getDocument();
    const votesSheet = doc.sheetsByTitle['Votes'];
    
    if (!votesSheet) {
      throw new Error('Votes sheet not found');
    }

    const rows = await votesSheet.getRows();
    const votes = rows.map((row: any) => ({
      proposalId: row.get('Proposal ID') || row.get('proposalId') || '',
      userId: row.get('User ID') || row.get('userId') || '',
      username: row.get('Username') || row.get('username') || '',
      voteType: row.get('Vote Type') || row.get('voteType') || '',
      voteDate: row.get('Vote Date') || row.get('voteDate') || ''
    }));

    // Cache with shorter TTL since votes change frequently
    cache.set(CACHE_KEYS.VOTES, votes, CACHE_TTL.VOTES);
    
    return votes;
  }

  async getVotingResults(): Promise<any[]> {
    // Check cache first
    const cached = cache.get<any[]>(CACHE_KEYS.VOTING_RESULTS);
    if (cached) {
      return cached;
    }

    const doc = await this.getDocument();
    const votingResultsSheet = doc.sheetsByTitle['Voting Results'];
    
    if (!votingResultsSheet) {
      throw new Error('Voting Results sheet not found');
    }

    const rows = await votingResultsSheet.getRows();
    const results = rows.map((row: any) => ({
      proposalId: row.get('Proposal ID') || row.get('proposalId') || '',
      proposalTitle: row.get('Proposal Title') || '',
      totalUpvotes: parseInt(row.get('Total Upvotes') || row.get('totalUpvotes') || '0'),
      totalDownvotes: parseInt(row.get('Total Downvotes') || row.get('totalDownvotes') || '0'),
      netScore: parseInt(row.get('Net Score') || row.get('netScore') || '0'),
      voterCount: parseInt(row.get('Voter Count') || row.get('voterCount') || '0'),
      votingDeadline: row.get('Voting Deadline') || row.get('votingDeadline') || '',
      status: row.get('Status') || row.get('status') || '',
      lastUpdated: row.get('Last Updated') || row.get('lastUpdated') || ''
    }));

    // Cache with medium TTL
    cache.set(CACHE_KEYS.VOTING_RESULTS, results, CACHE_TTL.VOTING_RESULTS);
    
    return results;
  }

  async addVote(proposalId: string, userId: string, username: string, voteType: 'upvote' | 'downvote'): Promise<void> {
    const doc = await this.getDocument();
    const votesSheet = doc.sheetsByTitle['Votes'];
    
    if (!votesSheet) {
      throw new Error('Votes sheet not found');
    }

    // Generate a unique vote ID
    const voteId = `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await votesSheet.addRow({
      'voteId': voteId,
      'proposalId': proposalId,
      'userId': userId,
      'username': username,
      'voteType': voteType,
      'votedAt': new Date().toISOString()
    });

    // Invalidate related caches
    cache.delete(CACHE_KEYS.VOTES);
  }

  async updateVotingResults(missingResults: any[]): Promise<void> {
    if (!missingResults || missingResults.length === 0) {
      return;
    }

    const doc = await this.getDocument();
    const votingResultsSheet = doc.sheetsByTitle['Voting Results'];
    
    if (!votingResultsSheet) {
      throw new Error('Voting Results sheet not found');
    }

    // Add all missing results in batch
    for (const result of missingResults) {
      await votingResultsSheet.addRow({
        'Proposal ID': result.proposalId,
        'Proposal Title': result.proposalTitle,
        'Total Upvotes': result.totalUpvotes || 0,
        'Total Downvotes': result.totalDownvotes || 0,
        'Net Score': result.netScore || 0,
        'Voter Count': result.voterCount || 0,
        'Voting Deadline': result.votingDeadline || '',
        'Status': result.status || 'active',
        'Last Updated': new Date().toISOString()
      });
    }

    // Invalidate cache after batch update
    cache.delete(CACHE_KEYS.VOTING_RESULTS);
  }

  // Clear all user-specific proposal caches
  clearUserProposalCache(userId: string): void {
    const stats = cache.getStats();
    for (let i = 0; i < stats.totalEntries; i++) {
      // This is a simple approach - in production you might want a more sophisticated cache invalidation
      if (cache.has(CACHE_KEYS.PROPOSALS_WITH_VOTES(userId))) {
        cache.delete(CACHE_KEYS.PROPOSALS_WITH_VOTES(userId));
      }
    }
  }

  async updateVotingResult(proposalId: string, data: Partial<VotingResultRow>): Promise<void> {
    const doc = await this.getDocument();
    const votingResultsSheet = doc.sheetsByTitle['Voting Results'];
    
    if (!votingResultsSheet) {
      throw new Error('Voting Results sheet not found');
    }

    const rows = await votingResultsSheet.getRows();
    const existingRow = rows.find((row: any) => 
      (row.get('Proposal ID') || row.get('proposalId')) === proposalId
    );

    if (existingRow) {
      // Update existing row
      Object.entries(data).forEach(([key, value]) => {
        existingRow.set(key, value);
      });
      await existingRow.save();
    } else {
      // Create new row
      await votingResultsSheet.addRow({
        'Proposal ID': proposalId,
        ...data
      });
    }

    // Invalidate cache
    cache.delete(CACHE_KEYS.VOTING_RESULTS);
  }

  // Invalidate all caches (useful for manual refresh)
  invalidateAllCaches(): void {
    cache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return cache.getStats();
  }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsService();