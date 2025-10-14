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

  // Simple in-memory write throttling to avoid Google Sheets 429s
  private writeWindowStartMs = 0;
  private writeCountInWindow = 0;
  private WRITE_LIMIT_PER_MINUTE = 10; // conservative cap

  private resetWriteWindowIfNeeded() {
    const now = Date.now();
    if (now - this.writeWindowStartMs >= 60 * 1000) {
      this.writeWindowStartMs = now;
      this.writeCountInWindow = 0;
    }
  }

  private getRemainingWriteBudget(): number {
    this.resetWriteWindowIfNeeded();
    const remaining = this.WRITE_LIMIT_PER_MINUTE - this.writeCountInWindow;
    return remaining < 0 ? 0 : remaining;
  }

  private recordWrite(count: number = 1) {
    this.resetWriteWindowIfNeeded();
    this.writeCountInWindow += count;
  }

  // Helper to detect missing env configuration
  private hasSheetsEnv(): boolean {
    return Boolean(
      process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
    );
  }

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
    // If env missing, return empty list to avoid 500s
    if (!this.hasSheetsEnv()) {
      return [];
    }
    // Check cache first
    const cached = cache.get<any[]>(CACHE_KEYS.PROPOSALS);
    if (cached) {
      return cached;
    }

    const doc = await this.getDocument();
    await doc.loadInfo();
    let proposalsSheet = doc.sheetsByTitle['RD'];
    
    // Auto-create RD sheet if missing to avoid 500s
    if (!proposalsSheet) {
      proposalsSheet = await doc.addSheet({
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
    // If env missing, return empty list
    if (!this.hasSheetsEnv()) {
      return [];
    }
    // Check cache first
    const cached = cache.get<any[]>(CACHE_KEYS.VOTES);
    if (cached) {
      return cached;
    }

    const doc = await this.getDocument();
    await doc.loadInfo();
    let votesSheet = doc.sheetsByTitle['Votes'];
    
    // Auto-create Votes sheet if missing with lowercase headers to match addVote
    if (!votesSheet) {
      votesSheet = await doc.addSheet({
        title: 'Votes',
        headerValues: ['voteId', 'proposalId', 'userId', 'username', 'voteType', 'voteDate']
      });
    }

    const rows = await votesSheet.getRows();
    const votes = rows.map((row: any) => ({
      proposalId: row.get('Proposal ID') || row.get('proposalId') || '',
      userId: row.get('User ID') || row.get('userId') || '',
      username: row.get('Username') || row.get('username') || '',
      voteType: row.get('Vote Type') || row.get('voteType') || '',
      // Support both 'voteDate' and 'votedAt' field names
      voteDate: row.get('Vote Date') || row.get('voteDate') || row.get('votedAt') || ''
    }));

    // Cache with shorter TTL since votes change frequently
    cache.set(CACHE_KEYS.VOTES, votes, CACHE_TTL.VOTES);
    
    return votes;
  }

  async getVotingResults(): Promise<any[]> {
    // If env missing, return empty list
    if (!this.hasSheetsEnv()) {
      return [];
    }
    // Check cache first
    const cached = cache.get<any[]>(CACHE_KEYS.VOTING_RESULTS);
    if (cached) {
      return cached;
    }

    const doc = await this.getDocument();
    await doc.loadInfo();
    let votingResultsSheet = doc.sheetsByTitle['Voting Results'];
    
    // Auto-create Voting Results sheet if missing to avoid crashes
    if (!votingResultsSheet) {
      votingResultsSheet = await doc.addSheet({
        title: 'Voting Results',
        headerValues: [
          'Proposal ID',
          'Proposal Title',
          'Total Upvotes',
          'Total Downvotes',
          'Net Score',
          'Voter Count',
          'Voting Deadline',
          'Status',
          'Last Updated'
        ]
      });
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
    // If env missing, no-op
    if (!this.hasSheetsEnv()) {
      return;
    }
    const doc = await this.getDocument();
    await doc.loadInfo();
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
    // If env missing, no-op
    if (!this.hasSheetsEnv()) {
      return;
    }

    // Throttle writes to avoid exceeding quota; if no budget, skip
    const allowed = this.getRemainingWriteBudget();
    if (allowed <= 0) {
      return;
    }

    const doc = await this.getDocument();
    await doc.loadInfo();
    const votingResultsSheet = doc.sheetsByTitle['Voting Results'];
    
    if (!votingResultsSheet) {
      throw new Error('Voting Results sheet not found');
    }

    // Add all missing results in batch
    let processed = 0;
    for (const result of missingResults.slice(0, allowed)) {
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
      processed++;
    }

    if (processed > 0) {
      this.recordWrite(processed);
    }

    // Invalidate cache after batch update
    cache.delete(CACHE_KEYS.VOTING_RESULTS);
  }

  async updateVotingResult(proposalId: string, data: Partial<VotingResultRow>): Promise<void> {
    const doc = await this.getDocument();
    await doc.loadInfo();
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

  // Backfill missing Voting Deadline values in RD sheet for existing proposals
  async backfillProposalVotingDeadlines(backfills: { index: number; votingDeadlineISO: string }[]): Promise<void> {
    if (!backfills || backfills.length === 0) {
      return;
    }
    // If env missing, no-op
    if (!this.hasSheetsEnv()) {
      return;
    }

    // Throttle writes: if no budget, skip entirely to avoid extra reads
    const allowed = this.getRemainingWriteBudget();
    if (allowed <= 0) {
      return;
    }

    const doc = await this.getDocument();
    await doc.loadInfo();
    const proposalsSheet = doc.sheetsByTitle['RD'];
    if (!proposalsSheet) {
      throw new Error('RD (Requirement Documents) sheet not found');
    }

    const rows = await proposalsSheet.getRows();

    let processed = 0;
    for (const { index, votingDeadlineISO } of backfills.slice(0, allowed)) {
      const row = rows[index];
      if (!row) continue;

      // Skip if already has a stored deadline
      const existing = row.get('Voting Deadline');
      if (existing && String(existing).trim().length > 0) continue;

      row.set('Voting Deadline', votingDeadlineISO);
      await row.save();
      processed++;
    }

    if (processed > 0) {
      this.recordWrite(processed);
    }

    // Invalidate proposals cache so subsequent reads reflect the persisted deadlines
    cache.delete(CACHE_KEYS.PROPOSALS);
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