'use client';

import { useEffect, useState } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  X,
  Check,
  Building,
  Key
} from 'lucide-react';

interface Partner {
  id: string;
  username: string;
  name: string;
  organization_id: string; // Changed from organization name to ID
  password?: string;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
}

export default function PartnerManager() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Partner>>({
    username: '',
    password: '',
    name: '',
    organization_id: ''
  });

  useEffect(() => {
    fetchPartners();
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/admin/organizations');
      const data = await res.json();
      if (data.success) {
        setOrganizations(data.organizations);
      }
    } catch (e) {
      console.error('Failed to fetch organizations', e);
    }
  };

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/partners');
      const data = await res.json();
      if (data.success) {
        setPartners(data.partners);
      } else {
        setError(data.message);
      }
    } catch (e) {
      setError('Failed to fetch partners');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const url = isEditing 
        ? `/api/admin/partners/${formData.id}`
        : '/api/admin/partners';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(isEditing ? 'Partner updated successfully' : 'Partner created successfully');
        setShowModal(false);
        setFormData({ username: '', password: '', name: '', organization_id: '' });
        fetchPartners();
      } else {
        setError(data.message);
      }
    } catch (e) {
      setError('Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this partner?')) return;
    
    try {
      const res = await fetch(`/api/admin/partners/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Partner deleted successfully');
        fetchPartners();
      } else {
        setError(data.message);
      }
    } catch (e) {
      setError('Failed to delete partner');
    }
  };

  const getOrgName = (id: string) => {
    return organizations.find(o => o.id === id)?.name || 'Unknown';
  };

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    getOrgName(p.organization_id || '').toLowerCase().includes(search.toLowerCase()) ||
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Partner Management
          </h2>
          <p className="text-white/60 mt-1">Manage partner credentials and organizations</p>
        </div>
        <button
          onClick={() => {
            setIsEditing(false);
            setFormData({ username: '', password: '', name: '', organization_id: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-lg shadow-purple-600/20"
        >
          <Plus size={20} />
          Add Partner
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2">
          <X size={20} />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl flex items-center gap-2">
          <Check size={20} />
          {success}
        </div>
      )}

      {/* Search & List */}
      <div className="bg-[#130b29]/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-4 border-b border-white/5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              placeholder="Search partners..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-white/40">Loading partners...</div>
        ) : filteredPartners.length === 0 ? (
          <div className="p-8 text-center text-white/40">No partners found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-white/60 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Partner Name</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Organization</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white/90">{partner.name}</div>
                    </td>
                    <td className="p-4 text-white/70 font-mono text-sm">{partner.username}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-white/70">
                        <Building size={14} className="text-purple-400" />
                        {getOrgName(partner.organization_id)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setFormData({
                              id: partner.id,
                              username: partner.username,
                              name: partner.name,
                              organization_id: partner.organization_id || '',
                              password: ''
                            });
                            setShowModal(true);
                          }}
                          className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(partner.id)}
                          className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a103c] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {isEditing ? 'Edit Partner' : 'Add New Partner'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-white/50 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Organization</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                  <select
                    required
                    value={formData.organization_id || ''}
                    onChange={e => setFormData({...formData, organization_id: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-purple-500/50 appearance-none"
                  >
                    <option value="" className="bg-[#1a103c] text-white/50">Select Organization</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id} className="bg-[#1a103c] text-white">
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Username</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                    <input
                      type="text"
                      required
                      value={formData.username || ''}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
                      placeholder="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    {isEditing ? 'New Password (Optional)' : 'Password'}
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                    <input
                      type="text"
                      required={!isEditing}
                      value={formData.password || ''}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
                      placeholder={isEditing ? 'Leave empty to keep' : 'password'}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors font-medium shadow-lg shadow-purple-600/20"
                >
                  {isEditing ? 'Save Changes' : 'Create Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
