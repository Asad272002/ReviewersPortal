'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

interface Proposal {
  proposalId: string;
  proposalTitle: string;
  reviewerName: string;
  projectCategory: string;
  teamSize: string;
  budgetEstimate: string;
  timelineWeeks: string;
  proposalSummary: string;
  technicalApproach: string;
  submissionDate: string;
  votingDeadline: string;
  status: 'active' | 'expired' | 'completed';
  totalUpvotes: number;
  totalDownvotes: number;
  netScore: number;
  voterCount: number;
  userVote?: 'upvote' | 'downvote' | null;
}

interface VoteResponse {
  success: boolean;
  message: string;
  proposal?: Proposal;
}

export default function VoteProposalsPage() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingLoading, setVotingLoading] = useState<string | null>(null);
  const [expandedProposals, setExpandedProposals] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'deadline'>('newest');

  useEffect(() => {
    if (user) {
      fetchProposals();
      
      // Set up auto-refresh every 30 seconds for real-time updates
      const interval = setInterval(() => {
        fetchProposals();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user]);
  
  // Add visibility change listener to refresh when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchProposals();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const url = user ? `/api/voting/proposals?userId=${user.id}` : '/api/voting/proposals';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setProposals(data.proposals);
      } else {
        console.error('Failed to fetch proposals:', data.message);
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId: string, voteType: 'upvote' | 'downvote') => {
    if (!user) return;
    
    setVotingLoading(proposalId);
    
    try {
      const response = await fetch('/api/voting/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposalId,
          voteType,
          userId: user.id,
          username: user.username
        }),
      });
      
      const data: VoteResponse = await response.json();
      
      if (data.success) {
        // Refresh all proposals to get latest vote counts
        await fetchProposals();
      } else {
        alert(data.message || 'Failed to submit vote');
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error submitting vote. Please try again.');
    } finally {
      setVotingLoading(null);
    }
  };

  // Countdown Timer Component
  const ExpandableText = ({ text, maxLength = 200, proposalId, field }: { 
    text: string; 
    maxLength?: number; 
    proposalId: string; 
    field: string; 
  }) => {
    const expandKey = `${proposalId}-${field}`;
    const isExpanded = expandedProposals.has(expandKey);
    const shouldTruncate = text.length > maxLength;
    
    const toggleExpanded = () => {
      const newExpanded = new Set(expandedProposals);
      if (isExpanded) {
        newExpanded.delete(expandKey);
      } else {
        newExpanded.add(expandKey);
      }
      setExpandedProposals(newExpanded);
    };
    
    if (!shouldTruncate) {
      return <p className="text-[#9D9FA9] font-montserrat">{text}</p>;
    }
    
    return (
      <div className="max-w-full">
        <p className="text-[#9D9FA9] font-montserrat break-words whitespace-pre-wrap overflow-wrap-anywhere">
          {isExpanded ? text : `${text.slice(0, maxLength)}...`}
        </p>
        <button
          onClick={toggleExpanded}
          className="mt-2 text-purple-400 hover:text-purple-300 font-montserrat text-sm font-medium transition-colors"
        >
          {isExpanded ? '📖 Read less' : '📚 Read more'}
        </button>
      </div>
    );
  };

  const CountdownTimer = ({ deadline, proposalId, status }: { deadline: string; proposalId: string; status: string }) => {
    const [timeLeft, setTimeLeft] = useState<{
      days: number;
      hours: number;
      minutes: number;
      seconds: number;
      expired: boolean;
    }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

    useEffect(() => {
      // Debug logging
      console.log(`CountdownTimer for ${proposalId}: status="${status}", deadline="${deadline}"`);
      
      // If proposal status is already expired, set to expired state and don't start timer
      if (status === 'expired') {
        console.log(`Setting ${proposalId} to expired state`);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return; // Don't start any timer for expired proposals
      }

      const calculateTimeLeft = () => {
        const now = new Date().getTime();
        const deadlineDate = new Date(deadline).getTime();
        const diff = deadlineDate - now;

        if (diff <= 0) {
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds, expired: false });
      };

      // Only start timer for active proposals
      calculateTimeLeft();
      const timer = setInterval(calculateTimeLeft, 1000);

      return () => clearInterval(timer);
    }, [deadline, status]);

    // Show countdown format with 0000 for expired proposals
    if (timeLeft.expired || status === 'expired') {
       return (
         <div className="bg-gradient-to-r from-red-600/20 to-red-800/20 border border-red-500/50 rounded-lg p-4">
           <div className="text-center">
             <div className="text-red-400 font-bold text-sm font-montserrat mb-2">⏰ VOTING ENDED</div>
             <div className="flex justify-center gap-2 text-center">
               <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px] opacity-50">
                 <div className="text-2xl font-bold text-red-400 font-montserrat">00</div>
                 <div className="text-xs text-[#9D9FA9] font-montserrat">DAYS</div>
               </div>
               <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px] opacity-50">
                 <div className="text-2xl font-bold text-red-400 font-montserrat">00</div>
                 <div className="text-xs text-[#9D9FA9] font-montserrat">HOURS</div>
               </div>
               <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px] opacity-50">
                 <div className="text-2xl font-bold text-red-400 font-montserrat">00</div>
                 <div className="text-xs text-[#9D9FA9] font-montserrat">MINS</div>
               </div>
               <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px] opacity-50">
                 <div className="text-2xl font-bold text-red-400 font-montserrat">00</div>
                 <div className="text-xs text-[#9D9FA9] font-montserrat">SECS</div>
               </div>
             </div>
             <div className="text-red-300 text-sm font-montserrat mt-2">
               This proposal is no longer accepting votes
             </div>
           </div>
         </div>
       );
     }

    return (
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/50 rounded-lg p-4">
        <div className="text-center">
          <div className="text-white font-bold text-sm font-montserrat mb-2">⏰ TIME REMAINING</div>
          <div className="flex justify-center gap-2 text-center">
            {timeLeft.days > 0 && (
              <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px]">
                <div className="text-2xl font-bold text-white font-montserrat">{timeLeft.days}</div>
                <div className="text-xs text-[#9D9FA9] font-montserrat">DAYS</div>
              </div>
            )}
            <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px]">
              <div className="text-2xl font-bold text-white font-montserrat">{timeLeft.hours.toString().padStart(2, '0')}</div>
              <div className="text-xs text-[#9D9FA9] font-montserrat">HOURS</div>
            </div>
            <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px]">
              <div className="text-2xl font-bold text-white font-montserrat">{timeLeft.minutes.toString().padStart(2, '0')}</div>
              <div className="text-xs text-[#9D9FA9] font-montserrat">MINS</div>
            </div>
            <div className="bg-[#1A1A1A] rounded-lg px-3 py-2 min-w-[60px]">
              <div className={`text-2xl font-bold font-montserrat ${
                timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes < 5 
                  ? 'text-red-400 animate-pulse' 
                  : 'text-white'
              }`}>
                {timeLeft.seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-[#9D9FA9] font-montserrat">SECS</div>
            </div>
          </div>
          {timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes < 10 && (
            <div className="mt-2 text-orange-400 text-sm font-montserrat font-semibold animate-pulse">
              🚨 VOTING ENDS SOON!
            </div>
          )}
        </div>
      </div>
    );
  };

  const filteredProposals = proposals.filter(proposal => {
    if (filter === 'all') return true;
    return proposal.status === filter;
  });

  const sortedProposals = [...filteredProposals].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.netScore - a.netScore;
      case 'deadline':
        return new Date(a.votingDeadline).getTime() - new Date(b.votingDeadline).getTime();
      case 'newest':
      default:
        return new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime();
    }
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold font-montserrat mb-2">🗳️ Vote for Proposals</h1>
                <p className="text-[#9D9FA9] font-montserrat">
                  Review and vote on submitted proposals. Each user can cast one vote per proposal.
                </p>
              </div>

              {/* Filters and Sorting */}
              <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6 mb-6">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex gap-4">
                    <div>
                      <label className="block text-sm font-montserrat text-[#9D9FA9] mb-2">Filter by Status</label>
                      <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="bg-[#1A1A1A] border border-[#9D9FA9] rounded px-3 py-2 text-white font-montserrat"
                      >
                        <option value="all">All Proposals</option>
                        <option value="active">Active Voting</option>
                        <option value="expired">Voting Ended</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-montserrat text-[#9D9FA9] mb-2">Sort by</label>
                      <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-[#1A1A1A] border border-[#9D9FA9] rounded px-3 py-2 text-white font-montserrat"
                      >
                        <option value="newest">Newest First</option>
                        <option value="popular">Most Popular</option>
                        <option value="deadline">Deadline Soon</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={fetchProposals}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {/* Proposals List */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-[#9D9FA9] font-montserrat">Loading proposals...</p>
                </div>
              ) : sortedProposals.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#9D9FA9] font-montserrat text-lg">No proposals found for the selected filter.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sortedProposals.map((proposal) => (
                    <div key={proposal.proposalId} className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
                      {/* Proposal Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold font-montserrat text-white mb-2">
                            {proposal.proposalTitle}
                          </h3>
                          <div className="flex flex-wrap gap-4 text-sm text-[#9D9FA9] font-montserrat">
                            <span>👤 {proposal.reviewerName}</span>
                            <span>📂 {proposal.projectCategory}</span>
                            <span>👥 {proposal.teamSize} members</span>
                            <span>💰 ${proposal.budgetEstimate}</span>
                            <span>⏱️ {proposal.timelineWeeks} weeks</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`px-3 py-1 rounded text-sm font-montserrat ${
                            proposal.status === 'active' ? 'bg-green-600' :
                            proposal.status === 'expired' ? 'bg-red-600' : 'bg-gray-600'
                          }`}>
                            {proposal.status === 'active' ? '🟢 Active' :
                             proposal.status === 'expired' ? '🔴 Expired' : '⚪ Completed'}
                          </div>
                        </div>
                      </div>

                      {/* Countdown Timer - Prominent Display */}
                      <div className="mb-4">
                        <CountdownTimer deadline={proposal.votingDeadline} proposalId={proposal.proposalId} status={proposal.status} />
                      </div>

                      {/* Proposal Content */}
                      <div className="mb-4">
                        <h4 className="font-semibold font-montserrat text-white mb-2">Summary:</h4>
                        <div className="mb-3">
                          <ExpandableText 
                            text={proposal.proposalSummary} 
                            maxLength={200} 
                            proposalId={proposal.proposalId} 
                            field="summary" 
                          />
                        </div>
                        
                        <h4 className="font-semibold font-montserrat text-white mb-2">Technical Approach:</h4>
                        <ExpandableText 
                          text={proposal.technicalApproach} 
                          maxLength={200} 
                          proposalId={proposal.proposalId} 
                          field="technical" 
                        />
                      </div>

                      {/* Voting Section */}
                      <div className="flex items-center justify-between pt-4 border-t border-[#9D9FA9]">
                        <div className="flex items-center gap-6">
                          {/* Vote Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleVote(proposal.proposalId, 'upvote')}
                              disabled={proposal.status !== 'active' || votingLoading === proposal.proposalId || proposal.userVote !== null}
                              className={`flex items-center gap-1 px-3 py-2 rounded font-montserrat transition-colors ${
                                proposal.userVote === 'upvote' 
                                  ? 'bg-green-600 text-white' 
                                  : proposal.userVote !== null
                                  ? 'bg-[#1A1A1A] text-[#9D9FA9] opacity-50 cursor-not-allowed'
                                  : 'bg-[#1A1A1A] text-[#9D9FA9] hover:bg-green-600 hover:text-white'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={proposal.userVote !== null ? 'You have already voted on this proposal' : ''}
                            >
                              👍 {proposal.totalUpvotes}
                            </button>
                            <button
                              onClick={() => handleVote(proposal.proposalId, 'downvote')}
                              disabled={proposal.status !== 'active' || votingLoading === proposal.proposalId || proposal.userVote !== null}
                              className={`flex items-center gap-1 px-3 py-2 rounded font-montserrat transition-colors ${
                                proposal.userVote === 'downvote' 
                                  ? 'bg-red-600 text-white' 
                                  : proposal.userVote !== null
                                  ? 'bg-[#1A1A1A] text-[#9D9FA9] opacity-50 cursor-not-allowed'
                                  : 'bg-[#1A1A1A] text-[#9D9FA9] hover:bg-red-600 hover:text-white'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={proposal.userVote !== null ? 'You have already voted on this proposal' : ''}
                            >
                              👎 {proposal.totalDownvotes}
                            </button>
                          </div>

                          {/* Vote Stats */}
                          <div className="flex items-center gap-4 text-sm font-montserrat">
                            <span className={`font-semibold ${
                              proposal.netScore > 0 ? 'text-green-400' :
                              proposal.netScore < 0 ? 'text-red-400' : 'text-[#9D9FA9]'
                            }`}>
                              Net Score: {proposal.netScore > 0 ? '+' : ''}{proposal.netScore}
                            </span>
                            <span className="text-[#9D9FA9]">
                              Total Voters: {proposal.voterCount}
                            </span>
                            {/* User Vote Status */}
                            {proposal.userVote && (
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                proposal.userVote === 'upvote' 
                                  ? 'bg-green-600/20 text-green-400 border border-green-600/30' 
                                  : 'bg-red-600/20 text-red-400 border border-red-600/30'
                              }`}>
                                You voted: {proposal.userVote === 'upvote' ? '👍 Up' : '👎 Down'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Loading Indicator */}
                        {votingLoading === proposal.proposalId && (
                          <div className="flex items-center gap-2 text-[#9D9FA9] font-montserrat">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                            <span>Submitting vote...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}