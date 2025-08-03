'use client';

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import InfoCard from "./components/InfoCard";
import Footer from "./components/Footer";
import HeroSection from "./components/HeroSection";
import LogoutButton from "./components/LogoutButton";

import ProtectedRoute from "./components/ProtectedRoute";

export default function Home() {
  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        
        <div className="flex flex-1 relative">
          <Sidebar />
          
          <main className="flex-1 p-8 overflow-auto animate-fadeIn">
            <HeroSection />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              <InfoCard 
                title="Announcements" 
                icon="announcement-header-icon.svg"
                content={[
                  "Important Updates",
                  "Latest Posts"
                ]}
                linkText="See all announcements"
                linkHref="/announcements"
              />
              
              <InfoCard 
                title="Requirement Documents" 
                icon="requirement-header-icon.svg"
                content={[
                  "Key guidelines for Proposers",
                  "Proposal document Checklist",
                  "Document template Links"
                ]}
                linkText="View Documents"
                linkHref="/documents"
              />
              
              <InfoCard 
                title="Process & Guides" 
                icon="process-header-icon.svg"
                content={[
                  "Step-by-Step review overview",
                  "How reviewers assess proposals",
                  "Frequently asked questions"
                ]}
                linkText="View Guides"
                linkHref="/guides"
              />
            </div>
            
            <div className="mt-8 p-6 bg-card-bg rounded-xl border border-border-color shadow-card">
              <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Quick Access</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-background-light rounded-lg border border-border-color hover:border-primary-light transition-colors cursor-pointer">
                  <h3 className="font-montserrat font-medium text-primary-light mb-2">Resources</h3>
                  <p className="font-montserrat text-text-secondary">Access review tools and reference materials</p>
                </div>
                <div className="p-4 bg-background-light rounded-lg border border-border-color hover:border-primary-light transition-colors cursor-pointer">
                  <h3 className="font-montserrat font-medium text-primary-light mb-2">Contact & Support</h3>
                  <p className="font-montserrat text-text-secondary">Get help with the review process</p>
                </div>
              </div>
            </div>
          </main>
        </div>
        
        <LogoutButton />
  
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
