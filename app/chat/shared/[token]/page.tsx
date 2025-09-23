'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ChatComponent from '../../../components/chat/ChatComponent';

interface SessionInfo {
  sessionId: string;
  assignmentId: string;
  teamId: string;
  reviewerId: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  teamInfo?: {
    id: string;
    name: string;
    description: string;
  };
  reviewerInfo?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function SharedChatPage() {
  const params = useParams();
  const token = params.token as string;
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'team' | 'reviewer' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/chat/share?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to validate share token');
      }

      setSessionInfo(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelection = (role: 'team' | 'reviewer') => {
    setUserRole(role);
    if (role === 'team' && sessionInfo) {
      setUserId(sessionInfo.teamId);
    } else if (role === 'reviewer' && sessionInfo) {
      setUserId(sessionInfo.reviewerId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating chat link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="text-sm text-gray-500">
            <p>This could happen if:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>The link has expired</li>
              <li>The link is invalid</li>
              <li>The chat session is no longer active</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No session information available</p>
        </div>
      </div>
    );
  }

  if (!userRole || !userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Chat Session</h1>
            <p className="text-gray-600">Please select your role to continue</p>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Session Information</h3>
              <div className="text-sm text-blue-800 space-y-1">
                {sessionInfo.teamInfo && (
                  <p><strong>Team:</strong> {sessionInfo.teamInfo.name}</p>
                )}
                <p><strong>Reviewer:</strong> Review Circle Reviewer</p>
                <p><strong>Created:</strong> {new Date(sessionInfo.createdAt).toLocaleDateString()}</p>
                <p><strong>Expires:</strong> {new Date(sessionInfo.expiresAt).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handleRoleSelection('team')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Join as Team Member
                {sessionInfo.teamInfo && (
                  <div className="text-sm opacity-90 mt-1">
                    {sessionInfo.teamInfo.name}
                  </div>
                )}
              </button>
              
              <button
                onClick={() => handleRoleSelection('reviewer')}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Join as Reviewer
                <div className="text-sm opacity-90 mt-1">
                  Review Circle Reviewer
                </div>
              </button>
            </div>
          </div>
          
          <div className="mt-6 text-xs text-gray-500 text-center">
            <p>This is a secure chat session between the awarded team and their assigned reviewer.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Awarded Teams Connect - Chat Session
            </h1>
            <p className="text-sm text-gray-600">
              {userRole === 'team' ? (
                sessionInfo.teamInfo ? `Team: ${sessionInfo.teamInfo.name}` : 'Team Member'
              ) : (
                'Review Circle Reviewer'
              )}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            <p>Expires: {new Date(sessionInfo.expiresAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-120px)]">
          <ChatComponent
            sessionId={sessionInfo.sessionId}
            userId={userId}
            userRole={userRole}
            isAnonymized={userRole === 'reviewer'}
          />
        </div>
      </div>
    </div>
  );
}