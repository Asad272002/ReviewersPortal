'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ProcessDoc {
  id: string;
  title: string;
  description: string;
  content: string;
  category: 'workflow' | 'guidelines' | 'procedures' | 'templates';
  order: number;
  status: 'published' | 'draft' | 'archived';
  attachments: {
    links: { title: string; url: string }[];
    files: { title: string; url: string; type: 'pdf' | 'doc' | 'excel' | 'powerpoint' }[];
  };
  createdAt: string;
  updatedAt: string;
}

export default function ProcessManager() {
  const [processes, setProcesses] = useState<ProcessDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProcess, setEditingProcess] = useState<ProcessDoc | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: 'workflow' as 'workflow' | 'guidelines' | 'procedures' | 'templates',
    status: 'draft' as 'published' | 'draft' | 'archived',
    attachments: {
      links: [] as { title: string; url: string }[],
      files: [] as { title: string; url: string; type: 'pdf' | 'doc' | 'excel' | 'powerpoint' }[]
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [syncingToSheets, setSyncingToSheets] = useState(false);

  // URL validation helper
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      const response = await fetch('/api/admin/processes');
      if (response.ok) {
        const data = await response.json();
        setProcesses(data.processes || []);
      }
    } catch (error) {
      console.error('Error fetching processes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Validate URLs in attachments
    const invalidLinks = formData.attachments.links.filter(link => link.url && !isValidUrl(link.url));
    const invalidFiles = formData.attachments.files.filter(file => file.url && !isValidUrl(file.url));
    
    if (invalidLinks.length > 0 || invalidFiles.length > 0) {
      alert('Please enter valid URLs for all links and files.');
      setSubmitting(false);
      return;
    }

    try {
      const url = editingProcess 
        ? `/api/admin/processes/${editingProcess.id}`
        : '/api/admin/processes';
      
      const method = editingProcess ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchProcesses();
        resetForm();
        setShowForm(false);
      } else {
        console.error('Error saving process');
      }
    } catch (error) {
      console.error('Error saving process:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (process: ProcessDoc) => {
    setEditingProcess(process);
    setFormData({
      title: process.title,
      description: process.description,
      content: process.content,
      category: process.category,
      status: process.status,
      attachments: process.attachments
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this process document?')) return;

    try {
      const response = await fetch(`/api/admin/processes/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchProcesses();
      }
    } catch (error) {
      console.error('Error deleting process:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content: '',
      category: 'workflow',
      status: 'draft',
      attachments: {
        links: [],
        files: []
      }
    });
    setEditingProcess(null);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'workflow': return '🔄';
      case 'guidelines': return '📋';
      case 'procedures': return '📝';
      case 'templates': return '📄';
      default: return '📚';
    }
  };

  const filteredProcesses = processes.filter(process => {
    if (statusFilter === 'all') return true;
    return process.status === statusFilter;
  });

  const syncToGoogleSheets = async () => {
    setSyncingToSheets(true);
    try {
      const response = await fetch('/api/admin/sync-processes-to-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ processes }),
      });

      if (response.ok) {
        alert('Successfully synced processes to Google Sheets!');
      } else {
        alert('Failed to sync to Google Sheets. Please try again.');
      }
    } catch (error) {
      console.error('Error syncing to Google Sheets:', error);
      alert('Error syncing to Google Sheets. Please try again.');
    } finally {
      setSyncingToSheets(false);
    }
  };



  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="font-montserrat text-gray-300">Loading process documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-montserrat font-semibold text-xl text-white mb-2">Process Documentation</h3>
          <p className="font-montserrat text-gray-300">Manage workflow processes, guidelines, and procedures</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={syncToGoogleSheets}
            disabled={syncingToSheets}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {syncingToSheets ? 'Syncing...' : '📊 Sync to Sheets'}
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-[#9050E9] hover:bg-[#A96AFF] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-colors"
          >
            + Add Process Document
          </button>
        </div>
      </div>

      {/* Status Filter Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg font-montserrat font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-[#9050E9] text-white'
              : 'bg-[#1A0B2E] text-gray-300 hover:bg-[#2A1B3E]'
          }`}
        >
          All ({processes.length})
        </button>
        <button
          onClick={() => setStatusFilter('published')}
          className={`px-4 py-2 rounded-lg font-montserrat font-medium transition-colors ${
            statusFilter === 'published'
              ? 'bg-green-600 text-white'
              : 'bg-[#1A0B2E] text-gray-300 hover:bg-[#2A1B3E]'
          }`}
        >
          Published ({processes.filter(p => p.status === 'published').length})
        </button>
        <button
          onClick={() => setStatusFilter('draft')}
          className={`px-4 py-2 rounded-lg font-montserrat font-medium transition-colors ${
            statusFilter === 'draft'
              ? 'bg-yellow-600 text-white'
              : 'bg-[#1A0B2E] text-gray-300 hover:bg-[#2A1B3E]'
          }`}
        >
          Draft ({processes.filter(p => p.status === 'draft').length})
        </button>
        <button
          onClick={() => setStatusFilter('archived')}
          className={`px-4 py-2 rounded-lg font-montserrat font-medium transition-colors ${
            statusFilter === 'archived'
              ? 'bg-gray-600 text-white'
              : 'bg-[#1A0B2E] text-gray-300 hover:bg-[#2A1B3E]'
          }`}
        >
          Archived ({processes.filter(p => p.status === 'archived').length})
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-[#1A0B2E] rounded-lg border border-[#9D9FA9] p-6">
          <h4 className="font-montserrat font-semibold text-lg text-white mb-4">
            {editingProcess ? 'Edit Process Document' : 'Add New Process Document'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-montserrat text-sm font-medium text-white mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#0C021E] border border-[#9D9FA9] rounded-lg px-3 py-2 text-white font-montserrat focus:outline-none focus:border-[#9050E9]"
                  required
                />
              </div>
              <div>
                <label className="block font-montserrat text-sm font-medium text-white mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-[#0C021E] border border-[#9D9FA9] rounded-lg px-3 py-2 text-white font-montserrat focus:outline-none focus:border-[#9050E9]"
                  required
                >
                  <option value="workflow" className="bg-gray-800 text-white">Workflow</option>
                  <option value="guidelines" className="bg-gray-800 text-white">Guidelines</option>
                  <option value="procedures" className="bg-gray-800 text-white">Procedures</option>
                  <option value="templates" className="bg-gray-800 text-white">Templates</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-montserrat text-sm font-medium text-white mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'published' | 'draft' | 'archived' })}
                className="w-full bg-[#0C021E] border border-[#9D9FA9] rounded-lg px-3 py-2 text-white font-montserrat focus:outline-none focus:border-[#9050E9]"
                required
              >
                <option value="draft" className="bg-gray-800 text-white">Draft</option>
                <option value="published" className="bg-gray-800 text-white">Published</option>
                <option value="archived" className="bg-gray-800 text-white">Archived</option>
              </select>
            </div>

            <div>
              <label className="block font-montserrat text-sm font-medium text-white mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-[#0C021E] border border-[#9D9FA9] rounded-lg px-3 py-2 text-white font-montserrat focus:outline-none focus:border-[#9050E9] h-20 resize-none"
                required
              />
            </div>

            <div>
              <label className="block font-montserrat text-sm font-medium text-white mb-2">
                Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full bg-[#0C021E] border border-[#9D9FA9] rounded-lg px-3 py-2 text-white font-montserrat focus:outline-none focus:border-[#9050E9] h-40 resize-none"
                placeholder="Enter the detailed process documentation content..."
                required
              />
            </div>

            {/* Links Section */}
            <div>
              <label className="block font-montserrat text-sm font-medium text-white mb-2">
                Links
              </label>
              <div className="space-y-2">
                {formData.attachments.links.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Link title"
                      value={link.title}
                      onChange={(e) => {
                        const newLinks = [...formData.attachments.links];
                        newLinks[index].title = e.target.value;
                        setFormData({ ...formData, attachments: { ...formData.attachments, links: newLinks } });
                      }}
                      className="flex-1 bg-[#0C021E] border border-[#9D9FA9] rounded-lg px-3 py-2 text-white font-montserrat focus:outline-none focus:border-[#9050E9]"
                    />
                    <input
                      type="url"
                      placeholder="https://example.com"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...formData.attachments.links];
                        newLinks[index].url = e.target.value;
                        setFormData({ ...formData, attachments: { ...formData.attachments, links: newLinks } });
                      }}
                      className="flex-1 bg-[#0C021E] border border-[#9D9FA9] rounded-lg px-3 py-2 text-white font-montserrat focus:outline-none focus:border-[#9050E9]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newLinks = formData.attachments.links.filter((_, i) => i !== index);
                        setFormData({ ...formData, attachments: { ...formData.attachments, links: newLinks } });
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newLinks = [...formData.attachments.links, { title: '', url: '' }];
                    setFormData({ ...formData, attachments: { ...formData.attachments, links: newLinks } });
                  }}
                  className="bg-[#9050E9] hover:bg-[#A96AFF] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  + Add Link
                </button>
              </div>
            </div>

            {/* Files Section */}
            <div>
              <label className="block font-montserrat text-sm font-medium text-white mb-2">
                Files (PDFs, Documents)
              </label>
              <div className="space-y-2">
                {formData.attachments.files.map((file, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="File title"
                      value={file.title}
                      onChange={(e) => {
                        const newFiles = [...formData.attachments.files];
                        newFiles[index].title = e.target.value;
                        setFormData({ ...formData, attachments: { ...formData.attachments, files: newFiles } });
                      }}
                      className="flex-1 bg-[#0C021E] border border-[#9D9FA9] rounded-lg px-3 py-2 text-white font-montserrat focus:outline-none focus:border-[#9050E9]"
                    />
                    <input
                      type="url"
                      placeholder="https://example.com/file.pdf"
                      value={file.url}
                      onChange={(e) => {
                        const newFiles = [...formData.attachments.files];
                        newFiles[index].url = e.target.value;
                        setFormData({ ...formData, attachments: { ...formData.attachments, files: newFiles } });
                      }}
                      className="flex-1 bg-[#0C021E] border border-[#9D9FA9] rounded-lg px-3 py-2 text-white font-montserrat focus:outline-none focus:border-[#9050E9]"
                    />
                    <select
                      value={file.type}
                      onChange={(e) => {
                        const newFiles = [...formData.attachments.files];
                        newFiles[index].type = e.target.value as 'pdf' | 'doc' | 'excel' | 'powerpoint';
                        setFormData({ ...formData, attachments: { ...formData.attachments, files: newFiles } });
                      }}
                      className="bg-[#0C021E] border border-[#9D9FA9] rounded-lg px-3 py-2 text-white font-montserrat focus:outline-none focus:border-[#9050E9]"
                    >
                      <option value="pdf" className="bg-gray-800 text-white">PDF</option>
                        <option value="doc" className="bg-gray-800 text-white">Document</option>
                        <option value="excel" className="bg-gray-800 text-white">Excel</option>
                        <option value="powerpoint" className="bg-gray-800 text-white">PowerPoint</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const newFiles = formData.attachments.files.filter((_, i) => i !== index);
                        setFormData({ ...formData, attachments: { ...formData.attachments, files: newFiles } });
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newFiles = [...formData.attachments.files, { title: '', url: '', type: 'pdf' as const }];
                    setFormData({ ...formData, attachments: { ...formData.attachments, files: newFiles } });
                  }}
                  className="bg-[#9050E9] hover:bg-[#A96AFF] text-white font-montserrat font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  + Add File
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#9050E9] hover:bg-[#A96AFF] disabled:bg-gray-600 text-white font-montserrat font-medium py-2 px-6 rounded-lg transition-colors"
              >
                {submitting ? 'Saving...' : (editingProcess ? 'Update' : 'Create')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white font-montserrat font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Process List */}
      <div className="space-y-4">
        {filteredProcesses.length === 0 ? (
          <div className="bg-[#1A0B2E] rounded-lg border border-[#9D9FA9] p-8 text-center">
            <p className="font-montserrat text-gray-300">
              {processes.length === 0 
                ? 'No process documents found. Create your first one!' 
                : `No ${statusFilter === 'all' ? '' : statusFilter} processes found.`
              }
            </p>
          </div>
        ) : (
          filteredProcesses.map((process) => (
            <div key={process.id} className="bg-[#1A0B2E] rounded-lg border border-[#9D9FA9] p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getCategoryIcon(process.category)}</span>
                    <h4 className="font-montserrat font-semibold text-lg text-white">{process.title}</h4>
                    <span className={`text-sm font-medium px-2 py-1 rounded ${
                      process.status === 'published' ? 'bg-green-600 text-white' :
                      process.status === 'draft' ? 'bg-yellow-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {process.status.charAt(0).toUpperCase() + process.status.slice(1)}
                    </span>
                  </div>
                  <p className="font-montserrat text-gray-300 mb-2">{process.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>Category: {process.category}</span>
                    <span>Order: {process.order}</span>
                    <span>Updated: {new Date(process.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(process)}
                    className="bg-[#9050E9] hover:bg-[#A96AFF] text-white font-montserrat font-medium py-1 px-3 rounded transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(process.id)}
                    className="bg-red-600 hover:bg-red-700 text-white font-montserrat font-medium py-1 px-3 rounded transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {/* Content Preview */}
              <div className="bg-[#0C021E] rounded-lg p-4 border border-[#9D9FA9]">
                <h5 className="font-montserrat font-medium text-white mb-2">Content Preview:</h5>
                <p className="font-montserrat text-gray-300 text-sm line-clamp-3">
                  {process.content.substring(0, 200)}...
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}