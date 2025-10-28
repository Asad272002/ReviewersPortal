'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { validateRequiredText, validateInput, sanitizeInput } from '../../utils/validation';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'important' | 'general';
  status?: 'live' | 'expired' | 'upcoming';
  duration?: number; // Duration in days
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AnnouncementManagerProps {
  onAnnouncementUpdate?: () => void;
}

export default function AnnouncementManager({ onAnnouncementUpdate }: AnnouncementManagerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general' as 'important' | 'general',
    status: 'live' as 'live' | 'expired' | 'upcoming',
    duration: 30,
  });
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/admin/all-announcements');
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(Array.isArray(data) ? data : data.announcements || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any previous error
    setFormError('');

    // Frontend validation to prevent formula injection and invalid inputs
    const titleReq = validateRequiredText(formData.title, 'Title', 1, 200);
    if (!titleReq.isValid) { setFormError(titleReq.error || 'Invalid Title'); return; }
    const contentReq = validateRequiredText(formData.content, 'Content', 1, 2000);
    if (!contentReq.isValid) { setFormError(contentReq.error || 'Invalid Content'); return; }
    const titleInj = validateInput(formData.title, 'Title');
    if (!titleInj.isValid) { setFormError(titleInj.error || 'Invalid Title'); return; }
    const contentInj = validateInput(formData.content, 'Content');
    if (!contentInj.isValid) { setFormError(contentInj.error || 'Invalid Content'); return; }

    // Sanitize to avoid spreadsheet formula interpretation
    const safeTitle = sanitizeInput(formData.title);
    const safeContent = sanitizeInput(formData.content);

    // Store expiresAt as ISO string for consistency
    const expiresAt = formData.duration
      ? new Date(Date.now() + formData.duration * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const announcementData = {
      id: editingAnnouncement?.id || `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: safeTitle,
      content: safeContent,
      category: formData.category,
      status: formData.status,
      duration: formData.duration,
      expiresAt,
    };

    try {
      const url = editingAnnouncement 
        ? `/api/admin/announcements/${editingAnnouncement.id}`
        : '/api/admin/announcements';
      const method = editingAnnouncement ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementData),
      });

      if (response.ok) {
        await fetchAnnouncements();
        onAnnouncementUpdate?.();
        resetForm();
      } else {
        const err = await response.json().catch(() => ({}));
        setFormError(err?.error || 'Error saving announcement');
      }
    } catch (error) {
      setFormError('Error saving announcement');
      console.error('Error saving announcement:', error);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      status: announcement.status || 'live',
      duration: announcement.duration || 30,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchAnnouncements();
        onAnnouncementUpdate?.();
      } else {
        console.error('Error deleting announcement');
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'general',
      status: 'live',
      duration: 30,
    });
    setEditingAnnouncement(null);
    setShowForm(false);
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (isLoading) {
    return (
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <p className="font-montserrat text-[#9D9FA9]">Loading announcements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h3 className="font-montserrat font-semibold text-xl text-white w-full sm:w-auto">Announcements</h3>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <button
              onClick={() => {
                setShowForm(!showForm);
                if (showForm) {
                  resetForm();
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors flex items-center gap-2 w-full sm:w-auto"
            >
              <span>➕</span>
              {showForm ? 'Cancel' : 'Create'}
            </button>
            <button
              onClick={fetchAnnouncements}
              className="bg-blue-600 hover:bg-blue-700 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors flex items-center gap-2 w-full sm:w-auto"
            >
              <span>🔄</span>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
          <h4 className="font-montserrat font-semibold text-lg text-white mb-4">
            {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-montserrat text-[#9D9FA9] mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                required
              />
            </div>
            
            <div>
              <label className="block font-montserrat text-[#9D9FA9] mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-montserrat text-[#9D9FA9] mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as 'important' | 'general' })}
                  className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                >
                  <option value="general">General</option>
                  <option value="important">Important Updates</option>
                </select>
              </div>
              
              <div>
                <label className="block font-montserrat text-[#9D9FA9] mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'live' | 'expired' | 'upcoming' })}
                  className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                >
                  <option value="live">Live</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              
              <div>
                <label className="block font-montserrat text-[#9D9FA9] mb-2">Duration (days)</label>
                <input
                  type="number"
                  value={formData.duration || ''}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value ? parseInt(e.target.value) : 30 })}
                  min="1"
                  max="365"
                  className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-[#9050E9] hover:bg-[#A96AFF] text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
              >
                {editingAnnouncement ? 'Update' : 'Create'} Announcement
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-600 hover:bg-gray-700 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements Table */}
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <h4 className="font-montserrat font-semibold text-lg text-white mb-4">Current Announcements ({announcements.length})</h4>
        
        {announcements.length === 0 ? (
          <div className="text-center py-8">
            <p className="font-montserrat text-[#9D9FA9] mb-4">No announcements found.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-[#9050E9] hover:bg-[#A96AFF] text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
            >
              ➕ Create First Announcement
            </button>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden space-y-3">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="bg-[#0C021E] border border-[#9D9FA9]/40 rounded-lg p-4">
                  <div className="flex justify-between items-start gap-3">
                    <h5 className="font-montserrat font-semibold text-white">{announcement.title}</h5>
                    <span className={`px-2 py-1 rounded text-xs font-montserrat ${
                      announcement.category === 'important'
                        ? 'bg-yellow-500 text-black'
                        : 'bg-blue-500 text-white'
                    }`}>
                      {announcement.category}
                    </span>
                  </div>
                  <p className="font-montserrat text-[#9D9FA9] mt-2">
                    {announcement.content.length > 100
                      ? `${announcement.content.substring(0, 100)}...`
                      : announcement.content}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-montserrat">
                    <span className={`px-2 py-1 rounded ${
                      announcement.status === 'live'
                        ? 'bg-green-500 text-white'
                        : announcement.status === 'upcoming'
                        ? 'bg-blue-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}>
                      {announcement.status || 'live'}
                    </span>
                    <span className="text-[#9D9FA9]">Expires: {announcement.expiresAt ? formatDateShort(announcement.expiresAt) : 'Never'}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleEdit(announcement)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded transition-colors">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(announcement.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#9D9FA9]">
                  <th className="text-left p-3 font-montserrat font-medium text-white">Title</th>
                  <th className="text-left p-3 font-montserrat font-medium text-white">Content</th>
                  <th className="text-left p-3 font-montserrat font-medium text-white">Category</th>
                  <th className="text-left p-3 font-montserrat font-medium text-white">Status</th>
                  <th className="text-left p-3 font-montserrat font-medium text-white">Expires</th>
                  <th className="text-left p-3 font-montserrat font-medium text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((announcement) => (
                  <tr key={announcement.id} className="border-b border-[#9D9FA9]/30 hover:bg-[#0C021E]/50">
                    <td className="p-3 font-montserrat text-white font-medium">
                      {announcement.title}
                    </td>
                    <td className="p-3 font-montserrat text-[#9D9FA9] max-w-xs">
                      <div className="truncate" title={announcement.content}>
                        {announcement.content.length > 50 
                          ? `${announcement.content.substring(0, 50)}...` 
                          : announcement.content}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-montserrat ${
                        announcement.category === 'important'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {announcement.category}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-montserrat ${
                        announcement.status === 'live'
                          ? 'bg-green-500 text-white'
                          : announcement.status === 'upcoming'
                          ? 'bg-blue-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}>
                        {announcement.status || 'live'}
                      </span>
                    </td>
                    <td className="p-3 font-montserrat text-[#9D9FA9] text-sm">
                      {announcement.expiresAt 
                        ? formatDateShort(announcement.expiresAt)
                        : 'Never'}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(announcement)}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors"
                          title="Edit Announcement"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id)}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors"
                          title="Delete Announcement"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

const parseCustomDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  try {
    if (dateString.includes(' at ') && dateString.includes(' UTC')) {
      const cleanedDate = dateString.replace(' UTC', '').replace(' at ', ' ');
      const date = new Date(cleanedDate);
      if (!isNaN(date.getTime())) return date;
    }
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) return date;
    return null;
  } catch {
    return null;
  }
};

const formatDateShort = (dateString?: string) => {
  if (!dateString) return 'Never';
  const d = parseCustomDate(dateString);
  if (!d) return 'Invalid Date';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};