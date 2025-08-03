'use client';

import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import LogoutButton from '../components/LogoutButton';
import ProtectedRoute from '../components/ProtectedRoute';
import Image from 'next/image';
import AnnouncementManager from '../components/admin/AnnouncementManager';
import ResourceManager from '../components/admin/ResourceManager';
import GuideManager from '../components/admin/GuideManager';


interface SheetData {
  announcements: any[];
  resources: any[];
  guides: any[];
  users: any[];
}

export default function AdminManagement() {
  const { user } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sheetData, setSheetData] = useState<SheetData>({
    announcements: [],
    resources: [],
    guides: [],
    users: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('overview');

  useEffect(() => {
    if (user && user.role === 'admin') {
      setIsAuthorized(true);
      fetchSheetData();
    } else {
      setIsAuthorized(false);
    }
  }, [user]);

  const fetchSheetData = async () => {
    setIsLoading(true);
    try {
      // Fetch data from all sheets
      const [announcementsRes, resourcesRes, guidesRes] = await Promise.all([
        fetch('/api/admin/announcements'),
        fetch('/api/admin/resources'),
        fetch('/api/admin/guides')
      ]);

      const announcements = announcementsRes.ok ? await announcementsRes.json() : [];
      const resources = resourcesRes.ok ? await resourcesRes.json() : [];
      const guides = guidesRes.ok ? await guidesRes.json() : [];

      setSheetData({
        announcements: announcements.data || [],
        resources: resources.data || [],
        guides: guides.data || [],
        users: [] // Will be populated when we add user management API
      });
    } catch (error) {
      console.error('Error fetching sheet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAllData = () => {
    fetchSheetData();
  };

  if (!isAuthorized) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col min-h-screen bg-[#0C021E]">
          <Header title="Access Denied" />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 p-8">
              <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-8 text-center">
                <h2 className="font-montserrat font-semibold text-xl text-white mb-4">Access Denied</h2>
                <p className="font-montserrat text-[#9D9FA9]">You need admin privileges to access this page.</p>
              </div>
            </main>
          </div>
          <LogoutButton />
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-montserrat font-semibold text-xl text-white">Google Sheets Data Overview</h3>
          <button
            onClick={refreshAllData}
            className="bg-[#9050E9] hover:bg-[#A96AFF] text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
          >
            🔄 Refresh All Data
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0C021E] rounded-lg p-4 border border-[#9D9FA9]">
            <h4 className="font-montserrat font-medium text-white mb-2">Announcements</h4>
            <p className="text-2xl font-bold text-[#9050E9]">{sheetData.announcements.length}</p>
            <p className="text-sm text-[#9D9FA9]">Total entries</p>
          </div>
          
          <div className="bg-[#0C021E] rounded-lg p-4 border border-[#9D9FA9]">
            <h4 className="font-montserrat font-medium text-white mb-2">Resources</h4>
            <p className="text-2xl font-bold text-[#9050E9]">{sheetData.resources.length}</p>
            <p className="text-sm text-[#9D9FA9]">Total entries</p>
          </div>
          
          <div className="bg-[#0C021E] rounded-lg p-4 border border-[#9D9FA9]">
            <h4 className="font-montserrat font-medium text-white mb-2">Guides</h4>
            <p className="text-2xl font-bold text-[#9050E9]">{sheetData.guides.length}</p>
            <p className="text-sm text-[#9D9FA9]">Total entries</p>
          </div>
        </div>
      </div>
      
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <h3 className="font-montserrat font-semibold text-lg text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveSection('announcements')}
            className="bg-[#0C021E] hover:bg-[#1A0B2E] border border-[#9D9FA9] rounded-lg p-4 text-left transition-colors"
          >
            <h4 className="font-montserrat font-medium text-white mb-2">📢 Manage Announcements</h4>
            <p className="text-sm text-[#9D9FA9]">Create, edit, delete announcements with full CRUD operations</p>
          </button>
          
          <button
            onClick={() => setActiveSection('resources')}
            className="bg-[#0C021E] hover:bg-[#1A0B2E] border border-[#9D9FA9] rounded-lg p-4 text-left transition-colors"
          >
            <h4 className="font-montserrat font-medium text-white mb-2">📚 Manage Resources</h4>
            <p className="text-sm text-[#9D9FA9]">Create, edit, delete resources with file upload support</p>
          </button>
          
          <button
            onClick={() => setActiveSection('guides')}
            className="bg-[#0C021E] hover:bg-[#1A0B2E] border border-[#9D9FA9] rounded-lg p-4 text-left transition-colors"
          >
            <h4 className="font-montserrat font-medium text-white mb-2">📋 Manage Guides</h4>
            <p className="text-sm text-[#9D9FA9]">Create, edit, delete guides with attachments and ordering</p>
          </button>
          

        </div>
      </div>
    </div>
  );

  const renderDataSection = (sectionName: string, data: any[]) => (
    <div className="space-y-6">
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-montserrat font-semibold text-xl text-white capitalize">{sectionName} Data</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSection('overview')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
            >
              ← Back to Overview
            </button>
            <button
              onClick={refreshAllData}
              className="bg-[#9050E9] hover:bg-[#A96AFF] text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        
        {data.length === 0 ? (
          <p className="font-montserrat text-[#9D9FA9] text-center py-8">No data found in Google Sheets</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#9D9FA9]">
                  {Object.keys(data[0] || {}).map((key) => (
                    <th key={key} className="text-left p-3 font-montserrat font-medium text-white capitalize">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={index} className="border-b border-[#9D9FA9]/30 hover:bg-[#0C021E]/50">
                    {Object.values(item).map((value: any, valueIndex) => (
                      <td key={valueIndex} className="p-3 font-montserrat text-[#9D9FA9] max-w-xs truncate">
                        {typeof value === 'string' && value.length > 50 
                          ? `${value.substring(0, 50)}...` 
                          : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
        <h4 className="font-montserrat font-semibold text-lg text-white mb-4">Google Sheets Integration</h4>
        <p className="font-montserrat text-[#9D9FA9] mb-4">
          This data is directly synced with your Google Sheets. Any changes made in the sheets will be reflected here after refreshing.
        </p>
        <div className="flex gap-4">
          <a
            href={`https://docs.google.com/spreadsheets/d/${process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || 'your-sheet-id'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 hover:bg-green-700 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors inline-flex items-center gap-2"
          >
            📊 Open Google Sheets
          </a>
          <button
            onClick={refreshAllData}
            className="bg-blue-600 hover:bg-blue-700 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
          >
            🔄 Sync Data
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-8 text-center">
          <p className="font-montserrat text-[#9D9FA9]">Loading data from Google Sheets...</p>
        </div>
      );
    }

    switch (activeSection) {
      case 'announcements':
        return (
          <div className="space-y-6">
            <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-montserrat font-semibold text-xl text-white">Announcement Management</h3>
                <button
                  onClick={() => setActiveSection('overview')}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
                >
                  ← Back to Overview
                </button>
              </div>
              <AnnouncementManager />
            </div>
          </div>
        );
      case 'resources':
        return (
          <div className="space-y-6">
            <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-montserrat font-semibold text-xl text-white">Resource Management</h3>
                <button
                  onClick={() => setActiveSection('overview')}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
                >
                  ← Back to Overview
                </button>
              </div>
              <ResourceManager />
            </div>
          </div>
        );
      case 'guides':
        return (
          <div className="space-y-6">
            <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-montserrat font-semibold text-xl text-white">Guide Management</h3>
                <button
                  onClick={() => setActiveSection('overview')}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
                >
                  ← Back to Overview
                </button>
              </div>
              <GuideManager />
            </div>
          </div>
        );

      default:
        return renderOverview();
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-[#0C021E]">
        <Header title="Admin Management - Google Sheets Integration" />
        
        <div className="flex flex-1">
          <Sidebar />
          
          <main className="flex-1 p-8">
            {renderContent()}
          </main>
        </div>
        
        <LogoutButton />
        <Footer />
      </div>
    </ProtectedRoute>
  );
}