import { supabaseService } from '@/lib/supabase/service';

class GoogleSheetsServiceWrapper {
  async getProposals(): Promise<any[]> {
    return supabaseService.getProposals();
  }

  async getVotes(): Promise<any[]> {
    return supabaseService.getVotes();
  }

  async getVotingResults(): Promise<any[]> {
    return supabaseService.getVotingResults();
  }

  async addVote(proposalId: string, userId: string, username: string, voteType: 'upvote' | 'downvote'): Promise<void> {
    await supabaseService.addVote(proposalId, userId, username, voteType);
  }

  async updateVotingResults(missingResults: any[]): Promise<void> {
    await supabaseService.updateVotingResults(missingResults);
  }

  async updateVotingResult(proposalId: string, data: any): Promise<void> {
    await supabaseService.updateVotingResult(proposalId, data);
  }

  async backfillProposalVotingDeadlines(backfills: { index: number; votingDeadlineISO: string }[]): Promise<void> {
    await supabaseService.backfillProposalVotingDeadlines(backfills);
  }

  invalidateAllCaches(): void {
    supabaseService.invalidateAllCaches();
  }

  getCacheStats() {
    return supabaseService.getCacheStats();
  }
}

export const googleSheetsService = new GoogleSheetsServiceWrapper();