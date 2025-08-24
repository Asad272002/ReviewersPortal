'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'important' | 'general';
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
    duration: 30,
  });

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
    
    const expiresAt = formData.duration 
      ? new Date(Date.now() + formData.duration * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const announcementData = {
      id: editingAnnouncement?.id || `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...formData,
      expiresAt,
    };

    try {
      const url = editingAnnouncement 
        ? `/api/admin/announcements/${editingAnnouncement.id}`
        : '/api/admin/announcements';
      
      const method = editingAnnouncement ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(announcementData),
      });

      if (response.ok) {
        await fetchAnnouncements();
        onAnnouncementUpdate?.();
        resetForm();
      } else {
        console.error('Error saving announcement');
      }
    } catch (error) {
      console.error('Error saving announcement:', error);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
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
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-montserrat font-semibold text-xl text-white">Announcements</h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowForm(!showForm);
                if (showForm) {
                  resetForm();
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors flex items-center gap-2"
            >
              <span>➕</span>
              {showForm ? 'Cancel' : 'Create'}
            </button>
            <button
              onClick={fetchAnnouncements}
              className="bg-blue-600 hover:bg-blue-700 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors flex items-center gap-2"
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="overflow-x-auto">
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
                      {isExpired(announcement.expiresAt) ? (
                        <span className="px-2 py-1 rounded text-xs font-montserrat bg-red-500 text-white">
                          Expired
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-montserrat bg-green-500 text-white">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-montserrat text-[#9D9FA9] text-sm">
                      {announcement.expiresAt 
                        ? new Date(announcement.expiresAt).toLocaleDateString()
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
        )}
      </div>
    </div>
  );
}