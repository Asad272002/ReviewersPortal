'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Resource {
  id: string;
  title: string;
  description: string;
  category: 'review-tools' | 'reference-materials' | 'training-materials';
  url?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ResourceManager() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'review-tools' as 'review-tools' | 'reference-materials' | 'training-materials',
    url: '',
    file: null as File | null,
  });
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/admin/resources');
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      } else {
        setErrorMessage('Failed to fetch resources');
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
      setErrorMessage('Error fetching resources');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      let fileUrl = '';
      let fileName = '';
      
      // Upload file if provided
      if (formData.file) {
        const fileFormData = new FormData();
        fileFormData.append('file', formData.file);
        
        const uploadResponse = await fetch('/api/admin/upload', {
          method: 'POST',
          body: fileFormData,
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          fileUrl = uploadData.url;
          fileName = uploadData.fileName;
        } else {
          const err = await uploadResponse.json().catch(() => ({}));
          throw new Error(err?.error || 'File upload failed');
        }
      }

      const resourceData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        url: formData.url,
        fileUrl: fileUrl || (editingResource?.fileUrl || ''),
        fileName: fileName || (editingResource?.fileName || ''),
      };

      const url = editingResource 
        ? `/api/admin/resources/${editingResource.id}`
        : '/api/admin/resources';
      
      const method = editingResource ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resourceData),
      });

      if (response.ok) {
        await fetchResources();
        resetForm();
        setSuccessMessage(editingResource ? 'Resource updated successfully' : 'Resource created successfully');
      } else {
        const err = await response.json().catch(() => ({}));
        setErrorMessage(err?.error || 'Error saving resource');
      }
    } catch (error: any) {
      console.error('Error saving resource:', error);
      setErrorMessage(error?.message || 'Error saving resource');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description,
      category: resource.category,
      url: resource.url || '',
      file: null,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/resources/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchResources();
      } else {
        console.error('Error deleting resource');
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'review-tools',
      url: '',
      file: null,
    });
    setEditingResource(null);
    setShowForm(false);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'review-tools':
        return 'Review Tools';
      case 'reference-materials':
        return 'Reference Materials';
      case 'training-materials':
        return 'Training Materials';
      default:
        return category;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <p className="font-montserrat text-[#9D9FA9]">Loading resources...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-montserrat font-semibold text-xl text-white">Resources</h3>
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
              onClick={fetchResources}
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
            {editingResource ? 'Edit Resource' : 'Create New Resource'}
          </h4>
          {errorMessage && (
            <div className="mb-4 p-3 rounded bg-red-600/20 border border-red-600 text-red-200 font-montserrat">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 rounded bg-green-600/20 border border-green-600 text-green-200 font-montserrat">
              {successMessage}
            </div>
          )}
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
              <label className="block font-montserrat text-[#9D9FA9] mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                required
              />
            </div>
            
            <div>
              <label className="block font-montserrat text-[#9D9FA9] mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
              >
                <option value="review-tools">Review Tools</option>
                <option value="reference-materials">Reference Materials</option>
                <option value="training-materials">Training Materials</option>
              </select>
            </div>
            
            <div>
              <label className="block font-montserrat text-[#9D9FA9] mb-2">External URL (optional)</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                placeholder="https://example.com"
              />
            </div>
            
            <div>
              <label className="block font-montserrat text-[#9D9FA9] mb-2">Upload File (PDF, Images, etc.)</label>
              <input
                type="file"
                onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.svg"
              />
              {editingResource?.fileName && (
                <p className="text-sm text-[#9D9FA9] mt-1">
                  Current file: {editingResource.fileName}
                </p>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={uploading}
                className="bg-[#9050E9] hover:bg-[#A96AFF] disabled:bg-gray-600 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
              >
                {uploading ? 'Uploading...' : editingResource ? 'Update' : 'Create'} Resource
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

      {/* Resources Table */}
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <h4 className="font-montserrat font-semibold text-lg text-white mb-4">Current Resources</h4>
        
        {resources.length === 0 ? (
          <div className="text-center py-8">
            <p className="font-montserrat text-[#9D9FA9] mb-4">No resources found.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors flex items-center gap-2 mx-auto"
            >
              <span>➕</span>
              Create First Resource
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#9D9FA9]">
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Title</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Description</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Category</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Links</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Created</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <tr key={resource.id} className="border-b border-[#9D9FA9]/30 hover:bg-[rgba(144,80,233,0.05)]">
                    <td className="font-montserrat text-white py-3 px-2 font-medium">
                      {resource.title}
                    </td>
                    <td className="font-montserrat text-[#9D9FA9] py-3 px-2 max-w-xs">
                      <div className="truncate" title={resource.description}>
                        {resource.description}
                      </div>
                    </td>
                    <td className="font-montserrat py-3 px-2">
                      <span className="px-2 py-1 rounded text-xs bg-blue-500 text-white">
                        {getCategoryLabel(resource.category)}
                      </span>
                    </td>
                    <td className="font-montserrat py-3 px-2">
                      <div className="flex flex-col gap-1">
                        {resource.url && (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline text-sm"
                          >
                            External Link
                          </a>
                        )}
                        {resource.fileUrl && (
                          <a
                            href={resource.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300 underline text-sm"
                          >
                            {resource.fileName || 'Download File'}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="font-montserrat text-[#9D9FA9] py-3 px-2 text-sm">
                      {resource.createdAt}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(resource)}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors"
                          title="Edit Resource"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(resource.id)}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors"
                          title="Delete Resource"
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