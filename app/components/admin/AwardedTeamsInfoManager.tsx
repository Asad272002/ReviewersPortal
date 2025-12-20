'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface AwardedTeamInfo {
  id: string;
  project_code: string;
  project_title: string;
  proposal_link: string;
  round_name: string;
  awarded_amount: number;
  total_milestones: number;
  has_service: boolean;
  created_at: string;
  updated_at: string;
}

const AwardedTeamsInfoManager: React.FC = () => {
  const [data, setData] = useState<AwardedTeamInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRound, setSelectedRound] = useState<string>('All');

  const [formData, setFormData] = useState<Partial<AwardedTeamInfo>>({
    project_code: '',
    project_title: '',
    proposal_link: '',
    round_name: '',
    awarded_amount: 0,
    total_milestones: 0,
    has_service: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/awarded-teams-info');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const url = '/api/admin/awarded-teams-info';
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { ...formData, id: editingId } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(editingId ? 'Updated successfully' : 'Created successfully');
        setShowAddForm(false);
        setEditingId(null);
        resetForm();
        fetchData();
      } else {
        setError(result.message || 'Operation failed');
      }
    } catch (err) {
      setError('Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/awarded-teams-info?id=${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        setSuccess('Deleted successfully');
        fetchData();
      } else {
        setError(result.message || 'Failed to delete');
      }
    } catch (err) {
      setError('Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: AwardedTeamInfo) => {
    setFormData(item);
    setEditingId(item.id);
    setShowAddForm(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData({
      project_code: '',
      project_title: '',
      proposal_link: '',
      round_name: '',
      awarded_amount: 0,
      total_milestones: 0,
      has_service: false
    });
  };

  // Derived state for filtering
  const uniqueRounds = useMemo(() => {
    const rounds = new Set(data.map(item => item.round_name).filter(Boolean));
    return Array.from(rounds).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = 
        item.project_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.project_code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRound = selectedRound === 'All' || item.round_name === selectedRound;

      return matchesSearch && matchesRound;
    });
  }, [data, searchTerm, selectedRound]);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#9D9FA9]/30 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white font-montserrat">Awarded Teams Info</h2>
          <p className="text-[#9D9FA9] text-sm mt-1">Manage project details, funding rounds, and milestones</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingId(null);
            setShowAddForm(!showAddForm);
          }}
          className={`
            px-5 py-2.5 rounded-xl transition-all duration-300 font-montserrat font-medium flex items-center gap-2
            ${showAddForm 
              ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20' 
              : 'bg-[#9050E9] text-white shadow-[0_0_15px_rgba(144,80,233,0.3)] hover:bg-[#A96AFF] hover:shadow-[0_0_20px_rgba(144,80,233,0.5)]'
            }
          `}
        >
          {showAddForm ? (
            <>✕ Cancel</>
          ) : (
            <>+ Add New Project</>
          )}
        </button>
      </div>

      {/* Notifications */}
      {(error || success) && (
        <div className={`
          p-4 rounded-xl border backdrop-blur-sm animate-fade-in
          ${error 
            ? 'bg-red-900/20 border-red-500/50 text-red-200' 
            : 'bg-green-900/20 border-green-500/50 text-green-200'
          }
        `}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{error ? '⚠️' : '✅'}</span>
            <p className="font-medium">{error || success}</p>
          </div>
        </div>
      )}

      {/* Form Section */}
      {showAddForm && (
        <div className="bg-[#1A0B2E]/80 backdrop-blur-md border border-[#9D9FA9]/50 p-6 md:p-8 rounded-2xl shadow-2xl animate-slide-down">
          <h3 className="text-xl font-semibold mb-6 text-white font-montserrat flex items-center gap-2">
            {editingId ? '✏️ Edit Project' : '✨ Add New Project'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-medium font-montserrat ml-1">Project Code <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="e.g. PROJ-2024-001"
                value={formData.project_code}
                onChange={e => setFormData({...formData, project_code: e.target.value})}
                className="w-full px-4 py-3 bg-[#0C021E] border border-[#9D9FA9]/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9050E9] focus:border-transparent transition-all font-montserrat placeholder-gray-600"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-medium font-montserrat ml-1">Project Title <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="e.g. Decentralized Review System"
                value={formData.project_title}
                onChange={e => setFormData({...formData, project_title: e.target.value})}
                className="w-full px-4 py-3 bg-[#0C021E] border border-[#9D9FA9]/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9050E9] focus:border-transparent transition-all font-montserrat placeholder-gray-600"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-medium font-montserrat ml-1">Round Name</label>
              <input
                type="text"
                placeholder="e.g. Grant Round 1"
                value={formData.round_name || ''}
                onChange={e => setFormData({...formData, round_name: e.target.value})}
                className="w-full px-4 py-3 bg-[#0C021E] border border-[#9D9FA9]/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9050E9] focus:border-transparent transition-all font-montserrat placeholder-gray-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-medium font-montserrat ml-1">Proposal Link</label>
              <input
                type="text"
                placeholder="https://..."
                value={formData.proposal_link || ''}
                onChange={e => setFormData({...formData, proposal_link: e.target.value})}
                className="w-full px-4 py-3 bg-[#0C021E] border border-[#9D9FA9]/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9050E9] focus:border-transparent transition-all font-montserrat placeholder-gray-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-medium font-montserrat ml-1">Awarded Amount ($)</label>
              <input
                type="number"
                placeholder="0.00"
                value={formData.awarded_amount || ''}
                onChange={e => setFormData({...formData, awarded_amount: Number(e.target.value)})}
                className="w-full px-4 py-3 bg-[#0C021E] border border-[#9D9FA9]/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9050E9] focus:border-transparent transition-all font-montserrat placeholder-gray-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-medium font-montserrat ml-1">Total Milestones</label>
              <input
                type="number"
                placeholder="0"
                value={formData.total_milestones || ''}
                onChange={e => setFormData({...formData, total_milestones: Number(e.target.value)})}
                className="w-full px-4 py-3 bg-[#0C021E] border border-[#9D9FA9]/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9050E9] focus:border-transparent transition-all font-montserrat placeholder-gray-600"
              />
            </div>
            
            <div className="md:col-span-2 pt-2">
              <label className="flex items-center space-x-3 cursor-pointer group p-3 bg-[#0C021E] border border-[#9D9FA9]/30 rounded-xl hover:border-[#9050E9]/50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.has_service || false}
                  onChange={e => setFormData({...formData, has_service: e.target.checked})}
                  className="w-5 h-5 text-[#9050E9] bg-[#2A1A4A] border-[#9D9FA9] rounded focus:ring-[#9050E9] cursor-pointer"
                />
                <span className="text-white font-montserrat group-hover:text-[#E2D1F9] transition-colors">Includes Service Component?</span>
              </label>
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-[#9D9FA9]/20">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2.5 text-gray-400 hover:text-white font-montserrat transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-2.5 bg-[#9050E9] text-white rounded-xl hover:bg-[#A96AFF] font-montserrat font-medium shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
              >
                {editingId ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by title or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#1A0A3A] border border-[#9D9FA9]/30 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] focus:border-transparent font-montserrat placeholder-gray-500"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-gray-300 font-montserrat whitespace-nowrap text-sm">Filter by Round:</label>
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value)}
            className="flex-1 md:w-48 px-4 py-2.5 bg-[#1A0A3A] border border-[#9D9FA9]/30 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9050E9] font-montserrat cursor-pointer hover:bg-[#251048] transition-colors"
          >
            <option value="All">All Rounds</option>
            {uniqueRounds.map(round => (
              <option key={round} value={round}>{round}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredData.map(item => (
          <div 
            key={item.id} 
            className="group bg-[#0C021E] rounded-2xl border border-[#9D9FA9]/30 p-6 hover:border-[#9050E9]/50 hover:bg-[#1A0A3A] transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(144,80,233,0.15)] flex flex-col relative overflow-hidden"
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#9050E9] to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="inline-block px-2 py-1 rounded-md bg-[#2A1A4A] text-[#9050E9] text-xs font-mono mb-2 border border-[#9050E9]/20">
                  {item.project_code}
                </span>
                <h3 className="text-lg font-bold text-white font-montserrat leading-tight group-hover:text-[#E2D1F9] transition-colors">
                  {item.project_title}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(item)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {item.round_name && (
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-medium font-montserrat">
                  {item.round_name}
                </span>
              )}
              {item.has_service && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium font-montserrat">
                  Service Included
                </span>
              )}
              {item.proposal_link && (
                <a 
                  href={item.proposal_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-medium font-montserrat hover:bg-purple-500/20 transition-colors flex items-center gap-1"
                >
                  Proposal ↗
                </a>
              )}
            </div>

            <div className="mt-auto grid grid-cols-2 gap-4 pt-4 border-t border-[#9D9FA9]/20">
              <div>
                <p className="text-[#9D9FA9] text-xs font-montserrat mb-1">Awarded Amount</p>
                <p className="text-white font-mono font-semibold">
                  ${item.awarded_amount?.toLocaleString() ?? '0'}
                </p>
              </div>
              <div>
                <p className="text-[#9D9FA9] text-xs font-montserrat mb-1">Total Milestones</p>
                <p className="text-white font-mono font-semibold">
                  {item.total_milestones}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredData.length === 0 && !loading && (
        <div className="text-center py-20 bg-[#0C021E]/50 rounded-2xl border border-[#9D9FA9]/30 border-dashed">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl text-white font-montserrat font-medium mb-2">No projects found</h3>
          <p className="text-[#9D9FA9] font-montserrat">
            Try adjusting your search or filters, or add a new project.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedRound('All');
            }}
            className="mt-6 px-6 py-2 bg-[#1A0A3A] hover:bg-[#2A1A4A] text-[#9050E9] rounded-lg transition-colors font-montserrat"
          >
            Clear Filters
          </button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9050E9]"></div>
        </div>
      )}
    </div>
  );
};

export default AwardedTeamsInfoManager;
