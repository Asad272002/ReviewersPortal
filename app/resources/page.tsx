'use client';

import { useState, useEffect } from 'react';
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import LogoutButton from "../components/LogoutButton";

import ProtectedRoute from "../components/ProtectedRoute";
import Image from "next/image";

import { useAuth } from '../context/AuthContext';
import ResourceManager from "../components/admin/ResourceManager";

interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  url?: string;
  fileUrl?: string;
  fileName?: string;
  attachments?: string[];
  createdAt: string;
}

export default function Resources() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        setError('Failed to load resources');
      }
    } catch (error) {
      setError('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const getResourcesByCategory = (category: string) => {
    return resources.filter(resource => resource.category === category);
  };
  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-[#0C021E]">
        <Header title="Resources" />
        
        <div className="flex flex-1">
          <Sidebar />
          
          <main className="flex-1 p-8">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-white font-montserrat">Loading resources...</div>
              </div>
            ) : error ? (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-300">
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
                  <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Review Tools</h2>
                  <div className="space-y-4">
                    {getResourcesByCategory('Review Tools').length > 0 ? (
                      getResourcesByCategory('Review Tools').map((resource, index) => (
                        <div key={resource.id} className={index < getResourcesByCategory('Review Tools').length - 1 ? "border-b border-[#9D9FA9] pb-4" : ""}>
                          <div className="flex items-center gap-3 mb-2">
                            <Image src="/icons/resources-icon.svg" alt="Tool" width={24} height={24} />
                            <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9]">{resource.title}</h3>
                          </div>
                          <p className="font-montserrat text-[#9D9FA9] mb-2 pl-9">{resource.description}</p>
                          {resource.url && (
                            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors ml-9">
                              Access Tool
                            </a>
                          )}
                          {resource.attachments && resource.attachments.length > 0 && (
                            <div className="ml-9 mt-2">
                              {resource.attachments.map((attachment, idx) => (
                                <a key={idx} href={attachment} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors mr-4">
                                  Download {idx + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-[#9D9FA9] font-montserrat text-center py-8">
                        No review tools available at this time.
                      </div>
                    )}
                  </div>
                </div>
              
                <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
                  <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Reference Materials</h2>
                  <div className="space-y-4">
                    {getResourcesByCategory('Reference Materials').length > 0 ? (
                      getResourcesByCategory('Reference Materials').map((resource, index) => (
                        <div key={resource.id} className={index < getResourcesByCategory('Reference Materials').length - 1 ? "border-b border-[#9D9FA9] pb-4" : ""}>
                          <div className="flex items-center gap-3 mb-2">
                            <Image src="/icons/document-icon.svg" alt="Document" width={24} height={24} />
                            <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9]">{resource.title}</h3>
                          </div>
                          <p className="font-montserrat text-[#9D9FA9] mb-2 pl-9">{resource.description}</p>
                          <div className="ml-9 mt-2 space-y-1">
                            {resource.url && (
                              <a href={resource.url} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors block">
                                🔗 View Document
                              </a>
                            )}
                            {resource.fileUrl && (
                              <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors block">
                                📁 {resource.fileName || 'Download File'}
                              </a>
                            )}
                            {resource.attachments && resource.attachments.length > 0 && (
                              <div className="space-y-1">
                                {resource.attachments.map((attachment, idx) => (
                                  <a key={idx} href={attachment} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors block">
                                    📎 Download {idx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[#9D9FA9] font-montserrat text-center py-8">
                        No reference materials available at this time.
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
                  <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Training Materials</h2>
                  <div className="space-y-4">
                    {getResourcesByCategory('Training Materials').length > 0 ? (
                      getResourcesByCategory('Training Materials').map((resource, index) => (
                        <div key={resource.id} className={index < getResourcesByCategory('Training Materials').length - 1 ? "border-b border-[#9D9FA9] pb-4" : ""}>
                          <div className="flex items-center gap-3 mb-2">
                            <Image src="/icons/resources-icon.svg" alt="Training" width={24} height={24} />
                            <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9]">{resource.title}</h3>
                          </div>
                          <p className="font-montserrat text-[#9D9FA9] mb-2 pl-9">{resource.description}</p>
                          <div className="ml-9 mt-2 space-y-1">
                            {resource.url && (
                              <a href={resource.url} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors block">
                                🔗 Access Training
                              </a>
                            )}
                            {resource.fileUrl && (
                              <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors block">
                                📁 {resource.fileName || 'Download File'}
                              </a>
                            )}
                            {resource.attachments && resource.attachments.length > 0 && (
                              <div className="space-y-1">
                                {resource.attachments.map((attachment, idx) => (
                                  <a key={idx} href={attachment} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors block">
                                    📎 Download {idx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[#9D9FA9] font-montserrat text-center py-8">
                        No training materials available at this time.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
        
        {user?.role === 'admin' && (
          <div className="p-8">
            <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Manage Resources</h2>
            <ResourceManager />
          </div>
        )}
        
        <LogoutButton />
  
        <Footer />
      </div>
    </ProtectedRoute>
  );
}



