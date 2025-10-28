'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Guide {
  id: string;
  title: string;
  description: string;
  content: string;
  order: number;
  isPublished: boolean;
  attachments: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export default function GuideManager() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    order: 1,
    isPublished: true,
    files: [] as File[],
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    try {
      const response = await fetch('/api/admin/guides');
      if (response.ok) {
        const data = await response.json();
        setGuides(data.guides || []);
      }
    } catch (error) {
      console.error('Error fetching guides:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      let attachments: any[] = [];
      
      // Upload files if provided
      if (formData.files.length > 0) {
        for (const file of formData.files) {
          const fileFormData = new FormData();
          fileFormData.append('file', file);
          
          const uploadResponse = await fetch('/api/admin/upload', {
            method: 'POST',
            body: fileFormData,
          });
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            attachments.push({
              fileName: uploadData.fileName,
              fileUrl: uploadData.url,
              fileType: file.type,
            });
          }
        }
      }

      const guideData = {
        title: formData.title,
        description: formData.description,
        content: formData.content,
        order: formData.order,
        isPublished: formData.isPublished,
        attachments: editingGuide ? [...(editingGuide.attachments || []), ...attachments] : attachments,
      };

      const url = editingGuide 
        ? `/api/admin/guides/${editingGuide.id}`
        : '/api/admin/guides';
      
      const method = editingGuide ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(guideData),
      });

      if (response.ok) {
        await fetchGuides();
        resetForm();
      } else {
        console.error('Error saving guide');
      }
    } catch (error) {
      console.error('Error saving guide:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (guide: Guide) => {
    setEditingGuide(guide);
    setFormData({
      title: guide.title,
      description: guide.description,
      content: guide.content,
      order: guide.order,
      isPublished: guide.isPublished,
      files: [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this guide?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/guides/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchGuides();
      } else {
        console.error('Error deleting guide');
      }
    } catch (error) {
      console.error('Error deleting guide:', error);
    }
  };

  const handleRemoveAttachment = async (guideId: string, attachmentId: string) => {
    if (!confirm('Are you sure you want to remove this attachment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/guides/${guideId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchGuides();
      } else {
        console.error('Error removing attachment');
      }
    } catch (error) {
      console.error('Error removing attachment:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content: '',
      order: 1,
      isPublished: true,
      files: [],
    });
    setEditingGuide(null);
    setShowForm(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData({ ...formData, files });
  };

  if (isLoading) {
    return (
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <p className="font-montserrat text-[#9D9FA9]">Loading guides...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h3 className="font-montserrat font-semibold text-xl text-white w-full sm:w-auto">Process Guides</h3>
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
              onClick={fetchGuides}
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
            {editingGuide ? 'Edit Guide' : 'Create New Guide'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block font-montserrat text-[#9D9FA9] mb-2">Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  min="1"
                  className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block font-montserrat text-[#9D9FA9] mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                required
              />
            </div>
            
            <div>
              <label className="block font-montserrat text-[#9D9FA9] mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                placeholder="Write your guide content here. You can use markdown formatting."
                required
              />
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 font-montserrat text-[#9D9FA9]">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="rounded"
                />
                Published
              </label>
            </div>
            
            <div>
              <label className="block font-montserrat text-[#9D9FA9] mb-2">Upload Files (PDFs, Images, etc.)</label>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.svg"
              />
              {formData.files.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-[#9D9FA9] mb-1">Selected files:</p>
                  <ul className="text-sm text-[#9D9FA9]">
                    {formData.files.map((file, index) => (
                      <li key={index}>• {file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={uploading}
                className="bg-[#9050E9] hover:bg-[#A96AFF] disabled:bg-gray-600 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
              >
                {uploading ? 'Uploading...' : editingGuide ? 'Update' : 'Create'} Guide
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

      {/* Guides Table */}
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <h4 className="font-montserrat font-semibold text-lg text-white mb-4">Current Guides</h4>
        
        {guides.length === 0 ? (
          <div className="text-center py-8">
            <p className="font-montserrat text-[#9D9FA9] mb-4">No guides found.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors flex items-center gap-2 mx-auto"
            >
              <span>➕</span>
              Create First Guide
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#9D9FA9]">
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Order</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Title</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Description</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Status</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Attachments</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Created</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {guides
                  .sort((a, b) => a.order - b.order)
                  .map((guide) => (
                    <tr key={guide.id} className="border-b border-[#9D9FA9]/30 hover:bg-[rgba(144,80,233,0.05)]">
                      <td className="font-montserrat py-3 px-2">
                        <span className="px-2 py-1 rounded text-xs bg-blue-500 text-white">
                          #{guide.order}
                        </span>
                      </td>
                      <td className="font-montserrat text-white py-3 px-2 font-medium">
                        {guide.title}
                      </td>
                      <td className="font-montserrat text-[#9D9FA9] py-3 px-2 max-w-xs">
                        <div className="truncate" title={guide.description}>
                          {guide.description}
                        </div>
                      </td>
                      <td className="font-montserrat py-3 px-2">
                        {guide.isPublished ? (
                          <span className="px-2 py-1 rounded text-xs bg-green-500 text-white">
                            Published
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs bg-yellow-500 text-black">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="font-montserrat py-3 px-2">
                        {guide.attachments && guide.attachments.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {guide.attachments.slice(0, 2).map((attachment) => (
                              <div key={attachment.id} className="flex items-center gap-1">
                                <a
                                  href={attachment.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                                >
                                  {attachment.fileName.length > 15 
                                    ? attachment.fileName.substring(0, 15) + '...' 
                                    : attachment.fileName}
                                </a>
                                <button
                                  onClick={() => handleRemoveAttachment(guide.id, attachment.id)}
                                  className="text-red-400 hover:text-red-300 text-xs"
                                  title="Remove attachment"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            {guide.attachments.length > 2 && (
                              <span className="text-xs text-[#9D9FA9]">
                                +{guide.attachments.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#9D9FA9] text-sm">None</span>
                        )}
                      </td>
                      <td className="font-montserrat text-[#9D9FA9] py-3 px-2 text-sm">
                        {new Date(guide.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(guide)}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors"
                            title="Edit Guide"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(guide.id)}
                            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors"
                            title="Delete Guide"
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