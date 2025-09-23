'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ChatComponent from './chat/ChatComponent';
import { TeamReviewerAssignment } from '../types/awarded-teams';

export default function AwardedTeamsConnect() {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<TeamReviewerAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      checkAssignment();
    }
  }, [user]);

  const checkAssignment = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if user has an active assignment by finding their team first
      const response = await fetch('/api/admin/awarded-teams');
      
      if (response.ok) {
        const data = await response.json();
        
        // Find the team where this user is the team leader (by username)
        const userTeam = data.data.awardedTeams?.find(
          (team: any) => team.teamLeaderUsername === user?.username
        );
        
        if (userTeam) {
          // Find active assignment for this team
          const activeAssignment = data.data.assignments?.find(
            (assignment: TeamReviewerAssignment) => 
              assignment.teamId === userTeam.id && 
              (assignment.status === 'approved' || assignment.status === 'active')
          );
          
          setAssignment(activeAssignment || null);
        } else {
          setAssignment(null);
        }
      } else if (response.status !== 404) {
        throw new Error('Failed to check assignment status');
      }
    } catch (error) {
      console.error('Error checking assignment:', error);
      setError('Failed to load connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const startChatSession = async () => {
    if (!assignment) return;
    
    try {
      setError(null);
      
      // Check if there's already an active session
      const sessionsResponse = await fetch('/api/chat/sessions');
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        const existingSession = sessionsData.sessions?.find(
          (session: any) => 
            session.assignmentId === assignment.id && 
            session.status === 'active'
        );
        
        if (existingSession) {
          setChatSessionId(existingSession.id);
          setShowChat(true);
          return;
        }
      }
      
      // Create new chat session
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignmentId: assignment.id,
          teamId: assignment.teamId,
          reviewerId: assignment.reviewerId
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setChatSessionId(data.sessionId);
        setShowChat(true);
      } else {
        throw new Error('Failed to start chat session');
      }
    } catch (error) {
      console.error('Error starting chat session:', error);
      setError('Failed to start chat session. Please try again.');
    }
  };

  const closeChat = () => {
    setShowChat(false);
    setChatSessionId(null);
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-[#2A1A4A] rounded-lg border border-[#9D9FA9] animate-pulse">
        <div className="h-4 bg-[#9D9FA9] rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-[#9D9FA9] rounded w-1/2"></div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="font-montserrat font-bold text-3xl text-white text-center mb-2">
            Team Dashboard
          </h1>
          <p className="font-montserrat text-gray-300 text-center">
            Manage your reviewer connection and communication
          </p>
        </div>

        {/* No Assignment Message */}
        <div className="bg-[#2A1A4A] rounded-xl border border-[#9D9FA9] overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-[#9050E9] to-[#A96AFF] px-6 py-4">
            <h2 className="font-montserrat font-semibold text-lg text-white text-center flex items-center justify-center">
              <span className="mr-2">📋</span>
              Assignment Status
            </h2>
          </div>
          
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#7C3AED] to-[#A855F7] rounded-full mb-6 shadow-lg">
              <span className="text-3xl">⏳</span>
            </div>
            
            <h3 className="font-montserrat font-semibold text-2xl text-white mb-4">
              No Reviewer Assignment Yet
            </h3>
            
            <p className="font-montserrat text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
              Your team hasn't been assigned a reviewer yet. Once an admin assigns a reviewer to your team, 
              you'll be able to see their information and start communicating through this dashboard.
            </p>
            
            <div className="bg-[#1A0A3A] rounded-lg p-6 border border-[#9D9FA9]/30 max-w-md mx-auto">
              <div className="flex items-center justify-center mb-3">
                <span className="text-blue-400 mr-2">ℹ️</span>
                <span className="font-montserrat font-medium text-white">What happens next?</span>
              </div>
              <ul className="text-sm text-gray-300 space-y-2 text-left">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2 mt-0.5">•</span>
                  <span>Admin will assign a qualified reviewer to your team</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2 mt-0.5">•</span>
                  <span>You'll receive notification when assignment is complete</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2 mt-0.5">•</span>
                  <span>This dashboard will update with reviewer information</span>
                </li>
              </ul>
            </div>
            
            <button
              onClick={checkAssignment}
              disabled={isLoading}
              className="mt-6 bg-gradient-to-r from-[#9050E9] to-[#A96AFF] hover:from-[#A96AFF] hover:to-[#B47AFF] disabled:from-[#9D9FA9] disabled:to-[#9D9FA9] disabled:cursor-not-allowed text-white font-montserrat font-semibold py-3 px-8 rounded-lg transition-all duration-300 flex items-center justify-center mx-auto shadow-lg"
            >
              {isLoading ? (
                <>
                  <span className="mr-2">⏳</span>
                  Checking...
                </>
              ) : (
                <>
                  <span className="mr-2">🔄</span>
                  Check for Updates
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showChat && chatSessionId) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-4xl h-[600px] bg-[#0C021E] rounded-lg border border-[#9D9FA9] overflow-hidden">
          <ChatComponent
            sessionId={chatSessionId}
            userId={user?.id || ''}
            userRole="team"
            isAnonymized={true}
            onClose={closeChat}
          />
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'revoked':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return '✅';
      case 'pending':
        return '⏳';
      case 'revoked':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved - Ready to Connect';
      case 'active':
        return 'Active Connection';
      case 'pending':
        return 'Pending Admin Approval';
      case 'revoked':
        return 'Connection Revoked';
      default:
        return 'Unknown Status';
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-montserrat font-bold text-3xl text-white text-center mb-2">
          Team Dashboard
        </h1>
        <p className="font-montserrat text-gray-300 text-center">
          Manage your reviewer connection and communication
        </p>
      </div>

      {/* Clean Table Format */}
      <div className="bg-[#2A1A4A] rounded-xl border border-[#9D9FA9] overflow-hidden shadow-2xl">
        {/* Table Header */}
        <div className="bg-gradient-to-r from-[#9050E9] to-[#A96AFF] px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <h2 className="font-montserrat font-semibold text-lg text-white flex items-center justify-center">
                <span className="mr-2">👤</span>
                Assigned Reviewer
              </h2>
            </div>
            <div className="text-center">
              <h2 className="font-montserrat font-semibold text-lg text-white flex items-center justify-center">
                <span className="mr-2">💬</span>
                Chat with Reviewer
              </h2>
            </div>
            <div className="text-center">
              <h2 className="font-montserrat font-semibold text-lg text-white flex items-center justify-center">
                <span className="mr-2">📋</span>
                Status of Approval
              </h2>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Assigned Reviewer Column */}
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#9050E9] to-[#A96AFF] rounded-full mb-3 shadow-lg">
                  <span className="text-2xl text-white font-bold">R</span>
                </div>
                <h3 className="font-montserrat font-medium text-xl text-white mb-2">
                  Review Circle Reviewer
                </h3>
                <p className="font-montserrat text-gray-300 text-sm">
                  Anonymized Expert Reviewer
                </p>
              </div>
              
              <div className="bg-[#1A0A3A] rounded-lg p-3 border border-[#9D9FA9]/30">
                <div className="text-xs text-[#9D9FA9] mb-1">Assigned Date</div>
                <div className="text-sm text-white font-medium">
                  {new Date(assignment.assignedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>

            {/* Chat with Reviewer Column */}
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#7C3AED] to-[#A855F7] rounded-full mb-3 shadow-lg">
                  <span className="text-2xl">💭</span>
                </div>
                <p className="font-montserrat text-gray-300 text-sm mb-4">
                  Direct communication with your reviewer
                </p>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-400/10 border border-red-400/30 rounded-lg">
                  <div className="text-sm text-red-400 flex items-center justify-center">
                    <span className="mr-2">⚠️</span>
                    {error}
                  </div>
                </div>
              )}
              
              <button
                onClick={startChatSession}
                disabled={assignment.status !== 'approved' && assignment.status !== 'active'}
                className="w-full bg-gradient-to-r from-[#9050E9] to-[#A96AFF] hover:from-[#A96AFF] hover:to-[#B47AFF] disabled:from-[#9D9FA9] disabled:to-[#9D9FA9] disabled:cursor-not-allowed text-white font-montserrat font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center shadow-lg"
              >
                {assignment.status === 'pending' ? (
                  <>
                    <span className="mr-2">⏳</span>
                    Waiting for Approval
                  </>
                ) : assignment.status === 'revoked' ? (
                  <>
                    <span className="mr-2">🚫</span>
                    Chat Unavailable
                  </>
                ) : (
                  <>
                    <span className="mr-2">🚀</span>
                    Go to Chat
                  </>
                )}
              </button>
            </div>

            {/* Status of Approval Column */}
            <div className="text-center">
              <div className="mb-4">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 shadow-lg border-2 ${getStatusColor(assignment.status)}`}>
                  <span className="text-2xl">{getStatusIcon(assignment.status)}</span>
                </div>
                <h3 className="font-montserrat font-medium text-lg text-white mb-2">
                  {getStatusText(assignment.status)}
                </h3>
                <p className="font-montserrat text-gray-300 text-sm mb-4">
                  {assignment.status === 'pending' && 'Under admin review'}
                  {assignment.status === 'approved' && 'Ready to connect'}
                  {assignment.status === 'active' && 'Connection active'}
                  {assignment.status === 'revoked' && 'Connection revoked'}
                </p>
              </div>
              
              <div className={`p-3 rounded-lg border-2 ${getStatusColor(assignment.status)}`}>
                <div className="text-xs text-gray-400 mb-1">Current Status</div>
                <div className="text-lg font-semibold capitalize flex items-center justify-center">
                  <span className="mr-2">{getStatusIcon(assignment.status)}</span>
                  {assignment.status}
                </div>
              </div>
              
              {assignment.approvedAt && (
                <div className="mt-3 bg-[#1A0A3A] rounded-lg p-3 border border-[#9D9FA9]/30">
                  <div className="text-xs text-[#9D9FA9] mb-1">Approved On</div>
                  <div className="text-sm text-green-400 font-medium">
                    {new Date(assignment.approvedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              )}
              
              {assignment.revokedAt && (
                <div className="mt-3 bg-[#1A0A3A] rounded-lg p-3 border border-[#9D9FA9]/30">
                  <div className="text-xs text-[#9D9FA9] mb-1">Revoked On</div>
                  <div className="text-sm text-red-400 font-medium">
                    {new Date(assignment.revokedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Information Footer */}
      <div className="mt-6 bg-[#1A0A3A] rounded-xl border border-[#9D9FA9] p-6">
        <div className="text-center">
          <h3 className="font-montserrat font-semibold text-lg text-white mb-3 flex items-center justify-center">
            <span className="mr-2">ℹ️</span>
            Important Notes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="flex items-center justify-center">
              <span className="mr-2 text-blue-400">•</span>
              <span>All reviewer communications are anonymized</span>
            </div>
            <div className="flex items-center justify-center">
              <span className="mr-2 text-blue-400">•</span>
              <span>Status updates are managed by admin team</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}