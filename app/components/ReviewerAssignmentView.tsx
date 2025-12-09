'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TeamReviewerAssignment } from '../types/awarded-teams';
import ChatComponent from './chat/ChatComponent';

export default function ReviewerAssignmentView() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<TeamReviewerAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [reviewerIdForChat, setReviewerIdForChat] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchReviewerAssignments();
    }
  }, [user]);

  const fetchReviewerAssignments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/awarded-teams');
      
      if (response.ok) {
        const data = await response.json();
        
        // Find assignments where this user is the reviewer
        const reviewerAssignments = data.data.assignments?.filter(
          (assignment: TeamReviewerAssignment) => {
            // Find the reviewer record that matches this user
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
      } else {
        throw new Error('Failed to fetch assignments');
      }
    } catch (error) {
      console.error('Error fetching reviewer assignments:', error);
      setError('Failed to load assignment information');
    } finally {
      setIsLoading(false);
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

  const openChatForAssignment = async (assignment: TeamReviewerAssignment) => {
    try {
      setError(null);
      const sessionsResponse = await fetch(`/api/chat/sessions?userId=${encodeURIComponent(assignment.reviewerId)}&userRole=reviewer`);
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        const sessions = sessionsData?.data || [];
        const existingSession = sessions.find((s: any) => s.assignmentId === assignment.id && s.status === 'active');
        if (existingSession) {
          setChatSessionId(existingSession.id);
          setReviewerIdForChat(assignment.reviewerId);
          setShowChat(true);
          return;
        }
        setError('Chat has not been started by admin yet.');
      } else {
        setError('Unable to check chat session.');
      }
    } catch (err) {
      console.error('Error opening chat:', err);
      setError('Failed to open chat.');
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
        <div className="bg-[#2A1A4A] rounded-xl border border-red-400/30 p-8 text-center">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 className="font-montserrat font-semibold text-xl text-white mb-2">Error Loading Assignments</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchReviewerAssignments}
            className="bg-gradient-to-r from-[#9050E9] to-[#A96AFF] hover:from-[#A96AFF] hover:to-[#B47AFF] text-white font-montserrat font-semibold py-2 px-6 rounded-lg transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="font-montserrat font-bold text-3xl text-white text-center mb-2">
            Reviewer Dashboard
          </h1>
          <p className="font-montserrat text-gray-300 text-center">
            Your team assignment information
          </p>
        </div>

        <div className="bg-[#2A1A4A] rounded-xl border border-[#9D9FA9] overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-[#9050E9] to-[#A96AFF] px-6 py-4">
            <h2 className="font-montserrat font-semibold text-lg text-white text-center flex items-center justify-center">
              <span className="mr-2">📋</span>
              Assignment Status
            </h2>
          </div>
          
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#7C3AED] to-[#A855F7] rounded-full mb-6 shadow-lg">
              <span className="text-3xl">📝</span>
            </div>
            
            <h3 className="font-montserrat font-semibold text-2xl text-white mb-4">
              No Team Assignments Yet
            </h3>
            
            <p className="font-montserrat text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
              You haven't been assigned to review any teams yet. Once an admin assigns you to a team, 
              you'll see the assignment details and be able to communicate with the team through this dashboard.
            </p>
            
            <div className="bg-[#1A0A3A] rounded-lg p-6 border border-[#9D9FA9]/30 max-w-md mx-auto">
              <div className="flex items-center justify-center mb-3">
                <span className="text-blue-400 mr-2">ℹ️</span>
                <span className="font-montserrat font-medium text-white">What happens next?</span>
              </div>
              <ul className="text-sm text-gray-300 space-y-2 text-left">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2 mt-0.5">•</span>
                  <span>Admin will assign you to review awarded teams</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2 mt-0.5">•</span>
                  <span>You'll receive notification when assignment is made</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2 mt-0.5">•</span>
                  <span>This dashboard will update with team information</span>
                </li>
              </ul>
            </div>
            
            <button
              onClick={fetchReviewerAssignments}
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

  return (
    <div className="max-w-5xl mx-auto">
      {showChat && chatSessionId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl h-[600px] bg-[#0C021E] rounded-lg border border-[#9D9FA9] overflow-hidden">
            <ChatComponent
              sessionId={chatSessionId}
              userId={reviewerIdForChat || ''}
              userRole="reviewer"
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}
      <div className="mb-8">
        <h1 className="font-montserrat font-bold text-3xl text-white text-center mb-2">
          Reviewer Dashboard
        </h1>
        <p className="font-montserrat text-gray-300 text-center">
          Your team assignments and review responsibilities
        </p>
      </div>

      <div className="space-y-6">
        {assignments.map((assignment: any) => (
          <div key={assignment.id} className="bg-[#2A1A4A] rounded-xl border border-[#9D9FA9] overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-[#9050E9] to-[#A96AFF] px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="font-montserrat font-semibold text-lg text-white flex items-center">
                  <span className="mr-2">🎯</span>
                  Assignment: {assignment.teamInfo?.teamName || 'Unknown Team'}
                </h2>
                <div className={`px-3 py-1 rounded-full border-2 ${getStatusColor(assignment.status)}`}>
                  <span className="text-sm font-medium flex items-center">
                    <span className="mr-1">{getStatusIcon(assignment.status)}</span>
                    {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-[#1A0A3A] rounded-lg p-4 border border-[#9D9FA9]/30">
                    <h3 className="font-montserrat font-medium text-white mb-2 flex items-center">
                      <span className="mr-2">👥</span>
                      Team Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Team Name:</span>
                        <span className="text-white">{assignment.teamInfo?.teamName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Proposal ID:</span>
                        <span className="text-white">{assignment.teamInfo?.proposalId || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Team Leader:</span>
                        <span className="text-white">{assignment.teamInfo?.teamLeaderName || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#1A0A3A] rounded-lg p-4 border border-[#9D9FA9]/30">
                    <h3 className="font-montserrat font-medium text-white mb-2 flex items-center">
                      <span className="mr-2">📅</span>
                      Assignment Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Assigned Date:</span>
                        <span className="text-white">
                          {new Date(assignment.assignedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      {assignment.approvedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Approved Date:</span>
                          <span className="text-green-400">
                            {new Date(assignment.approvedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-[#1A0A3A] rounded-lg p-4 border border-[#9D9FA9]/30">
                    <h3 className="font-montserrat font-medium text-white mb-3 flex items-center">
                      <span className="mr-2">💼</span>
                      Your Responsibilities
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li className="flex items-start">
                        <span className="text-blue-400 mr-2 mt-0.5">•</span>
                        <span>Review the team's proposal and progress</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-400 mr-2 mt-0.5">•</span>
                        <span>Provide constructive feedback and guidance</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-400 mr-2 mt-0.5">•</span>
                        <span>Communicate through the secure chat system</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-400 mr-2 mt-0.5">•</span>
                        <span>Maintain anonymity as per platform guidelines</span>
                      </li>
                    </ul>
                  </div>
                  
                  {assignment.notes && (
                    <div className="bg-[#1A0A3A] rounded-lg p-4 border border-[#9D9FA9]/30">
                      <h3 className="font-montserrat font-medium text-white mb-2 flex items-center">
                        <span className="mr-2">📝</span>
                        Assignment Notes
                      </h3>
                      <p className="text-sm text-gray-300">{assignment.notes}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {assignment.status === 'approved' || assignment.status === 'active' ? (
                <div className="mt-6 text-center">
                  <div className="bg-green-400/10 border border-green-400/30 rounded-lg p-4 mb-4">
                    <p className="text-green-400 font-medium flex items-center justify-center">
                      <span className="mr-2">✅</span>
                      This assignment is made to you for this awarded team
                    </p>
                    <p className="text-sm text-gray-300 mt-2">
                      You can now communicate with the team through the chat system when they initiate contact.
                    </p>
                  </div>
                  {assignment.status === 'active' && (
                    <button
                      onClick={() => openChatForAssignment(assignment)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Open Chat
                    </button>
                  )}
                </div>
              ) : assignment.status === 'pending' ? (
                <div className="mt-6 text-center">
                  <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
                    <p className="text-yellow-400 font-medium flex items-center justify-center">
                      <span className="mr-2">⏳</span>
                      This assignment is pending admin approval
                    </p>
                    <p className="text-sm text-gray-300 mt-2">
                      Please wait for the admin to approve this assignment before you can begin reviewing.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 text-center">
                  <div className="bg-red-400/10 border border-red-400/30 rounded-lg p-4">
                    <p className="text-red-400 font-medium flex items-center justify-center">
                      <span className="mr-2">❌</span>
                      This assignment has been revoked
                    </p>
                    <p className="text-sm text-gray-300 mt-2">
                      Contact the admin if you believe this is an error.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 bg-[#1A0A3A] rounded-xl border border-[#9D9FA9] p-6">
        <div className="text-center">
          <h3 className="font-montserrat font-semibold text-lg text-white mb-3 flex items-center justify-center">
            <span className="mr-2">ℹ️</span>
            Reviewer Guidelines
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="flex items-center justify-center">
              <span className="mr-2 text-blue-400">•</span>
              <span>All communications are anonymized for privacy</span>
            </div>
            <div className="flex items-center justify-center">
              <span className="mr-2 text-blue-400">•</span>
              <span>Provide constructive and professional feedback</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}