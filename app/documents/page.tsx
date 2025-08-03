'use client';

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import LogoutButton from "../components/LogoutButton";

import ProtectedRoute from "../components/ProtectedRoute";
import ProposalForm from "../components/ProposalForm";
import Image from "next/image";
import { useState } from "react";

export default function Documents() {
  const [showProposalForm, setShowProposalForm] = useState(false);
  
  const handleFormSuccess = () => {
    // Optionally hide the form after successful submission
    setTimeout(() => setShowProposalForm(false), 3000);
  };
  
  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-[#0C021E]">
        <Header title="Requirement Documents" />
        
        <div className="flex flex-1">
          <Sidebar />
          
          <main className="flex-1 p-8">
            <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6 mb-6">
              <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Key Guidelines for Proposers</h2>
              <div className="space-y-4">
                <div className="border-b border-[#9D9FA9] pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-6 h-6 flex items-center justify-center bg-[#9050E9] rounded-full">
                      <span className="text-white font-medium">1</span>
                    </div>
                    <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9]">Proposal Structure</h3>
                  </div>
                  <p className="font-montserrat text-[#9D9FA9] pl-9">All proposals must follow the standard structure outlined in the template document.</p>
                </div>
                
                <div className="border-b border-[#9D9FA9] pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-6 h-6 flex items-center justify-center bg-[#9050E9] rounded-full">
                      <span className="text-white font-medium">2</span>
                    </div>
                    <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9]">Budget Breakdown</h3>
                  </div>
                  <p className="font-montserrat text-[#9D9FA9] pl-9">Detailed budget breakdowns must be included with clear justification for all expenses.</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-6 h-6 flex items-center justify-center bg-[#9050E9] rounded-full">
                      <span className="text-white font-medium">3</span>
                    </div>
                    <h3 className="font-montserrat font-medium text-xl text-[#9D9FA9]">Timeline and Milestones</h3>
                  </div>
                  <p className="font-montserrat text-[#9D9FA9] pl-9">Clearly defined milestones with specific deliverables and timeline must be provided.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6 mb-6">
              <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Proposal Document Checklist</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 mt-1 border border-[#9050E9] rounded flex items-center justify-center">
                    <div className="w-3 h-3 bg-[#9050E9] rounded-sm"></div>
                  </div>
                  <p className="font-montserrat text-[#9D9FA9]">Executive Summary (max 500 words)</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 mt-1 border border-[#9050E9] rounded flex items-center justify-center">
                    <div className="w-3 h-3 bg-[#9050E9] rounded-sm"></div>
                  </div>
                  <p className="font-montserrat text-[#9D9FA9]">Problem Statement and Solution</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 mt-1 border border-[#9050E9] rounded flex items-center justify-center">
                    <div className="w-3 h-3 bg-[#9050E9] rounded-sm"></div>
                  </div>
                  <p className="font-montserrat text-[#9D9FA9]">Technical Implementation Details</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 mt-1 border border-[#9050E9] rounded flex items-center justify-center">
                    <div className="w-3 h-3 bg-[#9050E9] rounded-sm"></div>
                  </div>
                  <p className="font-montserrat text-[#9D9FA9]">Team Background and Experience</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 mt-1 border border-[#9050E9] rounded flex items-center justify-center">
                    <div className="w-3 h-3 bg-[#9050E9] rounded-sm"></div>
                  </div>
                  <p className="font-montserrat text-[#9D9FA9]">Budget Breakdown with Justification</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 mt-1 border border-[#9050E9] rounded flex items-center justify-center">
                    <div className="w-3 h-3 bg-[#9050E9] rounded-sm"></div>
                  </div>
                  <p className="font-montserrat text-[#9D9FA9]">Timeline with Milestones</p>
                </div>
              </div>
            </div>
            
            <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6 mb-6">
              <h2 className="font-montserrat font-semibold text-2xl text-white mb-4">Document Templates</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#9D9FA9] pb-4">
                  <div className="flex items-center gap-3">
                    <Image src="/icons/document-icon.svg" alt="Document" width={24} height={24} />
                    <span className="font-montserrat text-[#9D9FA9]">Proposal Template</span>
                  </div>
                  <button className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors hover:scale-105 transition-transform duration-200">
                    Download
                  </button>
                </div>
                
                <div className="flex items-center justify-between border-b border-[#9D9FA9] pb-4">
                  <div className="flex items-center gap-3">
                    <Image src="/icons/document-icon.svg" alt="Document" width={24} height={24} />
                    <span className="font-montserrat text-[#9D9FA9]">Budget Spreadsheet</span>
                  </div>
                  <button className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors hover:scale-105 transition-transform duration-200">
                    Download
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Image src="/icons/document-icon.svg" alt="Document" width={24} height={24} />
                    <span className="font-montserrat text-[#9D9FA9]">Milestone Tracker</span>
                  </div>
                  <button className="font-montserrat text-sm text-[#9050E9] hover:text-[#A96AFF] transition-colors hover:scale-105 transition-transform duration-200">
                    Download
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-[rgba(144,80,233,0.1)] rounded-lg border border-[#9D9FA9] p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-montserrat font-semibold text-2xl text-white">Submit Your Proposal</h2>
                <button 
                  onClick={() => setShowProposalForm(!showProposalForm)}
                  className="btn-primary hover-lift hover-glow"
                >
                  {showProposalForm ? 'Hide Form' : 'Show Form'}
                </button>
              </div>
              
              {showProposalForm ? (
                <ProposalForm onSubmitSuccess={handleFormSuccess} />
              ) : (
                <p className="font-montserrat text-[#9D9FA9] mb-4">
                  Ready to submit your proposal? Click the button above to access the submission form. 
                  Your proposal will be stored in our Google Sheets database for review.
                </p>
              )}
            </div>
          </main>
        </div>
        
        <LogoutButton />
  
        <Footer />
      </div>
    </ProtectedRoute>
  );
}