'use client';

import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import ReviewerAssignmentView from "../components/ReviewerAssignmentView";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

export default function AssignmentsPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['reviewer']}>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <Header />
        
        <div className="flex flex-1 relative z-10">
          <Sidebar />
          
          <main className="flex-1 p-8 overflow-auto animate-fadeIn relative">
            <div className="mb-8">
              <h1 className="font-montserrat font-bold text-4xl text-white mb-4">
                My Review Assignments
              </h1>
              <p className="font-montserrat text-xl text-gray-300">
                View and manage your team review assignments
              </p>
            </div>
            
            <ReviewerAssignmentView />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}