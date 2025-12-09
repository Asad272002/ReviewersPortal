'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from "../components/ProtectedRoute";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import Image from 'next/image';
import { useAuth } from "../context/AuthContext";
import { validateUrl, validateRequiredText, sanitizeInput } from "../utils/validation";

type ProfileData = {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'reviewer' | 'team_leader';
  linkedinUrl?: string;
  githubIds?: string;
  mattermostId?: string;
  hasPassword?: boolean;
};

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubIds, setGithubIds] = useState('');
  const [mattermostId, setMattermostId] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/profile', { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to load profile');
        }
        const p: ProfileData = data.profile;
        setProfile(p);
        setUsername(p.username || '');
        setLinkedinUrl(p.linkedinUrl || '');
        setGithubIds(p.githubIds || '');
        setMattermostId(p.mattermostId || '');
        setPassword('');
      } catch (e: any) {
        setError(e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const onSave = async () => {
    setError(null);
    setSuccess(null);
    const body: Record<string, any> = {};

    // Username
    if (username && username !== profile?.username) {
      const v = validateRequiredText(username, 'Username', 3, 100);
      if (!v.isValid) {
        setError(v.error || 'Invalid username');
        return;
      }
      body.username = sanitizeInput(username);
    }

    // Password (optional)
    if (password) {
      const v = validateRequiredText(password, 'Password', 6, 200);
      if (!v.isValid) {
        setError(v.error || 'Invalid password');
        return;
      }
      body.password = password;
    }

    // LinkedIn URL
    if (linkedinUrl !== (profile?.linkedinUrl || '')) {
      if (linkedinUrl) {
        const v = validateUrl(linkedinUrl);
        if (!v.isValid) {
          setError(v.error || 'Invalid LinkedIn URL');
          return;
        }
      }
      body.linkedinUrl = sanitizeInput(linkedinUrl);
    }

    // GitHub IDs
    if (githubIds !== (profile?.githubIds || '')) {
      body.githubIds = sanitizeInput(githubIds);
    }

    // Mattermost ID
    if (mattermostId !== (profile?.mattermostId || '')) {
      body.mattermostId = sanitizeInput(mattermostId);
    }

    if (Object.keys(body).length === 0) {
      setError('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update profile');
      }
      setSuccess('Profile updated successfully');
      setPassword('');
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["reviewer"]}>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <Header title="My Profile" />

        <div className="flex flex-1 relative z-10">
          <Sidebar />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 relative z-10">
            <div className="max-w-3xl mx-auto">
              {loading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="text-white font-montserrat">Loading profile...</div>
                </div>
              ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl p-4 font-montserrat mb-4">
                  {error}
                </div>
              ) : profile ? (
                <div className="bg-[#0C021E] rounded-xl border border-[#9D9FA9] p-6">
                  <div className="mb-6">
                    <h2 className="font-montserrat font-semibold text-2xl text-white">Profile</h2>
                    <p className="font-montserrat text-gray-300">Update your profile settings</p>
                  </div>

                  {success && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-300 rounded-xl p-3 font-montserrat mb-4">
                      {success}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-white font-montserrat mb-1">Name</label>
                      <input
                        type="text"
                        value={profile.name}
                        disabled
                        className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2 opacity-70"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-montserrat mb-1">Role</label>
                      <input
                        type="text"
                        value={profile.role}
                        disabled
                        className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2 opacity-70 capitalize"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-montserrat mb-1">Username</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-montserrat mb-1">New Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                        placeholder="Enter new password"
                      />
                      <p className="text-xs text-gray-400 font-montserrat mt-1">Leave blank to keep current password</p>
                    </div>
                    <div>
                      <label className="block text-white font-montserrat mb-1">LinkedIn URL</label>
                      <input
                        type="url"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                    <div>
                      <label className="block text-white font-montserrat mb-1">GitHub IDs (comma-separated)</label>
                      <input
                        type="text"
                        value={githubIds}
                        onChange={(e) => setGithubIds(e.target.value)}
                        className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                        placeholder="octocat, hubot"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-montserrat mb-1">Mattermost ID</label>
                      <input
                        type="text"
                        value={mattermostId}
                        onChange={(e) => setMattermostId(e.target.value)}
                        className="w-full bg-[#0C021E] text-white border border-[#9D9FA9] rounded px-3 py-2"
                        placeholder="reviewer123"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={onSave}
                      disabled={isSaving}
                      className="px-4 py-2 bg-[#9050E9] hover:bg-[#A96AFF] text-white font-montserrat rounded transition-colors disabled:opacity-60"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
                  <div className="text-white font-montserrat">Profile not found</div>
                </div>
              )}
            </div>
          </main>
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}