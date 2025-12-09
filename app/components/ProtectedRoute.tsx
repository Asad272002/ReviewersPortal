'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if not loading and not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while authentication is being verified
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0C021E]">
        <div className="text-[#9D9FA9] text-xl">Loading...</div>
      </div>
    );
  }

  // Don't render children until authentication is confirmed
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0C021E]">
        <div className="text-[#9D9FA9] text-xl">Redirecting to login...</div>
      </div>
    );
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0C021E]">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-2">Access Denied</div>
          <div className="text-[#9D9FA9]">You don't have permission to access this page.</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;