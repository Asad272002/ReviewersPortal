'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TeamReviewerAssignment } from '../types/awarded-teams';
import ChatComponent from './chat/ChatComponent';

export default function UnifiedReviewerDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<TeamReviewerAssignment[]>([]);
  const [teamAssignment, setTeamAssignment] = useState<TeamReviewerAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assignments' | 'team-connection'>('assignments');

  useEffect(() => {
    if (user?.id) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/awarded-teams');
      
      if (response.ok) {
        const data = await response.json();
        
        // Fetch reviewer assignments (when user is a reviewer)
        const reviewerAssignments = data.data.assignments?.filter(
          (assignment: TeamReviewerAssignment) => {
            const reviewer = data.data.reviewers?.find(
              (rev: any) => rev.userID === user?.id
            );
            return reviewer && assignment.reviewerId === reviewer.id;
          }
        ) || [];
        
        // Enrich assignments with team information
        const enrichedAssignments = reviewerAssignments.map((assignment: TeamReviewerAssignment) => {
          const team = data.data.awardedTeams?.find(
            (team: any) => team.id === assignment.teamId
          );
          return {
            ...assignment,
            teamInfo: team
          };
        });
        
        setAssignments(enrichedAssignments);
        
        // Check for team leader assignment (when user is a team leader)
        const userTeam = data.data.awardedTeams?.find(
          (team: any) => team.teamLeaderUsername === user?.username
        );
        
        if (userTeam) {
          const activeAssignment = data.data.assignments?.find(
            (assignment: TeamReviewerAssignment) => 
              assignment.teamId === userTeam.id && 
              (assignment.status === 'approved' || assignment.status === 'active')
          );
          
          setTeamAssignment(activeAssignment || null);
        }
        
        // Set default tab based on available data
        if (enrichedAssignments.length > 0) {
          setActiveTab('assignments');
        } else if (userTeam) {
          setActiveTab('team-connection');
        }
        
      } else {
        throw new Error('Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load dashboard information');
    } finally {
      setIsLoading(false);
    }
  };

  const startChatSession = async () => {
    if (!teamAssignment) return;
    
    try {
      setError(null);
      
      // Check if there's already an active session
      const sessionsResponse = await fetch('/api/chat/sessions');
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        const existingSession = sessionsData.sessions?.find(
          (session: any) => 
            session.assignmentId === teamAssignment.id && 
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
          assignmentId: teamAssignment.id,
          teamId: teamAssignment.teamId,
          reviewerId: teamAssignment.reviewerId
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
      console.error('Error starting chat:', error);
      setError('Failed to start chat session');
    }
  };

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

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="p-8 bg-[#2A1A4A] rounded-lg border border-[#9D9FA9] animate-pulse">
          <div className="h-6 bg-[#9D9FA9] rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-[#9D9FA9] rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-[#9D9FA9] rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="p-8 bg-red-900/20 rounded-lg border border-red-500/30">
          <h2 className="font-montserrat font-bold text-xl text-red-400 mb-4">
            Error Loading Dashboard
          </h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchAllData}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hasAssignments = assignments.length > 0;
  const hasTeamConnection = teamAssignment !== null;

  if (!hasAssignments && !hasTeamConnection) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="p-8 bg-[#2A1A4A] rounded-lg border border-[#9D9FA9]">
          <h2 className="font-montserrat font-bold text-2xl text-white mb-4">
            Reviewer Dashboard
          </h2>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="font-montserrat font-semibold text-xl text-white mb-2">
              No Active Assignments
            </h3>
            <p className="text-gray-300 mb-6">
              You don't have any active reviewer assignments or team connections at the moment.
            </p>
            <button
              onClick={fetchAllData}
              className="px-6 py-3 bg-[#9D9FA9] hover:bg-[#8A8C96] text-[#2A1A4A] font-semibold rounded-lg transition-colors"
            >
              Refresh Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Tab Navigation */}
      {hasAssignments && hasTeamConnection && (
        <div className="mb-6">
          <div className="flex space-x-1 bg-[#2A1A4A] p-1 rounded-lg border border-[#9D9FA9]">
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'assignments'
                  ? 'bg-[#9D9FA9] text-[#2A1A4A]'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              My Review Assignments
            </button>
            <button
              onClick={() => setActiveTab('team-connection')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'team-connection'
                  ? 'bg-[#9D9FA9] text-[#2A1A4A]'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Team Connection
            </button>
          </div>
        </div>
      )}

      {/* Reviewer Assignments Tab */}
      {(activeTab === 'assignments' || !hasTeamConnection) && hasAssignments && (
        <div className="space-y-6">
          <div className="bg-[#2A1A4A] rounded-lg border border-[#9D9FA9] p-6">
            <h2 className="font-montserrat font-bold text-2xl text-white mb-6">
              My Review Assignments
            </h2>
            
            <div className="space-y-4">
              {assignments.map((assignment, index) => (
                <div
                  key={assignment.id || index}
                  className="bg-[#1A0F2E] rounded-lg border border-[#9D9FA9]/30 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-montserrat font-semibold text-xl text-white mb-2">
                        {assignment.teamInfo?.teamName || 'Unknown Team'}
                      </h3>
                      <p className="text-gray-300 mb-2">
                        <strong>Team Leader:</strong> {assignment.teamInfo?.teamLeaderName || 'N/A'}
                      </p>
                      <p className="text-gray-300">
                        <strong>Project:</strong> {assignment.teamInfo?.projectTitle || 'N/A'}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(assignment.status)}`}>
                      {getStatusIcon(assignment.status)} {assignment.status?.toUpperCase()}
                    </div>
                  </div>
                  
                  {assignment.teamInfo?.projectDescription && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-white mb-2">Project Description:</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {assignment.teamInfo.projectDescription}
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Assignment Date:</span>
                      <span className="text-white ml-2">
                        {assignment.assignedDate ? new Date(assignment.assignedDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Last Updated:</span>
                      <span className="text-white ml-2">
                        {assignment.lastUpdated ? new Date(assignment.lastUpdated).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Team Connection Tab */}
      {(activeTab === 'team-connection' || !hasAssignments) && hasTeamConnection && (
        <div className="space-y-6">
          <div className="bg-[#2A1A4A] rounded-lg border border-[#9D9FA9] p-6">
            <h2 className="font-montserrat font-bold text-2xl text-white mb-6">
              Team Connection
            </h2>
            
            {teamAssignment ? (
              <div className="space-y-6">
                <div className="bg-[#1A0F2E] rounded-lg border border-[#9D9FA9]/30 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-montserrat font-semibold text-xl text-white">
                      Reviewer Assignment Status
                    </h3>
                    <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(teamAssignment.status)}`}>
                      {getStatusIcon(teamAssignment.status)} {teamAssignment.status?.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-gray-300">
                    <p><strong>Assignment ID:</strong> {teamAssignment.id}</p>
                    <p><strong>Team ID:</strong> {teamAssignment.teamId}</p>
                    <p><strong>Reviewer ID:</strong> {teamAssignment.reviewerId}</p>
                    {teamAssignment.assignedDate && (
                      <p><strong>Assigned Date:</strong> {new Date(teamAssignment.assignedDate).toLocaleDateString()}</p>
                    )}
                  </div>
                  
                  {teamAssignment.status === 'approved' && (
                    <div className="mt-6">
                      <button
                        onClick={startChatSession}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        Start Chat with Reviewer
                      </button>
                    </div>
                  )}
                </div>
                
                {showChat && chatSessionId && (
                  <div className="bg-[#1A0F2E] rounded-lg border border-[#9D9FA9]/30 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-montserrat font-semibold text-xl text-white">
                        Chat with Reviewer
                      </h3>
                      <button
                        onClick={() => setShowChat(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    <ChatComponent sessionId={chatSessionId} />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="font-montserrat font-semibold text-xl text-white mb-2">
                  No Active Team Assignment
                </h3>
                <p className="text-gray-300">
                  This dashboard will update with reviewer information once your team is assigned a reviewer.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}