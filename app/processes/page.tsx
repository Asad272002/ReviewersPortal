'use client';

import { useState, useEffect } from 'react';
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import LogoutButton from "../components/LogoutButton";
import ProtectedRoute from "../components/ProtectedRoute";
import Image from "next/image";
import { useAuth } from '../context/AuthContext';

interface Process {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  order: number;
  isPublished: boolean;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export default function Processes() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/processes');
      if (!response.ok) {
        throw new Error('Failed to fetch processes');
      }
      const data = await response.json();
      setProcesses(data);
    } catch (err) {
      console.error('Error fetching processes:', err);
      setError('Failed to load processes');
    } finally {
      setLoading(false);
    }
  };

  const publishedProcesses = Array.isArray(processes) ? processes.filter(process => process.isPublished).sort((a, b) => a.order - b.order) : [];

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-[#0C021E]">
        <Header title="Process Documentation" />
        
        <div className="flex flex-1">
          <Sidebar />
          
          <main className="flex-1 p-8">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-white font-montserrat">Loading processes...</div>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-red-400 font-montserrat">{error}</div>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                  <h1 className="font-montserrat font-bold text-4xl text-white mb-4">
                    Process Documentation
                  </h1>
                  <p className="font-montserrat text-xl text-[#9D9FA9] max-w-3xl mx-auto">
                    Comprehensive documentation of our processes and procedures to help you understand our workflows and standards.
                  </p>
                </div>

                <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
                  <h2 className="font-montserrat font-semibold text-2xl text-white mb-6">Process Documentation</h2>
                  <div className="space-y-6">
                    {publishedProcesses.length > 0 ? (
                      publishedProcesses.map((process, index) => (
                        <div key={process.id} className={index < publishedProcesses.length - 1 ? "border-b border-[#9D9FA9] pb-6" : ""}>
                          <div className="flex items-center gap-3 mb-3">
                            <Image src="/icons/document-icon.svg" alt="Process" width={24} height={24} />
                            <h3 className="font-montserrat font-medium text-xl text-white">{process.title}</h3>
                            <span className="bg-[#9050E9] text-white px-2 py-1 rounded text-xs font-montserrat">
                              {process.category}
                            </span>
                          </div>
                          <p className="font-montserrat text-[#9D9FA9] mb-3 pl-9">{process.description}</p>
                          {process.content && (
                            <div className="font-montserrat text-[#B8BAC4] mb-3 pl-9 whitespace-pre-wrap">
                              {process.content}
                            </div>
                          )}
                          {process.attachments && process.attachments.length > 0 && (
                            <div className="ml-9 mt-3">
                              <p className="font-montserrat text-sm text-[#9D9FA9] mb-2">Attachments:</p>
                              <div className="flex flex-wrap gap-2">
                                {process.attachments.map((attachment, idx) => (
                                  <a key={idx} href={attachment} target="_blank" rel="noopener noreferrer" className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors bg-[rgba(144,80,233,0.1)] px-3 py-1 rounded border border-[#9050E9]">
                                    📎 Attachment {idx + 1}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="ml-9 mt-3 text-xs text-[#9D9FA9] font-montserrat">
                            Created: {new Date(process.createdAt).toLocaleDateString()}
                            {process.updatedAt !== process.createdAt && (
                              <span className="ml-4">Updated: {new Date(process.updatedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[#9D9FA9] font-montserrat text-center py-8">
                        No process documentation available at this time.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
        
        <Footer />
      </div>
    </ProtectedRoute>
  );
}