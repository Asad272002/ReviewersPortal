'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AwardedTeam, Reviewer, TeamReviewerAssignment } from '../../types/awarded-teams';
import ChatComponent from '../chat/ChatComponent';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  email: string;
  status: string;
  createdAt: string;
}

interface AwardedTeamsManagerProps {
  onBack: () => void;
  users?: User[];
}

const AwardedTeamsManager: React.FC<AwardedTeamsManagerProps> = ({ onBack, users = [] }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'teams' | 'reviewers' | 'assignments'>('teams');
  const [teams, setTeams] = useState<AwardedTeam[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [assignments, setAssignments] = useState<TeamReviewerAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [showRevokedDropdown, setShowRevokedDropdown] = useState(false);
  const [editing, setEditing] = useState<Record<string, { proposalId: string; proposalTitle: string }>>({});

  // Form states
  const [showAddTeamForm, setShowAddTeamForm] = useState(false);

  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [shareLinks, setShareLinks] = useState<{[key: string]: string}>({});
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);

  // New team form
  const [newTeam, setNewTeam] = useState({
    name: '',
    email: '',
    projectTitle: '',
    proposalId: '',
    teamLeaderName: '',
    category: '',
    awardType: '',
    teamUsername: '',
    teamPassword: ''
  });

  // New reviewer form
  const [showAddReviewerForm, setShowAddReviewerForm] = useState(false);
  const [newReviewer, setNewReviewer] = useState({
    userID: '',
    name: '',
    email: '',
    mattermostId: '',
    githubIds: '',
    cvLink: '',
    expertise: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/awarded-teams');
      const data = await response.json();
      
      if (data.success) {
        setTeams(data.data.awardedTeams || []);
        setReviewers(data.data.reviewers || []);
        setAssignments(data.data.assignments || []);
      } else {
        setError(data.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const generateShareLink = async (assignmentId: string) => {
    setGeneratingLink(assignmentId);
    setError(null);

    try {
      const response = await fetch('/api/chat/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId })
      });

      const data = await response.json();
      
      if (data.success) {
        setShareLinks(prev => ({ ...prev, [assignmentId]: data.data.shareUrl }));
        setSuccess('Share link generated successfully!');
      } else {
        setError(data.message || 'Failed to generate share link');
      }
    } catch (err) {
      setError('Failed to generate share link');
    } finally {
      setGeneratingLink(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Link copied to clipboard!');
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  const handleUserSelection = (userId: string) => {
    const selectedUser = users.find(user => user.id === userId);
    if (selectedUser) {
      setNewReviewer({
        userID: selectedUser.id,
        name: selectedUser.name,
        email: selectedUser.email,
        mattermostId: selectedUser.username,
        githubIds: '',
        cvLink: '',
        expertise: ''
      });
    }
  };

  const resetReviewerForm = () => {
    setNewReviewer({
      userID: '',
      name: '',
      email: '',
      mattermostId: '',
      githubIds: '',
      cvLink: '',
      expertise: ''
    });
    setShowAddReviewerForm(false);
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/awarded-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'team', ...newTeam })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Team added successfully!');
        setNewTeam({ name: '', email: '', projectTitle: '', proposalId: '', teamLeaderName: '', category: '', awardType: '', teamUsername: '', teamPassword: '' });
        setShowAddTeamForm(false);
        fetchData();
      } else {
        setError(data.message || 'Failed to add team');
      }
    } catch (err) {
      setError('Failed to add team');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReviewer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/awarded-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'reviewer', ...newReviewer })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Reviewer added successfully!');
        resetReviewerForm();
        fetchData();
      } else {
        setError(data.message || 'Failed to add reviewer');
      }
    } catch (err) {
      setError('Failed to add reviewer');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/awarded-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'assignment',
          teamId: selectedTeamId,
          reviewerId: selectedReviewerId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Assignment created successfully!');
        setSelectedTeamId('');
        setSelectedReviewerId('');
        setShowAssignmentForm(false);
        fetchData();
      } else {
        setError(data.message || 'Failed to create assignment');
      }
    } catch (err) {
      setError('Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentAction = async (assignmentId: string, action: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/awarded-teams/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminId: 'current-admin' })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Assignment ${action}d successfully!`);
        fetchData();
      } else {
        setError(data.message || `Failed to ${action} assignment`);
      }
    } catch (err) {
      setError(`Failed to ${action} assignment`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/awarded-teams/teams/${teamId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Team deleted successfully!');
        fetchData();
      } else {
        setError(data.message || 'Failed to delete team');
      }
    } catch (err) {
      setError('Failed to delete team');
    } finally {
      setLoading(false);
    }
  };

  const startEditTeam = (team: any) => {
    setEditing(prev => ({
      ...prev,
      [team.id]: {
        proposalId: team.proposalId || '',
        proposalTitle: team.proposalTitle || team.projectTitle || ''
      }
    }))
  }

  const cancelEditTeam = (teamId: string) => {
    setEditing(prev => {
      const next = { ...prev }
      delete next[teamId]
      return next
    })
  }

  const saveEditTeam = async (teamId: string) => {
    const data = editing[teamId]
    if (!data) return
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(`/api/admin/awarded-teams/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: data.proposalId, proposalTitle: data.proposalTitle })
      })
      const json = await resp.json()
      if (!resp.ok || !json.success) throw new Error(json.message || `HTTP ${resp.status}`)
      setSuccess('Team project details updated!')
      cancelEditTeam(teamId)
      fetchData()
    } catch (e: any) {
      setError(e?.message || 'Failed to update team')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReviewer = async (reviewerId: string) => {
    if (!confirm('Are you sure you want to delete this reviewer? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/awarded-teams/reviewers/${reviewerId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Reviewer deleted successfully!');
        fetchData();
      } else {
        setError(data.message || 'Failed to delete reviewer');
      }
    } catch (err) {
      setError('Failed to delete reviewer');
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const closeChat = () => {
    setShowChat(false);
    setChatSessionId(null);
  };

  return (
    <div className="w-full">
      {showChat && chatSessionId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl h-[600px] bg-[#0C021E] rounded-lg border border-[#9D9FA9] overflow-hidden">
            <ChatComponent
              sessionId={chatSessionId}
              userId={user?.id || ''}
              userRole="admin"
              onClose={closeChat}
            />
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-[#1A0A3A] rounded-lg border border-[#9D9FA9] p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white font-montserrat">Awarded Teams Connect</h1>
              <p className="text-[#9D9FA9] mt-2 font-montserrat">Manage awarded teams, reviewers, and their connections</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {(error || success) && (
          <div className="mb-6">
            {error && (
              <div className="bg-red-900/20 border border-red-500 text-red-300 px-4 py-3 rounded mb-4 font-montserrat">
                {error}
                <button onClick={clearMessages} className="float-right font-bold text-red-300 hover:text-red-100">×</button>
              </div>
            )}
            {success && (
              <div className="bg-green-900/20 border border-green-500 text-green-300 px-4 py-3 rounded mb-4 font-montserrat">
                {success}
                <button onClick={clearMessages} className="float-right font-bold text-green-300 hover:text-green-100">×</button>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-[#1A0A3A] rounded-lg border border-[#9D9FA9] mb-6">
          <div className="border-b border-[#9D9FA9]">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'teams', label: 'Awarded Teams', count: teams.length },
                { id: 'reviewers', label: 'Reviewers', count: reviewers.length },
                { id: 'assignments', label: 'Assignments', count: assignments.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm font-montserrat ${
                    activeTab === tab.id
                      ? 'border-[#9050E9] text-[#9050E9]'
                      : 'border-transparent text-[#9D9FA9] hover:text-white hover:border-[#9D9FA9]'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Teams Tab */}
            {activeTab === 'teams' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-white font-montserrat">Awarded Teams</h2>
                  <button
                    onClick={() => setShowAddTeamForm(true)}
                    className="px-4 py-2 bg-[#9050E9] text-white rounded-lg hover:bg-[#A96AFF] transition-colors font-montserrat"
                  >
                    + Add Team
                  </button>
                </div>

                {showAddTeamForm && (
                  <div className="bg-[#2A1A4A] border border-[#9D9FA9] p-4 rounded-lg mb-6">
                    <h3 className="text-lg font-medium mb-4 text-white font-montserrat">Add New Awarded Team</h3>
                    <form onSubmit={handleAddTeam} className="grid grid-cols-2 gap-4">
                      <input
                          type="text"
                          placeholder="Team Name"
                          value={newTeam.name}
                          onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                          className="px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat placeholder-[#9D9FA9]"
                          required
                        />
                        <input
                          type="email"
                          placeholder="Team Email"
                          value={newTeam.email}
                          onChange={(e) => setNewTeam({ ...newTeam, email: e.target.value })}
                          className="px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat placeholder-[#9D9FA9]"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Team Username"
                          value={newTeam.teamUsername}
                          onChange={(e) => setNewTeam({ ...newTeam, teamUsername: e.target.value })}
                          className="px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat placeholder-[#9D9FA9]"
                          required
                        />
                        <input
                          type="password"
                          placeholder="Team Password"
                          value={newTeam.teamPassword}
                          onChange={(e) => setNewTeam({ ...newTeam, teamPassword: e.target.value })}
                          className="px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat placeholder-[#9D9FA9]"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Project Title"
                          value={newTeam.projectTitle}
                          onChange={(e) => setNewTeam({ ...newTeam, projectTitle: e.target.value })}
                          className="px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat placeholder-[#9D9FA9]"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Proposal ID"
                          value={newTeam.proposalId}
                          onChange={(e) => setNewTeam({ ...newTeam, proposalId: e.target.value })}
                          className="px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat placeholder-[#9D9FA9]"
                        />
                        <input
                          type="text"
                          placeholder="Team Leader Name"
                          value={newTeam.teamLeaderName}
                          onChange={(e) => setNewTeam({ ...newTeam, teamLeaderName: e.target.value })}
                          className="px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat placeholder-[#9D9FA9]"
                        />
                        <input
                          type="text"
                          placeholder="Category"
                          value={newTeam.category}
                          onChange={(e) => setNewTeam({ ...newTeam, category: e.target.value })}
                          className="px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat placeholder-[#9D9FA9]"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Award Type"
                          value={newTeam.awardType}
                          onChange={(e) => setNewTeam({ ...newTeam, awardType: e.target.value })}
                          className="px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat placeholder-[#9D9FA9]"
                          required
                        />
                      <div className="flex space-x-2">
                          <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-montserrat"
                          >
                            {loading ? 'Adding...' : 'Add Team'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddTeamForm(false)}
                            className="px-4 py-2 bg-[#9D9FA9] text-white rounded-lg hover:bg-[#7D7F89] transition-colors font-montserrat"
                          >
                            Cancel
                          </button>
                        </div>
                    </form>
                  </div>
                )}

                <div className="grid gap-4">
                  {teams.map((team) => (
                    <div key={team.id} className="bg-[#2A1A4A] border border-[#9D9FA9] rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-white font-montserrat">{team.teamName || team.name}</h3>
                          <p className="text-[#9D9FA9] font-montserrat">{team.teamLeaderEmail || team.email}</p>
                          
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-[#9D9FA9] font-montserrat">
                              <strong>Project:</strong> {team.proposalTitle || team.projectTitle}
                            </p>
                            <p className="text-sm text-[#9D9FA9] font-montserrat">
                              <strong>Team Leader:</strong> {team.teamLeaderName} ({team.teamLeaderUsername})
                            </p>
                            {team.teamUsername && (
                              <p className="text-sm text-[#9D9FA9] font-montserrat">
                                <strong>Team Username:</strong> {team.teamUsername}
                              </p>
                            )}
                            <p className="text-sm text-[#9D9FA9] font-montserrat">
                              <strong>Proposal ID:</strong> {team.proposalId}
                            </p>
                            {(team.category || team.awardType) && (
                              <p className="text-sm text-[#9D9FA9] font-montserrat">
                                <strong>Category:</strong> {team.category} | <strong>Award:</strong> {team.awardType}
                              </p>
                            )}
                            {team.awardDate && (
                              <p className="text-sm text-[#9D9FA9] font-montserrat">
                                <strong>Award Date:</strong> {new Date(team.awardDate).toLocaleDateString()}
                              </p>
                            )}
                            <p className="text-xs text-[#7D7F89] font-montserrat mt-2">
                              Created: {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'N/A'}
                              {team.updatedAt && team.updatedAt !== team.createdAt && (
                                <span> | Updated: {new Date(team.updatedAt).toLocaleDateString()}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            team.status === 'active' ? 'bg-green-100 text-green-800' :
                            team.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {team.status}
                          </span>
                          <button
                            onClick={() => startEditTeam(team)}
                            className="text-[#9050E9] hover:text-[#A96AFF] transition-colors font-montserrat"
                            title="Edit project details"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2m-1 14v-4m0-6V5m-5 5h10" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            className="text-red-400 hover:text-red-300 transition-colors font-montserrat"
                            title="Delete team"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {editing[team.id] && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-[#9D9FA9] mb-1 font-montserrat">Proposal Title</label>
                            <input
                              className="w-full px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg font-montserrat"
                              value={editing[team.id].proposalTitle}
                              onChange={e => setEditing(prev => ({ ...prev, [team.id]: { ...prev[team.id], proposalTitle: e.target.value } }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[#9D9FA9] mb-1 font-montserrat">Proposal ID</label>
                            <input
                              className="w-full px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg font-montserrat"
                              value={editing[team.id].proposalId}
                              onChange={e => setEditing(prev => ({ ...prev, [team.id]: { ...prev[team.id], proposalId: e.target.value } }))}
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <button onClick={() => saveEditTeam(team.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-montserrat">Save</button>
                            <button onClick={() => cancelEditTeam(team.id)} className="px-4 py-2 bg-[#9D9FA9] text-white rounded-lg hover:bg-[#7D7F89] font-montserrat">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviewers Tab */}
            {activeTab === 'reviewers' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h2 className="text-xl font-semibold text-white font-montserrat w-full sm:w-auto">Reviewers</h2>
                  <button
                    onClick={() => setShowAddReviewerForm(!showAddReviewerForm)}
                    className="px-4 py-2 bg-[#9050E9] text-white rounded-lg hover:bg-[#7040C9] transition-colors font-montserrat w-full sm:w-auto"
                  >
                    + Add Reviewer
                  </button>
                </div>

                {showAddReviewerForm && (
                  <div className="bg-[#2A1A4A] border border-[#9D9FA9] p-4 rounded-lg mb-6">
                    <h3 className="text-lg font-medium mb-4 text-white font-montserrat">Add New Reviewer</h3>
                    <form onSubmit={handleAddReviewer} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2 font-montserrat">
                          Link with existing user (optional)
                        </label>
                        <select
                          value={newReviewer.userID}
                          onChange={(e) => handleUserSelection(e.target.value)}
                          className="w-full bg-[#1A0A3A] border border-[#9D9FA9] text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat"
                        >
                          <option value="">Select a user to link with...</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.username})
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        placeholder="Name"
                        value={newReviewer.name}
                        onChange={(e) => setNewReviewer({ ...newReviewer, name: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat placeholder-[#9D9FA9]"
                        required
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={newReviewer.email}
                        onChange={(e) => setNewReviewer({ ...newReviewer, email: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat placeholder-[#9D9FA9]"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Mattermost ID"
                        value={newReviewer.mattermostId}
                        onChange={(e) => setNewReviewer({ ...newReviewer, mattermostId: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat placeholder-[#9D9FA9]"
                      />
                      <input
                        type="text"
                        placeholder="GitHub IDs (comma separated)"
                        value={newReviewer.githubIds}
                        onChange={(e) => setNewReviewer({ ...newReviewer, githubIds: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat placeholder-[#9D9FA9]"
                      />
                      <input
                        type="url"
                        placeholder="CV Link"
                        value={newReviewer.cvLink}
                        onChange={(e) => setNewReviewer({ ...newReviewer, cvLink: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat placeholder-[#9D9FA9]"
                      />
                      <textarea
                        placeholder="Expertise (areas of knowledge)"
                        value={newReviewer.expertise}
                        onChange={(e) => setNewReviewer({ ...newReviewer, expertise: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat placeholder-[#9D9FA9]"
                        rows={3}
                      />
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-montserrat"
                        >
                          {loading ? 'Adding...' : 'Add Reviewer'}
                        </button>
                        <button
                          type="button"
                          onClick={resetReviewerForm}
                          className="px-4 py-2 bg-[#9D9FA9] text-white rounded-lg hover:bg-[#7D7F89] transition-colors font-montserrat"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="grid gap-4">
                  {reviewers.map((reviewer) => (
                    <div key={reviewer.id} className="bg-[#2A1A4A] border border-[#9D9FA9] rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-lg text-white font-montserrat">{reviewer.name}</h3>
                            {reviewer.anonymousName && (
                              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full font-montserrat">
                                Anonymous: {reviewer.anonymousName}
                              </span>
                            )}
                          </div>
                          <p className="text-[#9D9FA9] font-montserrat mb-2">{reviewer.email}</p>
                          
                          <div className="space-y-1">
                            {reviewer.userID && (
                              <p className="text-sm text-[#9D9FA9] font-montserrat">
                                <strong>User ID:</strong> {reviewer.userID}
                              </p>
                            )}
                            {reviewer.mattermostId && (
                              <p className="text-sm text-[#9D9FA9] font-montserrat">
                                <strong>Mattermost ID:</strong> {reviewer.mattermostId}
                              </p>
                            )}
                            {reviewer.githubIds && (
                              <p className="text-sm text-[#9D9FA9] font-montserrat">
                                <strong>GitHub IDs:</strong> {reviewer.githubIds}
                              </p>
                            )}
                            {reviewer.cvLink && (
                              <p className="text-sm text-[#9D9FA9] font-montserrat">
                                <strong>CV Link:</strong> <a href={reviewer.cvLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline break-all">{reviewer.cvLink}</a>
                              </p>
                            )}
                            {reviewer.expertise && (
                              <p className="text-sm text-[#9D9FA9] font-montserrat">
                                <strong>Expertise:</strong> {reviewer.expertise}
                              </p>
                            )}
                            <p className="text-xs text-[#7D7F89] font-montserrat mt-2">
                              Created: {reviewer.createdAt ? new Date(reviewer.createdAt).toLocaleDateString() : 'N/A'}
                              {reviewer.updatedAt && reviewer.updatedAt !== reviewer.createdAt && (
                                <span> | Updated: {new Date(reviewer.updatedAt).toLocaleDateString()}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            reviewer.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {reviewer.isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                          <button
                            onClick={() => handleDeleteReviewer(reviewer.id)}
                            className="text-red-400 hover:text-red-300 transition-colors font-montserrat"
                            title="Delete reviewer"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assignments Tab */}
            {activeTab === 'assignments' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                  <h2 className="text-xl font-semibold text-white font-montserrat w-full sm:w-auto">Team-Reviewer Assignments</h2>
                  <button
                    onClick={() => setShowAssignmentForm(true)}
                    className="px-4 py-2 bg-[#9050E9] text-white rounded-lg hover:bg-[#7040C9] transition-colors font-montserrat w-full sm:w-auto"
                  >
                    + Create Assignment
                  </button>
                </div>

                {showAssignmentForm && (
                  <div className="bg-[#2A1A4A] border border-[#9D9FA9] p-4 rounded-lg mb-6">
                    <h3 className="text-lg font-medium mb-4 text-white font-montserrat">Create New Assignment</h3>
                    <form onSubmit={handleCreateAssignment} className="grid grid-cols-2 gap-4">
                      <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat"
                        required
                      >
                        <option value="">Select Team</option>
                        {teams.filter(team => team.status === 'active').map((team) => (
                          <option key={team.id} value={team.id}>
                            {(team.teamName || team.name || '-')}
                            {` - ${(team.proposalTitle || team.projectTitle || '-')}`}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedReviewerId}
                        onChange={(e) => setSelectedReviewerId(e.target.value)}
                        className="px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat"
                        required
                      >
                        <option value="">Select Reviewer</option>
                        {reviewers.filter(reviewer => reviewer.isAvailable).map((reviewer) => (
                          <option key={reviewer.id} value={reviewer.id}>
                            {reviewer.name} - {reviewer.expertise}
                          </option>
                        ))}
                      </select>
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          disabled={loading || !selectedTeamId || !selectedReviewerId}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-montserrat"
                        >
                          {loading ? 'Creating...' : 'Create Assignment'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAssignmentForm(false);
                            setSelectedTeamId('');
                            setSelectedReviewerId('');
                          }}
                          className="px-4 py-2 bg-[#9D9FA9] text-white rounded-lg hover:bg-[#7D7F89] transition-colors font-montserrat"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Current Assignments (non-revoked) */}
                <div className="grid gap-4">
                  {assignments.filter(a => a.status !== 'revoked').map((assignment) => {
                    const team = teams.find(t => t.id === assignment.teamId);
                    const reviewer = reviewers.find(r => r.id === assignment.reviewerId);
                    
                    const startChatForAssignment = async () => {
                      try {
                        setError(null);
                        setSuccess(null);
                        if (!user?.id) {
                          setError('Missing admin user ID');
                          return;
                        }
                        const response = await fetch('/api/chat/sessions', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            teamId: assignment.teamId,
                            assignmentId: assignment.id,
                            createdBy: user.id
                          })
                        });
                        const data = await response.json();
                        if (response.ok && data.success) {
                          const status = data.data?.status || data.status;
                          if (status === 'existing') {
                            setSuccess('Chat session already active for this assignment.');
                          } else {
                            setSuccess('Chat session started successfully.');
                          }
                        } else {
                          setError(data.message || 'Failed to start chat session');
                        }
                      } catch (err) {
                        console.error('Error starting chat session:', err);
                        setError('Failed to start chat session');
                      }
                    };

                    const endChatForAssignment = async () => {
                      try {
                        setError(null);
                        setSuccess(null);
                        if (!user?.id) {
                          setError('Missing admin user ID');
                          return;
                        }
                        // Find active session for this assignment
                        const sessionsResp = await fetch(`/api/chat/sessions?userId=${encodeURIComponent(user.id)}&userRole=admin`);
                        if (!sessionsResp.ok) {
                          setError('Unable to fetch chat sessions');
                          return;
                        }
                        const sessionsJson = await sessionsResp.json();
                        const sessions = sessionsJson?.data || [];
                        const existingSession = sessions.find((s: any) => s.assignmentId === assignment.id && s.status === 'active');
                        if (!existingSession) {
                          setError('No active chat session found for this assignment');
                          return;
                        }
                        const putResp = await fetch(`/api/chat/sessions/${existingSession.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'end', userId: user.id, userRole: 'admin' })
                        });
                        const putJson = await putResp.json();
                        if (putResp.ok && putJson.success) {
                          setSuccess('Chat session ended successfully.');
                        } else {
                          setError(putJson.message || 'Failed to end chat session');
                        }
                      } catch (err) {
                        console.error('Error ending chat session:', err);
                        setError('Failed to end chat session');
                      }
                    };
                    
                    return (
                      <div key={assignment.id} className="bg-[#2A1A4A] border border-[#9D9FA9] rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <h4 className="font-medium text-white font-montserrat mb-1">Team Details</h4>
                                <p className="text-sm text-white font-montserrat">{team?.teamName || team?.name || 'Unknown Team'}</p>
                                <p className="text-xs text-[#9D9FA9] font-montserrat">{team?.proposalTitle || team?.projectTitle}</p>
                                {team?.teamLeaderName && (
                                  <p className="text-xs text-[#9D9FA9] font-montserrat">Leader: {team.teamLeaderName}</p>
                                )}
                                {team?.teamLeaderEmail && (
                                  <p className="text-xs text-[#9D9FA9] font-montserrat">{team.teamLeaderEmail}</p>
                                )}
                              </div>
                              <div>
                                <h4 className="font-medium text-white font-montserrat mb-1">Reviewer Details</h4>
                                <p className="text-sm text-white font-montserrat">{reviewer?.name || 'Unknown Reviewer'}</p>
                                {reviewer?.anonymousName && (
                                  <p className="text-xs text-purple-300 font-montserrat">Anonymous: {reviewer.anonymousName}</p>
                                )}
                                <p className="text-xs text-[#9D9FA9] font-montserrat">{reviewer?.email}</p>
                                {reviewer?.expertise && (
                                  <p className="text-xs text-[#9D9FA9] font-montserrat">Expertise: {reviewer.expertise}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="border-t border-[#9D9FA9]/20 pt-2">
                              <div className="grid grid-cols-2 gap-4 text-xs text-[#9D9FA9] font-montserrat">
                                <div>
                                  <p><strong>Assignment ID:</strong> {assignment.id}</p>
                                  <p><strong>Assigned:</strong> {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleString() : 'N/A'}</p>
                                  {assignment.assignedBy && (
                                    <p><strong>Assigned By:</strong> {assignment.assignedBy}</p>
                                  )}
                                </div>
                                <div>
                                  {assignment.approvedAt && (
                                    <p><strong>Approved:</strong> {new Date(assignment.approvedAt).toLocaleString()}</p>
                                  )}
                                  {assignment.approvedBy && (
                                    <p><strong>Approved By:</strong> {assignment.approvedBy}</p>
                                  )}
                                  {assignment.revokedAt && (
                                    <p><strong>Revoked:</strong> {new Date(assignment.revokedAt).toLocaleString()}</p>
                                  )}
                                  {assignment.notes && (
                                    <p><strong>Notes:</strong> {assignment.notes}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              assignment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              assignment.status === 'approved' ? 'bg-green-100 text-green-800' :
                              assignment.status === 'active' ? 'bg-blue-100 text-blue-800' :
                              assignment.status === 'revoked' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {assignment.status}
                            </span>
                            <div className="flex flex-col space-y-1">
                              <div className="flex space-x-1">
                                {assignment.status === 'pending' && (
                                  <button
                                    onClick={() => handleAssignmentAction(assignment.id, 'approve')}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-montserrat"
                                  >
                                    Approve
                                  </button>
                                )}
                                {assignment.status === 'approved' && (
                                  <button
                                    onClick={() => handleAssignmentAction(assignment.id, 'activate')}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-montserrat"
                                  >
                                    Activate
                                  </button>
                                )}
                                {(assignment.status === 'active' || assignment.status === 'approved') && (
                                  <button
                                    onClick={() => handleAssignmentAction(assignment.id, 'revoke')}
                                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-montserrat"
                                  >
                                    Revoke
                                  </button>
                                )}
                              </div>
                              
                              {assignment.status === 'approved' && (
                                <div className="flex flex-col space-y-1">
                                  {!shareLinks[assignment.id] ? (
                                    <button
                                      onClick={() => generateShareLink(assignment.id)}
                                      disabled={generatingLink === assignment.id}
                                      className="px-2 py-1 text-xs bg-[#9050E9] text-white rounded hover:bg-[#7040C9] transition-colors disabled:opacity-50 font-montserrat"
                                    >
                                      {generatingLink === assignment.id ? 'Generating...' : '🔗 Generate Chat Link'}
                                    </button>
                                  ) : (
                                    <div className="flex flex-col space-y-1">
                                      <button
                                        onClick={() => copyToClipboard(shareLinks[assignment.id])}
                                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors font-montserrat"
                                        title="Copy chat link"
                                      >
                                        📋 Copy Chat Link
                                      </button>
                                      <div className="text-xs text-[#9D9FA9] max-w-32 truncate font-montserrat" title={shareLinks[assignment.id]}>
                                        {shareLinks[assignment.id]}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {assignment.status === 'active' && (
                                <div className="flex space-x-1">
                                  <button
                                    onClick={startChatForAssignment}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-montserrat"
                                  >
                                    Start Chat
                                  </button>
                                  <button
                                    onClick={endChatForAssignment}
                                    className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors font-montserrat"
                                  >
                                    End Chat
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        setError(null);
                                        setSuccess(null);
                                        if (!user?.id) {
                                          setError('Missing admin user ID');
                                          return;
                                        }
                                        const sessionsResp = await fetch(`/api/chat/sessions?userId=${encodeURIComponent(user.id)}&userRole=admin`);
                                        if (!sessionsResp.ok) {
                                          setError('Unable to fetch chat sessions');
                                          return;
                                        }
                                        const sessionsJson = await sessionsResp.json();
                                        const sessions = sessionsJson?.data || [];
                                        const existingSession = sessions.find((s: any) => s.assignmentId === assignment.id && s.status === 'active');
                                        if (!existingSession) {
                                          setError('No active chat session found for this assignment');
                                          return;
                                        }
                                        setChatSessionId(existingSession.id);
                                        setShowChat(true);
                                      } catch (err) {
                                        console.error('Error opening chat view:', err);
                                        setError('Failed to open chat view');
                                      }
                                    }}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-montserrat"
                                  >
                                    View Chat
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Revoked Assignments Dropdown */}
                <div className="mt-6">
                  <button
                    onClick={() => setShowRevokedDropdown(prev => !prev)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-[#2A1A4A] border border-[#9D9FA9] rounded-lg text-white hover:bg-[#3A2A5A] transition-colors font-montserrat"
                  >
                    <span>Revoked Assignments</span>
                    <span className="text-sm text-[#9D9FA9]">{assignments.filter(a => a.status === 'revoked').length}</span>
                  </button>

                  {showRevokedDropdown && (
                    <div className="mt-3 grid gap-4">
                      {assignments.filter(a => a.status === 'revoked').length === 0 ? (
                        <div className="text-[#9D9FA9] text-sm font-montserrat px-2">No revoked assignments</div>
                      ) : (
                        assignments
                          .filter(a => a.status === 'revoked')
                          .map((assignment) => {
                            const team = teams.find(t => t.id === assignment.teamId);
                            const reviewer = reviewers.find(r => r.id === assignment.reviewerId);

                            const openChatHistoryForAssignment = async () => {
                              try {
                                setError(null);
                                setSuccess(null);
                                if (!user?.id) {
                                  setError('Missing admin user ID');
                                  return;
                                }
                                // List all sessions and find latest for this assignment (ended or active)
                                const sessionsResp = await fetch(`/api/chat/sessions?userId=${encodeURIComponent(user.id)}&userRole=admin`);
                                if (!sessionsResp.ok) {
                                  setError('Unable to fetch chat sessions');
                                  return;
                                }
                                const sessionsJson = await sessionsResp.json();
                                const sessions = sessionsJson?.data || [];
                                const assignmentSessions = sessions.filter((s: any) => s.assignmentId === assignment.id);
                                if (assignmentSessions.length === 0) {
                                  setError('No chat sessions found for this revoked assignment');
                                  return;
                                }
                                // Prefer the most recently active entry by lastActivity or createdAt
                                assignmentSessions.sort((a: any, b: any) => {
                                  const ta = new Date(a.lastActivity || a.createdAt).getTime();
                                  const tb = new Date(b.lastActivity || b.createdAt).getTime();
                                  return tb - ta;
                                });
                                const target = assignmentSessions[0];
                                setChatSessionId(target.id);
                                setShowChat(true);
                              } catch (err) {
                                console.error('Error opening chat history:', err);
                                setError('Failed to open chat history');
                              }
                            };

                            return (
                              <div key={assignment.id} className="bg-[#2A1A4A] border border-[#9D9FA9] rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                      <div>
                                        <h4 className="font-medium text-white font-montserrat mb-1">Team Details</h4>
                                        <p className="text-sm text-white font-montserrat">{team?.teamName || team?.name || 'Unknown Team'}</p>
                                        <p className="text-xs text-[#9D9FA9] font-montserrat">{team?.proposalTitle || team?.projectTitle}</p>
                                        {team?.teamLeaderName && (
                                          <p className="text-xs text-[#9D9FA9] font-montserrat">Leader: {team.teamLeaderName}</p>
                                        )}
                                        {team?.teamLeaderEmail && (
                                          <p className="text-xs text-[#9D9FA9] font-montserrat">{team.teamLeaderEmail}</p>
                                        )}
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-white font-montserrat mb-1">Reviewer Details</h4>
                                        <p className="text-sm text-white font-montserrat">{reviewer?.name || 'Unknown Reviewer'}</p>
                                        {reviewer?.anonymousName && (
                                          <p className="text-xs text-purple-300 font-montserrat">Anonymous: {reviewer.anonymousName}</p>
                                        )}
                                        <p className="text-xs text-[#9D9FA9] font-montserrat">{reviewer?.email}</p>
                                        {reviewer?.expertise && (
                                          <p className="text-xs text-[#9D9FA9] font-montserrat">Expertise: {reviewer.expertise}</p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="border-t border-[#9D9FA9]/20 pt-2">
                                      <div className="grid grid-cols-2 gap-4 text-xs text-[#9D9FA9] font-montserrat">
                                        <div>
                                          <p><strong>Assignment ID:</strong> {assignment.id}</p>
                                          <p><strong>Assigned:</strong> {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleString() : 'N/A'}</p>
                                          {assignment.assignedBy && (
                                            <p><strong>Assigned By:</strong> {assignment.assignedBy}</p>
                                          )}
                                        </div>
                                        <div>
                                          {assignment.approvedAt && (
                                            <p><strong>Approved:</strong> {new Date(assignment.approvedAt).toLocaleString()}</p>
                                          )}
                                          {assignment.approvedBy && (
                                            <p><strong>Approved By:</strong> {assignment.approvedBy}</p>
                                          )}
                                          {assignment.revokedAt && (
                                            <p><strong>Revoked:</strong> {new Date(assignment.revokedAt).toLocaleString()}</p>
                                          )}
                                          {assignment.notes && (
                                            <p><strong>Notes:</strong> {assignment.notes}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end space-y-2">
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">revoked</span>
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={openChatHistoryForAssignment}
                                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-montserrat"
                                      >
                                        View Chat History
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AwardedTeamsManager;
