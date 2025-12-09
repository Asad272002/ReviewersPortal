import { useState, useEffect, useCallback } from 'react';
import { wsService } from '@/lib/websocket-service';

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
  status: 'active' | 'expired';
  totalUpvotes: number;
  totalDownvotes: number;
  netScore: number;
  voterCount: number;
  userVote: 'upvote' | 'downvote' | null;
}

export function useRealTimeProposals(userId?: string) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  // Fetch proposals from API
  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true);
      const url = userId ? `/api/voting/proposals?userId=${userId}` : '/api/voting/proposals';
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setProposals(data.proposals);
        
        if (data.cached) {
          console.log('📦 Proposals loaded from cache');
        } else {
          console.log('🔄 Proposals loaded from Google Sheets');
        }
      } else {
        console.error('Failed to fetch proposals:', data.message);
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Handle real-time updates
  useEffect(() => {
    // Initial fetch
    fetchProposals();

    // Set up WebSocket connection for real-time updates
    const connectWebSocket = async () => {
      try {
        await wsService.connect();
        setConnected(true);

        // Listen for new proposals
        wsService.on('proposal:new', (newProposal: Proposal) => {
          console.log('📝 New proposal received:', newProposal.proposalTitle);
          setProposals(prev => [newProposal, ...prev]);
        });

        // Listen for vote updates
        wsService.on('vote:update', (updatedProposal: Proposal) => {
          console.log('🗳️ Vote update received for:', updatedProposal.proposalTitle);
          setProposals(prev => 
            prev.map(p => 
              p.proposalId === updatedProposal.proposalId ? updatedProposal : p
            )
          );
        });

        // Listen for proposal status changes
        wsService.on('proposal:status', (statusUpdate: { proposalId: string; status: 'active' | 'expired' }) => {
          console.log('📊 Status update received for:', statusUpdate.proposalId);
          setProposals(prev => 
            prev.map(p => 
              p.proposalId === statusUpdate.proposalId 
                ? { ...p, status: statusUpdate.status }
                : p
            )
          );
        });

      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setConnected(false);
      }
    };

    // Try to connect WebSocket (fallback to polling if it fails)
    connectWebSocket();

    // Fallback: Set up polling every 2 minutes if WebSocket is not available
    const pollInterval = setInterval(() => {
      if (!connected) {
        fetchProposals();
      }
    }, 2 * 60 * 1000);

    // Cleanup
    return () => {
      clearInterval(pollInterval);
      wsService.disconnect();
      setConnected(false);
    };
  }, [fetchProposals, connected]);

  // Manual refresh function
  const refreshProposals = useCallback(() => {
    fetchProposals();
  }, [fetchProposals]);

  return {
    proposals,
    loading,
    connected,
    refreshProposals
  };
}