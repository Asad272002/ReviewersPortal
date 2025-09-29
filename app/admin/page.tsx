'use client';

import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';

import ProtectedRoute from '../components/ProtectedRoute';
import AnnouncementManager from '../components/admin/AnnouncementManager';
import ResourceManager from '../components/admin/ResourceManager';
import GuideManager from '../components/admin/GuideManager';
import SupportTicketManager from '../components/admin/SupportTicketManager';
import VotingSettingsManager from '../components/admin/VotingSettingsManager';

type AdminTab = 'announcements' | 'resources' | 'guides' | 'tickets' | 'voting';

export default function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('announcements');
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (user && user.role === 'admin') {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
  }, [user]);

  if (!isAuthorized) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col min-h-screen bg-[#0C021E]">
          <Header title="Admin Panel" />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 p-8">
              <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
                <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Access Denied</h2>
                <p className="font-montserrat text-[#9D9FA9]">You do not have permission to access the admin panel. Only administrators can access this area.</p>
              </div>
            </main>
          </div>
          <LogoutButton />
  
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  const tabs = [
    { id: 'announcements' as AdminTab, label: 'Announcements', icon: '📢' },
    { id: 'resources' as AdminTab, label: 'Resources', icon: '📚' },
    { id: 'guides' as AdminTab, label: 'Process Guides', icon: '📋' },
    { id: 'tickets' as AdminTab, label: 'Support Tickets', icon: '🎫' },
    { id: 'voting' as AdminTab, label: 'Voting Settings', icon: '🗳️' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'announcements':
        return <AnnouncementManager />;
      case 'resources':
        return <ResourceManager />;
      case 'guides':
        return <GuideManager />;
      case 'tickets':
        return <SupportTicketManager />;
      case 'voting':
        return <VotingSettingsManager />;
      default:
        return <AnnouncementManager />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-[#0C021E]">
        <Header title="Admin Panel" />
        
        <div className="flex flex-1">
          <Sidebar />
          
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {/* Tab Navigation */}
            <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-4 sm:p-6 mb-4 sm:mb-6">
              <h2 className="font-montserrat font-semibold text-xl sm:text-2xl text-white mb-3 sm:mb-4">Administration Dashboard</h2>
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 sm:px-4 py-2 rounded font-montserrat font-medium transition-colors text-sm sm:text-base ${
                      activeTab === tab.id
                        ? 'bg-[#9050E9] text-white'
                        : 'bg-[rgba(144,80,233,0.2)] text-[#9D9FA9] hover:bg-[rgba(144,80,233,0.3)]'
                    }`}
                  >
                    <span className="mr-1 sm:mr-2">{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="animate-fadeIn">
              {renderTabContent()}
            </div>
          </main>
        </div>
        
        <Footer />
      </div>
    </ProtectedRoute>
  );
}