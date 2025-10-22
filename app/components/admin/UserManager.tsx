'use client';

import { useEffect, useState } from 'react';
import { 
  validateRequiredText,
  validateEmail,
  validateUrl,
  validateNumber,
  sanitizeInput
} from '../../utils/validation';

interface AdminUserBase {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'reviewer' | 'team_leader' | string;
  email?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ReviewerExtras {
  expertise?: string;
  cvLink?: string;
  organization?: string;
  yearsExperience?: string | number;
  linkedinUrl?: string;
  githubIds?: string;
  mattermostId?: string;
  otherCircle?: boolean;
}

type AdminUser = AdminUserBase & ReviewerExtras;

export default function UserManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState<AdminUser & { password?: string }>({
    id: '',
    username: '',
    password: '',
    name: '',
    role: 'admin',
    email: '',
    status: 'active',
    expertise: '',
    cvLink: '',
    organization: '',
    yearsExperience: '',
    linkedinUrl: '',
    githubIds: '',
    mattermostId: '',
    otherCircle: false,
  });

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data?.data?.users || []);
    } catch (e) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setNewUser({
      id: '',
      username: '',
      password: '',
      name: '',
      role: 'admin',
      email: '',
      status: 'active',
      expertise: '',
      cvLink: '',
      organization: '',
      yearsExperience: '',
      linkedinUrl: '',
      githubIds: '',
      mattermostId: '',
      otherCircle: false,
    });
    setShowAddForm(false);
  };

  const validateNewUser = (): string | null => {
    const uReq = validateRequiredText(newUser.username || '', 'Username', 3, 100);
    if (!uReq.isValid) return uReq.error || 'Invalid username';

    const pReq = validateRequiredText((newUser as any).password || '', 'Password', 6, 200);
    if (!pReq.isValid) return pReq.error || 'Invalid password';

    const nReq = validateRequiredText(newUser.name || '', 'Name', 1, 200);
    if (!nReq.isValid) return nReq.error || 'Invalid name';

    if (newUser.email) {
      const eReq = validateEmail(newUser.email);
      if (!eReq.isValid) return eReq.error || 'Invalid email';
    }

    if (newUser.role === 'reviewer') {
      const expReq = validateRequiredText(newUser.expertise || '', 'Expertise', 2, 300);
      if (!expReq.isValid) return expReq.error || 'Invalid expertise';

      if (newUser.cvLink) {
        const cvReq = validateUrl(newUser.cvLink);
        if (!cvReq.isValid) return cvReq.error || 'Invalid CV link';
      }
      if (newUser.linkedinUrl) {
        const liReq = validateUrl(newUser.linkedinUrl);
        if (!liReq.isValid) return liReq.error || 'Invalid LinkedIn URL';
      }
      if (newUser.yearsExperience !== undefined && newUser.yearsExperience !== '') {
        const yrsReq = validateNumber(newUser.yearsExperience || 0, 'Years of Experience', 0, 100);
        if (!yrsReq.isValid) return yrsReq.error || 'Invalid years of experience';
      }
    }

    return null;
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateNewUser();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        username: sanitizeInput(newUser.username || ''),
        password: (newUser as any).password || '',
        name: sanitizeInput(newUser.name || ''),
        role: newUser.role,
        email: newUser.email || '',
      };

      if (newUser.role === 'reviewer') {
        body.expertise = sanitizeInput(newUser.expertise || '');
        body.cvLink = newUser.cvLink || '';
        body.organization = sanitizeInput(newUser.organization || '');
        body.yearsExperience = String(newUser.yearsExperience || '').trim();
        body.linkedinUrl = newUser.linkedinUrl || '';
        body.githubIds = sanitizeInput(newUser.githubIds || '');
        body.mattermostId = sanitizeInput(newUser.mattermostId || '');
        body.otherCircle = !!newUser.otherCircle;
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('User created successfully');
        resetForm();
        fetchUsers();
      } else {
        setError(data.message || 'Failed to create user');
      }
    } catch (err) {
      setError('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const [editForm, setEditForm] = useState<AdminUser & { password?: string } | null>(null);

  const startEdit = (user: AdminUser) => {
    setEditingUser(user);
    setEditForm({ ...user });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm(null);
  };


  const validateEditUser = (user: AdminUser & { password?: string } | null): string | null => {
    if (!user) return 'No user data to update';
    const nReq = validateRequiredText(user.name || '', 'Name', 1, 200);
    if (!nReq.isValid) return nReq.error || 'Invalid name';
    if (user.email) {
      const eReq = validateEmail(user.email);
      if (!eReq.isValid) return eReq.error || 'Invalid email';
    }
    if (user.role === 'reviewer') {
      const expReq = validateRequiredText(user.expertise || '', 'Expertise', 2, 300);
      if (!expReq.isValid) return expReq.error || 'Invalid expertise';
      if (user.cvLink) {
        const cvReq = validateUrl(user.cvLink);
        if (!cvReq.isValid) return cvReq.error || 'Invalid CV link';
      }
      if (user.linkedinUrl) {
        const liReq = validateUrl(user.linkedinUrl);
        if (!liReq.isValid) return liReq.error || 'Invalid LinkedIn URL';
      }
      if (user.yearsExperience !== undefined && user.yearsExperience !== '') {
        const yrsReq = validateNumber(user.yearsExperience || 0, 'Years of Experience', 0, 100);
        if (!yrsReq.isValid) return yrsReq.error || 'Invalid years of experience';
      }
    }
    return null;
  };

  const saveEdit = async () => {
    if (!editForm) return;
    const validationError = validateEditUser(editForm);
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const body: any = {
        username: sanitizeInput(editForm.username || ''),
        name: sanitizeInput(editForm.name || ''),
        role: editForm.role,
        email: editForm.email || '',
        status: editForm.status || 'active'
      };
      if ((editForm as any).password) {
        body.password = (editForm as any).password;
      }
      if (editForm.role === 'reviewer') {
        body.expertise = sanitizeInput(editForm.expertise || '');
        body.cvLink = editForm.cvLink || '';
        body.organization = sanitizeInput(editForm.organization || '');
        body.yearsExperience = String(editForm.yearsExperience || '').trim();
        body.linkedinUrl = editForm.linkedinUrl || '';
        body.githubIds = sanitizeInput(editForm.githubIds || '');
        body.mattermostId = sanitizeInput(editForm.mattermostId || '');
        body.otherCircle = !!editForm.otherCircle;
      }

      const res = await fetch(`/api/admin/users/${editingUser?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('User updated successfully');
        setEditingUser(null);
        setEditForm(null);
        fetchUsers();
      } else {
        setError(data.error || 'Failed to update user');
      }
    } catch (e) {
      setError('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setSuccess('User deleted successfully');
        fetchUsers();
      } else {
        setError(data.error || 'Failed to delete user');
      }
    } catch (e) {
      setError('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-montserrat font-semibold text-xl text-white">User Management</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-[#0C021E] hover:bg-[#1A0B2E] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300"
          >
            + Add User
          </button>
          <button
            onClick={fetchUsers}
            className="bg-[#0C021E] hover:bg-[#1A0B2E] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-all duration-300"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 font-montserrat">{error}</p>}
      {success && <p className="text-green-400 font-montserrat">{success}</p>}

      {showAddForm && (
        <div className="bg-[#2A1A4A] border border-[#9D9FA9] rounded-lg p-6">
          <h4 className="text-lg font-medium text-white font-montserrat mb-4">Add New User</h4>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-white font-montserrat mb-1">Username</label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="block text-white font-montserrat mb-1">Password</label>
              <input
                type="password"
                value={(newUser as any).password || ''}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                placeholder="Enter password"
                required
              />
            </div>
            <div>
              <label className="block text-white font-montserrat mb-1">Name</label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                placeholder="Full name"
                required
              />
            </div>
            <div>
              <label className="block text-white font-montserrat mb-1">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
              >
                <option value="admin">Admin</option>
                <option value="reviewer">Reviewer</option>
                <option value="team_leader">Team Leader</option>
              </select>
            </div>
            <div>
              <label className="block text-white font-montserrat mb-1">Email (optional)</label>
              <input
                type="email"
                value={newUser.email || ''}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                placeholder="user@example.com"
              />
            </div>

            {newUser.role === 'reviewer' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#9D9FA9] pt-4">
                <div>
                  <label className="block text-white font-montserrat mb-1">Expertise</label>
                  <input
                    type="text"
                    value={newUser.expertise || ''}
                    onChange={(e) => setNewUser({ ...newUser, expertise: e.target.value })}
                    className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                    placeholder="e.g. AI, Blockchain"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white font-montserrat mb-1">CV Link (optional)</label>
                  <input
                    type="url"
                    value={newUser.cvLink || ''}
                    onChange={(e) => setNewUser({ ...newUser, cvLink: e.target.value })}
                    className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-white font-montserrat mb-1">Organization (optional)</label>
                  <input
                    type="text"
                    value={newUser.organization || ''}
                    onChange={(e) => setNewUser({ ...newUser, organization: e.target.value })}
                    className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                    placeholder="Org name"
                  />
                </div>
                <div>
                  <label className="block text-white font-montserrat mb-1">Years of Experience</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={String(newUser.yearsExperience || '')}
                    onChange={(e) => setNewUser({ ...newUser, yearsExperience: e.target.value })}
                    className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                    placeholder="e.g. 5"
                  />
                </div>
                <div>
                  <label className="block text-white font-montserrat mb-1">LinkedIn URL (optional)</label>
                  <input
                    type="url"
                    value={newUser.linkedinUrl || ''}
                    onChange={(e) => setNewUser({ ...newUser, linkedinUrl: e.target.value })}
                    className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div>
                  <label className="block text-white font-montserrat mb-1">GitHub IDs (comma-separated)</label>
                  <input
                    type="text"
                    value={newUser.githubIds || ''}
                    onChange={(e) => setNewUser({ ...newUser, githubIds: e.target.value })}
                    className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                    placeholder="octocat, hubot"
                  />
                </div>
                <div>
                  <label className="block text-white font-montserrat mb-1">Mattermost ID</label>
                  <input
                    type="text"
                    value={newUser.mattermostId || ''}
                    onChange={(e) => setNewUser({ ...newUser, mattermostId: e.target.value })}
                    className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                    placeholder="reviewer123"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!newUser.otherCircle}
                    onChange={(e) => setNewUser({ ...newUser, otherCircle: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <label className="text-white font-montserrat">Part of another circle</label>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="bg-[#9050E9] hover:bg-[#A96AFF] text-white font-montserrat font-medium py-2 px-4 rounded"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add User'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-[#0C021E] hover:bg-[#1A0B2E] border border-[#9D9FA9] text-white font-montserrat font-medium py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users list */}
      <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] p-6">
        {users.length === 0 ? (
          <p className="font-montserrat text-gray-300">No users found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map((u) => (
              <div key={u.id} className="bg-[#2A1A4A] border border-[#9D9FA9] rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-white font-montserrat">{u.name}</h4>
                    <p className="text-[#9D9FA9] font-montserrat text-sm">{u.username} • {u.role}</p>
                    {u.email && (
                      <p className="text-[#9D9FA9] font-montserrat text-sm">{u.email}</p>
                    )}
                    {u.role === 'reviewer' && (
                      <div className="mt-2 text-sm font-montserrat text-[#D1D2D7] space-y-1">
                        {u.expertise && <p><strong>Expertise:</strong> {u.expertise}</p>}
                        {u.cvLink && (
                          <p>
                            <strong>CV:</strong> <a href={u.cvLink} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline break-all">{u.cvLink}</a>
                          </p>
                        )}
                        {u.organization && <p><strong>Org:</strong> {u.organization}</p>}
                        {u.yearsExperience && <p><strong>Experience:</strong> {u.yearsExperience} years</p>}
                        {u.linkedinUrl && (
                          <p>
                            <strong>LinkedIn:</strong> <a href={u.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline break-all">{u.linkedinUrl}</a>
                          </p>
                        )}
                        {u.githubIds && <p><strong>GitHub IDs:</strong> {u.githubIds}</p>}
                        {u.mattermostId && <p><strong>Mattermost ID:</strong> {u.mattermostId}</p>}
                        <p><strong>Other circle:</strong> {u.otherCircle ? 'Yes' : 'No'}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                        onClick={() => startEdit(u)}
                        className="bg-[#0C021E] hover:bg-[#1A0B2E] border border-[#9D9FA9] text-white font-montserrat py-1 px-3 rounded"
                      >
                      Edit
                    </button>
                    <button
                        onClick={() => deleteUser(u.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-montserrat py-1 px-3 rounded"
                      >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Editing form inline */}
                {editingUser?.id === u.id && editForm && (
                  <div className="mt-4 border-t border-[#9D9FA9] pt-4">
                    <h5 className="text-white font-montserrat mb-2">Edit User</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white font-montserrat mb-1">Name</label>
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...(editForm as any), name: e.target.value })}
                          className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-white font-montserrat mb-1">Email</label>
                        <input
                          type="email"
                          value={editForm.email || ''}
                          onChange={(e) => setEditForm({ ...(editForm as any), email: e.target.value })}
                          className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-white font-montserrat mb-1">Role</label>
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...(editForm as any), role: e.target.value as any })}
                          className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                        >
                          <option value="admin">Admin</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="team_leader">Team Leader</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-white font-montserrat mb-1">Status</label>
                        <select
                          value={editForm.status || 'active'}
                          onChange={(e) => setEditForm({ ...(editForm as any), status: e.target.value })}
                          className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>

                      {(editForm.role === 'reviewer') && (
                        <>
                          <div>
                            <label className="block text-white font-montserrat mb-1">Expertise</label>
                            <input
                              type="text"
                              value={editForm.expertise || ''}
                              onChange={(e) => setEditForm({ ...(editForm as any), expertise: e.target.value })}
                              className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-white font-montserrat mb-1">CV Link</label>
                            <input
                              type="url"
                              value={editForm.cvLink || ''}
                              onChange={(e) => setEditForm({ ...(editForm as any), cvLink: e.target.value })}
                              className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-white font-montserrat mb-1">Organization</label>
                            <input
                              type="text"
                              value={editForm.organization || ''}
                              onChange={(e) => setEditForm({ ...(editForm as any), organization: e.target.value })}
                              className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-white font-montserrat mb-1">Years of Experience</label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={String(editForm.yearsExperience || '')}
                              onChange={(e) => setEditForm({ ...(editForm as any), yearsExperience: e.target.value })}
                              className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-white font-montserrat mb-1">LinkedIn URL</label>
                            <input
                              type="url"
                              value={editForm.linkedinUrl || ''}
                              onChange={(e) => setEditForm({ ...(editForm as any), linkedinUrl: e.target.value })}
                              className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-white font-montserrat mb-1">GitHub IDs (comma-separated)</label>
                            <input
                              type="text"
                              value={editForm.githubIds || ''}
                              onChange={(e) => setEditForm({ ...(editForm as any), githubIds: e.target.value })}
                              className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-white font-montserrat mb-1">Mattermost ID</label>
                            <input
                              type="text"
                              value={editForm.mattermostId || ''}
                              onChange={(e) => setEditForm({ ...(editForm as any), mattermostId: e.target.value })}
                              className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!editForm.otherCircle}
                              onChange={(e) => setEditForm({ ...(editForm as any), otherCircle: e.target.checked })}
                              className="h-4 w-4"
                            />
                            <label className="text-white font-montserrat">Part of another circle</label>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={saveEdit}
                        className="bg-[#9050E9] hover:bg-[#A96AFF] text-white font-montserrat font-medium py-2 px-4 rounded"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="bg-[#0C021E] hover:bg-[#1A0B2E] border border-[#9D9FA9] text-white font-montserrat py-2 px-4 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

     </div>
   );
}