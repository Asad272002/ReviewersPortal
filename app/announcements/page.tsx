'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import LogoutButton from "../components/LogoutButton";
import ProtectedRoute from "../components/ProtectedRoute";
import AnnouncementManager from "../components/admin/AnnouncementManager";
import Image from "next/image";

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'important' | 'general';
  duration?: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [importantUpdates, setImportantUpdates] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    fetchImportantUpdates();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/admin/announcements');
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      } else {
        setError('Failed to load announcements');
      }
    } catch (error) {
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const fetchImportantUpdates = async () => {
    try {
      const response = await fetch('/api/admin/important-updates');
      if (response.ok) {
        const data = await response.json();
        setImportantUpdates(data || []);
      } else {
        console.error('Failed to load important updates');
      }
    } catch (error) {
      console.error('Failed to load important updates');
    }
  };

  const isAnnouncementActive = (announcement: Announcement) => {
    const now = new Date();
    const expiresAt = announcement.expiresAt ? new Date(announcement.expiresAt) : null;
    
    return !expiresAt || now <= expiresAt;
  };

  const activeAnnouncements = announcements.filter(isAnnouncementActive);
  const importantAnnouncements = activeAnnouncements.filter(a => a.category === 'important');
  const generalAnnouncements = activeAnnouncements.filter(a => a.category === 'general');

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-[#0C021E]">
        <Header title="Announcements" />
        
        <div className="flex flex-1">
          <Sidebar />
          
          <main className="flex-1 p-8">
            {/* Admin/Coordinator Controls */}
            {(user?.role === 'admin' || user?.role === 'coordinator') && (
              <div className="mb-6">
                <button
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                  className="bg-[#9050E9] hover:bg-[#A96AFF] text-white font-montserrat font-medium py-2 px-4 rounded transition-colors mb-4"
                >
                  {showAdminPanel ? 'Hide Management Panel' : 'Show Management Panel'}
                </button>
                
                {showAdminPanel && (
                  <div className="mb-6">
                    <AnnouncementManager onAnnouncementUpdate={fetchAnnouncements} />
                  </div>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-white font-montserrat">Loading announcements...</div>
              </div>
            ) : error ? (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-300">
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                      <Image src="/icons/alert-icon.svg" alt="Alert" width={16} height={16} />
                    </div>
                    <h2 className="font-montserrat font-semibold text-2xl text-white">Important Updates</h2>
                  </div>
                  
                  <div className="space-y-4">
                    {importantUpdates.length > 0 ? (
                      importantUpdates.map((announcement) => (
                        <div key={announcement.id} className="bg-[rgba(255,0,0,0.1)] border border-red-500 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-montserrat font-medium text-lg text-white">{announcement.title}</h3>
                            <span className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded">IMPORTANT</span>
                          </div>
                          <p className="font-montserrat text-[#9D9FA9] mb-3">
                            {announcement.content}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-[#9D9FA9]">
                            <div className="flex items-center gap-2">
                              <Image src="/icons/calendar-icon.svg" alt="Date" width={12} height={12} />
                              <span>Posted: {new Date(announcement.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium">Important</span>
                            </div>
                            {announcement.duration && (
                              <div className="flex items-center gap-2">
                                <span>⏱️ Duration: {announcement.duration} days</span>
                              </div>
                            )}
                            {announcement.expiresAt && (
                              <div className="flex items-center gap-2">
                                <span>📅 Expires: {new Date(announcement.expiresAt).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[#9D9FA9] font-montserrat text-center py-8">
                        No important announcements at this time.
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-[#9050E9] flex items-center justify-center">
                      <Image src="/icons/announcement-icon.svg" alt="Announcement" width={16} height={16} />
                    </div>
                    <h2 className="font-montserrat font-semibold text-2xl text-white">Latest Posts</h2>
                  </div>
                  
                  <div className="space-y-4">
                    {generalAnnouncements.length > 0 ? (
                      generalAnnouncements.map((announcement, index) => (
                        <div key={announcement.id} className={index < generalAnnouncements.length - 1 ? "border-b border-[#9D9FA9] pb-4" : ""}>
                          <h3 className="font-montserrat font-medium text-lg text-white mb-2">{announcement.title}</h3>
                          <p className="font-montserrat text-[#9D9FA9] mb-3">
                            {announcement.content}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-[#9D9FA9]">
                            <div className="flex items-center gap-2">
                              <Image src="/icons/calendar-icon.svg" alt="Date" width={12} height={12} />
                              <span>Posted: {new Date(announcement.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium">General</span>
                            </div>
                            {announcement.duration && (
                              <div className="flex items-center gap-2">
                                <span>⏱️ Duration: {announcement.duration} days</span>
                              </div>
                            )}
                            {announcement.expiresAt && (
                              <div className="flex items-center gap-2">
                                <span>📅 Expires: {new Date(announcement.expiresAt).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[#9D9FA9] font-montserrat text-center py-8">
                        No general announcements at this time.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
        

        
        <LogoutButton />
        <Footer />
      </div>
    </ProtectedRoute>
  );
}