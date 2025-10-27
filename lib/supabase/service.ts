import { supabaseAdmin } from './server';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

export const supabaseService = {
  async getProposals(): Promise<any[]> {
    const cached = cache.get<any[]>(CACHE_KEYS.PROPOSALS);
    if (cached) return cached;

    // Read proposals from the "rd" table (requirement documents)
    const { data, error } = await supabaseAdmin
      .from('rd')
      .select('*');
    if (error) {
      console.error('Supabase getProposals error:', error);
      return [];
    }

    // Map various casings and spaced column names to a consistent shape
    const proposals = (data || []).map((row: any) => ({
      id: row.id || row.ID || row.proposalId || '',
      reviewerName: row['Reviewer Name'] || row.reviewerName || row.reviewer_name || '',
      proposalTitle: row['Proposal Title'] || row.proposalTitle || row.proposal_title || '',
      projectCategory: row['Project Category'] || row.projectCategory || row.project_category || '',
      teamSize: row['Team Size'] || row.teamSize || row.team_size || '',
      budgetEstimate: row['Budget Estimate'] || row.budgetEstimate || row.budget_estimate || '',
      timelineWeeks: row['Timeline (Weeks)'] || row.timelineWeeks || row.timeline_weeks || '',
      proposalSummary: row['Proposal Summary'] || row.proposalSummary || row.proposal_summary || '',
      technicalApproach: row['Technical Approach'] || row.technicalApproach || row.technical_approach || '',
      additionalNotes: row['Additional Notes'] || row.additionalNotes || row.additional_notes || '',
      submissionDate: row['Submission Date'] || row.submissionDate || row.submission_date || '',
      votingDeadline: row['Voting Deadline'] || row.votingDeadline || row.voting_deadline || '',
      status: row.status || 'active'
    }));

    cache.set(CACHE_KEYS.PROPOSALS, proposals, CACHE_TTL.PROPOSALS);
    return proposals;
  },

  async getVotes(): Promise<any[]> {
    const cached = cache.get<any[]>(CACHE_KEYS.VOTES);
    if (cached) return cached;

    const { data, error } = await supabaseAdmin
      .from('votes')
      .select('*')
      .order('votedAt', { ascending: true });
    if (error) {
      console.error('Supabase getVotes error:', error);
      return [];
    }
    const votes = (data || []).map((row: any) => ({
      proposalId: row.proposal_id ?? row.proposalId ?? '',
      userId: String(row.user_id ?? row.userId ?? ''),
      username: row.username ?? '',
      voteType: row.vote_type ?? row.voteType ?? '',
      voteDate: row.votedAt ?? row.voted_at ?? row.voteDate ?? ''
    }));

    cache.set(CACHE_KEYS.VOTES, votes, CACHE_TTL.VOTES);
    return votes;
  },

  async getVotingResults(): Promise<any[]> {
    const cached = cache.get<any[]>(CACHE_KEYS.VOTING_RESULTS);
    if (cached) return cached;

    const { data, error } = await supabaseAdmin
      .from('voting_results')
      .select('*')
      .order('updatedAt', { ascending: true });
    if (error) {
      console.error('Supabase getVotingResults error:', error);
      return [];
    }
    const results = (data || []).map((row: any) => ({
      proposalId: row.proposalId || row.proposal_id || '',
      proposalTitle: row.proposalTitle || row.proposal_title || '',
      totalUpvotes: Number(row.totalUpvotes ?? row.total_upvotes ?? 0),
      totalDownvotes: Number(row.totalDownvotes ?? row.total_downvotes ?? 0),
      netScore: Number(row.netScore ?? row.net_score ?? 0),
      voterCount: Number(row.voterCount ?? row.voter_count ?? 0),
      votingDeadline: row.votingDeadline || row.voting_deadline || '',
      status: row.status || '',
      updatedAt: row.updatedAt || row.last_updated || row.updated_at || ''
    }));

    cache.set(CACHE_KEYS.VOTING_RESULTS, results, CACHE_TTL.VOTING_RESULTS);
    return results;
  },

  async addVote(proposalId: string, userId: string, username: string, voteType: 'upvote' | 'downvote'): Promise<void> {
    const voteId = `vote_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const userIdNum = Number(userId);
    const userIdForInsert = Number.isFinite(userIdNum) ? userIdNum : null;

    const { error } = await supabaseAdmin
      .from('votes')
      .insert([{
        voteId: voteId,
        proposalId: proposalId,
        userId: userIdForInsert,
        username,
        voteType: voteType,
        votedAt: new Date().toISOString(),
      }]);
    if (error) {
      console.error('Supabase addVote error:', error);
      throw error;
    }
    cache.delete(CACHE_KEYS.VOTES);
  },

  async updateVotingResults(missingResults: any[]): Promise<void> {
    if (!missingResults?.length) return;
    const rows = missingResults.map((r: any) => ({
      proposalId: r.proposalId,
      proposalTitle: r.proposalTitle ?? '',
      reviewerName: r.reviewerName ?? '',
      projectCategory: r.projectCategory ?? '',
      teamSize: r.teamSize ?? '',
      budgetEstimate: r.budgetEstimate ?? '',
      timelineWeeks: r.timelineWeeks ?? '',
      proposalSummary: r.proposalSummary ?? '',
      technicalApproach: r.technicalApproach ?? '',
      submissionDate: r.submissionDate ?? '',
      totalUpvotes: r.totalUpvotes ?? 0,
      totalDownvotes: r.totalDownvotes ?? 0,
      netScore: r.netScore ?? 0,
      voterCount: r.voterCount ?? 0,
      votingDeadline: r.votingDeadline ?? '',
      status: r.status ?? 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    const { error } = await supabaseAdmin.from('voting_results').insert(rows);
    if (error) console.error('Supabase updateVotingResults error:', error);
    cache.delete(CACHE_KEYS.VOTING_RESULTS);
  },

  async updateVotingResult(proposalId: string, data: any): Promise<void> {
    const payload: any = {};
    if (data['Proposal Title'] || data.proposalTitle) payload.proposalTitle = data['Proposal Title'] ?? data.proposalTitle;
    if (data['Total Upvotes'] || data.totalUpvotes) payload.totalUpvotes = data['Total Upvotes'] ?? data.totalUpvotes;
    if (data['Total Downvotes'] || data.totalDownvotes) payload.totalDownvotes = data['Total Downvotes'] ?? data.totalDownvotes;
    if (data['Net Score'] || data.netScore) payload.netScore = data['Net Score'] ?? data.netScore;
    if (data['Voter Count'] || data.voterCount) payload.voterCount = data['Voter Count'] ?? data.voterCount;
    if (data['Voting Deadline'] || data.votingDeadline) payload.votingDeadline = data['Voting Deadline'] ?? data.votingDeadline;
    if (data['Status'] || data.status) payload.status = data['Status'] ?? data.status;
    payload.updatedAt = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('voting_results')
      .update(payload)
      .eq('proposalId', proposalId);
    if (error) console.error('Supabase updateVotingResult error:', error);
    cache.delete(CACHE_KEYS.VOTING_RESULTS);
  },

  async backfillProposalVotingDeadlines(backfills: { index: number; votingDeadlineISO: string }[]): Promise<void> {
    if (!backfills?.length) return;
    // Read current proposals to map index -> proposalId in the same order
    const proposals = await this.getProposals();
    const updates = backfills
      .filter(({ index }) => proposals[index])
      .map(({ index, votingDeadlineISO }) => ({ proposalId: proposals[index].id, votingDeadline: votingDeadlineISO }));

    for (const upd of updates) {
      const { error } = await supabaseAdmin
        .from('voting_results')
        .update({ votingDeadline: upd.votingDeadline })
        .eq('proposalId', upd.proposalId);
      if (error) console.error('Supabase backfillProposalVotingDeadlines error:', error);
    }
    cache.delete(CACHE_KEYS.PROPOSALS);
  },

  async generateNextProposalId(): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('rd')
      .select('ID')
      .limit(2000);
    if (error) {
      console.error('Supabase generateNextProposalId select error:', error);
    }
    const usedNumbers = new Set<number>();
    for (const row of data || []) {
      const val = (row as any).ID || '';
      const m = String(val).trim().match(/^PROP-(\d+)$/);
      if (m) usedNumbers.add(parseInt(m[1], 10));
    }
    let nextSeq = 1;
    while (usedNumbers.has(nextSeq)) nextSeq++;
    return `PROP-${String(nextSeq).padStart(3, '0')}`;
  },

  async createProposal(row: {
    id: string;
    reviewer_name: string;
    proposal_title: string;
    project_category: string;
    team_size: string;
    budget_estimate: string;
    timeline_weeks: string;
    proposal_summary: string;
    technical_approach: string;
    additional_notes: string;
    submission_date: string;
    voting_deadline: string;
  }): Promise<void> {
    // Write the proposal to the "rd" table (requirement documents)
    const payload: any = {
      ID: row.id,
      'Reviewer Name': row.reviewer_name,
      'Proposal Title': row.proposal_title,
      'Project Category': row.project_category,
      'Team Size': row.team_size,
      'Budget Estimate': row.budget_estimate,
      'Timeline (Weeks)': row.timeline_weeks,
      'Proposal Summary': row.proposal_summary,
      'Technical Approach': row.technical_approach,
      'Additional Notes': row.additional_notes,
      'Submission Date': row.submission_date,
      // Note: Some schemas include 'Voting Deadline' in rd; if absent, omit.
    };
    const { error } = await supabaseAdmin
      .from('rd')
      .insert([payload]);
    if (error) console.error('Supabase createProposal error:', error);
    cache.delete(CACHE_KEYS.PROPOSALS);
  },

  // Announcements
  async getGeneralAnnouncements(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('announcement')
      .select('*')
      .eq('category', 'general')
      .order('createdAt', { ascending: false });
    if (error) {
      console.error('Supabase getGeneralAnnouncements error:', error);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id || '',
      title: row.title || '',
      content: row.content || '',
      category: row.category || 'general',
      status: row.status || 'live',
      duration: row.duration != null ? Number(row.duration) : undefined,
      expiresAt: row.expiresAt || undefined,
      createdAt: row.createdAt || '',
      updatedAt: row.updatedAt || ''
    }));
  },

  async getAllAnnouncements(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('announcement')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) {
      console.error('Supabase getAllAnnouncements error:', error);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id || '',
      title: row.title || '',
      content: row.content || '',
      category: row.category || '',
      status: row.status || 'live',
      duration: row.duration != null ? Number(row.duration) : undefined,
      expiresAt: row.expiresAt || undefined,
      createdAt: row.createdAt || '',
      updatedAt: row.updatedAt || ''
    }));
  },

  async getImportantAnnouncements(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('announcement')
      .select('*')
      .eq('category', 'important')
      .order('createdAt', { ascending: false });
    if (error) {
      console.error('Supabase getImportantAnnouncements error:', error);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id || '',
      title: row.title || '',
      content: row.content || '',
      category: row.category || 'important',
      status: row.status || 'live',
      duration: row.duration != null ? Number(row.duration) : undefined,
      expiresAt: row.expiresAt || undefined,
      createdAt: row.createdAt || '',
      updatedAt: row.updatedAt || ''
    }));
  },

  async createAnnouncement(row: {
    id: string;
    title: string;
    content: string;
    category: 'important' | 'general';
    status: 'live' | 'expired' | 'upcoming';
    duration?: number;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
  }): Promise<void> {
    const payload: any = {
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      status: row.status,
      duration: row.duration ?? null,
      expiresAt: row.expiresAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    const { error } = await supabaseAdmin
      .from('announcement')
      .insert([payload]);
    if (error) console.error('Supabase createAnnouncement error:', error);
  },

  async updateAnnouncement(id: string, patch: {
    title?: string;
    content?: string;
    category?: 'important' | 'general';
    status?: 'live' | 'expired' | 'upcoming';
    duration?: number;
    expiresAt?: string | null;
    updatedAt?: string;
  }): Promise<void> {
    const payload: any = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.content !== undefined) payload.content = patch.content;
    if (patch.category !== undefined) payload.category = patch.category;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.duration !== undefined) payload.duration = patch.duration;
    if (patch.expiresAt !== undefined) payload.expiresAt = patch.expiresAt;
    payload.updatedAt = patch.updatedAt ?? new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('announcement')
      .update(payload)
      .eq('id', id);
    if (error) console.error('Supabase updateAnnouncement error:', error);
  },

  async deleteAnnouncement(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('announcement')
      .delete()
      .eq('id', id);
    if (error) console.error('Supabase deleteAnnouncement error:', error);
  },

  // Resources
  async getResources(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('resources')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) {
      console.error('Supabase getResources error:', error);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id || '',
      title: row.title || '',
      description: row.description || '',
      category: row.category || '',
      url: row.url || undefined,
      fileUrl: row.fileUrl || undefined,
      fileName: row.fileName || undefined,
      createdAt: row.createdAt || '',
      updatedAt: row.updatedAt || ''
    }));
  },

  async createResource(row: {
    id: string;
    title: string;
    description: string;
    category: string;
    url?: string;
    fileUrl?: string;
    fileName?: string;
    createdAt: string;
    updatedAt: string;
  }): Promise<void> {
    const payload: any = {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      url: row.url ?? null,
      fileUrl: row.fileUrl ?? null,
      fileName: row.fileName ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    const { error } = await supabaseAdmin
      .from('resources')
      .insert([payload]);
    if (error) console.error('Supabase createResource error:', error);
  },

  async updateResource(id: string, patch: {
    title?: string;
    description?: string;
    category?: string;
    url?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    updatedAt?: string;
  }): Promise<void> {
    const payload: any = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.category !== undefined) payload.category = patch.category;
    if (patch.url !== undefined) payload.url = patch.url;
    if (patch.fileUrl !== undefined) payload.fileUrl = patch.fileUrl;
    if (patch.fileName !== undefined) payload.fileName = patch.fileName;
    payload.updatedAt = patch.updatedAt ?? new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('resources')
      .update(payload)
      .eq('id', id);
    if (error) console.error('Supabase updateResource error:', error);
  },

  async deleteResource(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('resources')
      .delete()
      .eq('id', id);
    if (error) console.error('Supabase deleteResource error:', error);
  },

  invalidateAllCaches(): void {
    cache.clear();
  },

  getCacheStats() {
    return cache.getStats();
  },

  async getAnnouncementById(id: string): Promise<any | null> {
    const { data, error } = await supabaseAdmin
      .from('announcement')
      .select('*')
      .eq('id', id)
      .limit(1);
    if (error) {
      console.error('Supabase getAnnouncementById error:', error);
      return null;
    }
    const row = (data && data[0]) || null;
    if (!row) return null;
    return {
      id: row.id || '',
      title: row.title || '',
      content: row.content || '',
      category: row.category || '',
      status: row.status || 'live',
      duration: row.duration != null ? Number(row.duration) : undefined,
      expiresAt: row.expiresAt || undefined,
      createdAt: row.createdAt || '',
      updatedAt: row.updatedAt || ''
    };
  },

  // Users
  async validateUserCredentials(
    username: string,
    password: string
  ): Promise<{ id: string; username: string; name: string; role: string } | null> {
    const trimmed = String(username).trim();
    if (!trimmed || !password) return null;

    // Fetch rows and filter client-side to support mixed casing/spaces in column names
    const { data, error } = await supabaseAdmin
      .from('user_app')
      .select('*')
      .limit(2000);

    if (error) {
      console.error('Supabase validateUserCredentials select error:', error);
      return null;
    }

    const rows = data || [];

    const getFirst = (row: any, keys: string[]): any => {
      for (const k of keys) {
        const v = row?.[k];
        if (v !== undefined && v !== null && String(v).length > 0) return v;
      }
      return undefined;
    };

    const candidate = rows.find((row: any) => {
      const uname = getFirst(row, ['username', 'user_name', 'Username', 'USER_NAME', 'USER', 'user', 'User Name']);
      return String(uname || '').trim() === trimmed;
    });

    if (!candidate) return null;

    const dbPassword = getFirst(candidate, ['password', 'Password', 'password_hash', 'passwordHash', 'PASSWORD', 'PASSWORD_HASH']);
    if (!dbPassword) {
      console.warn('User row missing password field in user_app');
      return null;
    }

    // Plaintext comparison; replace with hash verification if your DB stores hashes
    const isMatch = String(dbPassword) === String(password);
    if (!isMatch) return null;

    const uid = getFirst(candidate, ['id', 'ID', 'user_id', 'userId']) ?? '';
    const uname = getFirst(candidate, ['username', 'user_name', 'Username', 'User Name']) ?? trimmed;
    const name = getFirst(candidate, ['name', 'Name', 'full_name', 'Full Name', 'displayName']) ?? uname;
    const roleRaw = getFirst(candidate, ['role', 'Role', 'user_role', 'userRole']) ?? 'reviewer';
    const roleNorm = String(roleRaw).toLowerCase().replace(/\s+/g, '_');
    const normalizedRole = roleNorm === 'team_leader' ? 'team_leader' : roleNorm === 'admin' ? 'admin' : 'reviewer';

    return {
      id: String(uid),
      username: String(uname),
      name: String(name),
      role: String(normalizedRole),
    };
  },
};