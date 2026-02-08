'use client';

import { useEffect, useState } from 'react';
import { 
  Building, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  X,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  description: string;
  project_config: any[];
  created_at: string;
}

export default function OrganizationManager() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  // State for managing the list of projects
  const [projects, setProjects] = useState<{code: string, name: string}[]>([]);
  const [availableProjects, setAvailableProjects] = useState<{project_code: string, project_title: string}[]>([]);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');

  useEffect(() => {
    fetchOrganizations();
    fetchAvailableProjects();
  }, []);

  const fetchAvailableProjects = async () => {
    try {
      const res = await fetch('/api/admin/awarded-teams-info');
      const data = await res.json();
      if (data.success) {
        setAvailableProjects(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch available projects', e);
    }
  };

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/organizations');
      const data = await res.json();
      if (data.success) {
        setOrganizations(data.organizations);
      } else {
        setError(data.error || 'Failed to fetch organizations');
      }
    } catch (e) {
      setError('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Validate projects
      const validProjects = projects.filter(p => p.code.trim() && p.name.trim());
      
      const url = editingOrg 
        ? `/api/admin/organizations/${editingOrg.id}`
        : '/api/admin/organizations';
      
      const method = editingOrg ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          project_config: validProjects
        })
      });

      const data = await res.json();

      if (data.success) {
        fetchOrganizations();
        handleCloseModal();
      } else {
        setError(data.error || data.message || 'Operation failed');
      }
    } catch (e) {
      setError('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization?')) return;

    try {
      const res = await fetch(`/api/admin/organizations/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchOrganizations();
      } else {
        setError(data.error || 'Failed to delete organization');
      }
    } catch (e) {
      setError('Failed to delete organization');
    }
  };

  const handleOpenModal = (org?: Organization) => {
    if (org) {
      setEditingOrg(org);
      setFormData({
        name: org.name,
        description: org.description || ''
      });
      // Ensure project_config is an array
      setProjects(Array.isArray(org.project_config) ? org.project_config : []);
    } else {
      setEditingOrg(null);
      setFormData({
        name: '',
        description: ''
      });
      setProjects([
        { code: "", name: "" }
      ]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingOrg(null);
    setError('');
  };

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building className="w-6 h-6 text-blue-400" />
            Organization Management
          </h2>
          <p className="text-white/60">Manage partner organizations and their project configurations</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Organization
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
        <input
          type="text"
          placeholder="Search organizations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-white/60 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Projects</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-white/40">
                    Loading organizations...
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-white/40">
                    No organizations found
                  </td>
                </tr>
              ) : (
                filteredOrgs.map(org => (
                  <tr key={org.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 text-white font-medium">{org.name}</td>
                    <td className="p-4 text-white/70">{org.description || '-'}</td>
                    <td className="p-4 text-white/70">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded bg-white/10 text-xs">
                          {Array.isArray(org.project_config) ? org.project_config.length : 0} projects
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(org)}
                          className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(org.id)}
                          className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#130b29] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="text-xl font-bold text-white">
                {editingOrg ? 'Edit Organization' : 'Create Organization'}
              </h3>
              <button onClick={handleCloseModal} className="text-white/50 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Organization Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Hyperon-RFP"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Brief description of the organization"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70 flex items-center justify-between">
                    <span>Projects</span>
                    <span className="text-xs text-white/40">{projects.length} selected</span>
                  </label>
                  
                  {/* Multi-select Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white flex items-center justify-between hover:bg-white/5 transition-colors focus:outline-none focus:border-blue-500"
                    >
                      <span className="text-sm text-white/70">
                        {projects.length === 0 ? 'Select Projects' : `${projects.length} Projects Selected`}
                      </span>
                      {isProjectDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {isProjectDropdownOpen && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-2 bg-[#1a103c] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-fadeIn max-h-[300px] flex flex-col">
                        <div className="p-2 border-b border-white/5">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                              type="text"
                              placeholder="Search available projects..."
                              value={projectSearchTerm}
                              onChange={(e) => setProjectSearchTerm(e.target.value)}
                              className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar p-2 space-y-1">
                          {availableProjects
                            .filter(p => 
                              p.project_title.toLowerCase().includes(projectSearchTerm.toLowerCase()) || 
                              p.project_code.toLowerCase().includes(projectSearchTerm.toLowerCase())
                            )
                            .map(p => {
                              const isSelected = projects.some(proj => proj.code === p.project_code);
                              return (
                                <button
                                  key={p.project_code}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setProjects(projects.filter(proj => proj.code !== p.project_code));
                                    } else {
                                      setProjects([...projects, { code: p.project_code, name: p.project_title }]);
                                    }
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                                    isSelected 
                                      ? 'bg-blue-500/20 text-blue-200' 
                                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                                  }`}
                                >
                                  <span className="truncate pr-4">
                                    <span className="font-mono opacity-50 mr-2">{p.project_code}</span>
                                    {p.project_title}
                                  </span>
                                  {isSelected && <Check size={14} className="text-blue-400 flex-shrink-0" />}
                                </button>
                              );
                            })}
                            {availableProjects.length === 0 && (
                              <div className="text-center py-4 text-white/30 text-sm">
                                No projects found
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected Projects List (Tags) */}
                  {projects.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 p-3 bg-black/20 rounded-xl border border-white/5 max-h-[150px] overflow-y-auto custom-scrollbar">
                      {projects.map((project) => (
                        <div 
                          key={project.code}
                          className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-1 text-xs text-blue-200 group hover:border-blue-500/40 transition-colors"
                        >
                          <span className="font-medium">{project.code}</span>
                          <span className="opacity-70 truncate max-w-[150px]">{project.name}</span>
                          <button
                            type="button"
                            onClick={() => setProjects(projects.filter(p => p.code !== project.code))}
                            className="ml-1 p-0.5 hover:bg-blue-500/20 rounded-full transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-white/70 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20"
                  >
                    {editingOrg ? 'Save Changes' : 'Create Organization'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}