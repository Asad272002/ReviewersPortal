'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title?: string;
}

const Header = ({ title = 'Dashboard' }: HeaderProps) => {
  const { user, logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsProfileMenuOpen(false);
  };
  
  return (
    <header className="flex justify-between items-center py-3 pl-14 pr-4 sm:py-4 sm:pl-20 sm:pr-6 lg:px-6 w-full bg-card-bg border-b border-border-color shadow-sm transition-all">
      <div className="flex items-center gap-2 sm:gap-4">
        <h1 className="font-montserrat font-medium text-xl sm:text-2xl lg:text-3xl text-primary-light truncate">{title}</h1>
      </div>
      
      <div className="flex items-center gap-3 sm:gap-6">
        {user && (
          <div className="flex items-center gap-3">
            <Link 
              href="/analysis" 
              className="mr-2 sm:mr-4 font-montserrat text-text-secondary hover:text-primary transition-colors duration-300 flex items-center gap-2 group"
            >
                <div className="p-1.5 rounded-full bg-white/5 group-hover:bg-primary/20 transition-all duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                </div>
                <span className="hidden sm:inline">Analysis</span>
            </Link>
            <span className="font-montserrat text-text-secondary text-base sm:text-lg hover:text-white transition-colors duration-300 hover:scale-105 inline-block truncate max-w-32 sm:max-w-none">
              {user.name}
            </span>
            <div className="h-6 w-[1px] bg-border-color"></div>
          </div>
        )}
        
        {/* Profile Menu */}
        <div className="relative" ref={profileMenuRef}>
          <div 
            className="p-1.5 sm:p-2 rounded-full hover:bg-background-light transition-all duration-300 cursor-pointer transform hover:scale-110 hover:shadow-glow"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          >
            <Image 
              src="/icons/profile-icon.svg" 
              alt="Profile" 
              width={24} 
              height={28} 
              className="sm:w-[30px] sm:h-[35px] opacity-80 hover:opacity-100 transition-opacity duration-300"
            />
          </div>
          
          {/* Profile Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 sm:w-48 bg-[#1A0A3A] border border-[#9D9FA9] rounded-lg shadow-lg z-50 animate-fadeIn">
              <div className="p-2 sm:p-3 border-b border-[#9D9FA9]">
                <p className="font-montserrat text-white font-medium text-sm sm:text-base truncate">{user?.name}</p>
                <p className="font-montserrat text-gray-400 text-xs sm:text-sm capitalize">{user?.role}</p>
              </div>
              <div className="p-1.5 sm:p-2 space-y-1.5">
                <Link
                  href="/profile"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 text-left font-montserrat text-gray-300 hover:text-white hover:bg-[#2A1A4A] rounded transition-colors duration-200 text-sm sm:text-base"
                >
                  <Image 
                    src="/icons/profile-icon.svg" 
                    alt="Profile" 
                    width={14} 
                    height={14} 
                    className="sm:w-4 sm:h-4 opacity-70"
                  />
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 text-left font-montserrat text-gray-300 hover:text-white hover:bg-[#2A1A4A] rounded transition-colors duration-200 text-sm sm:text-base"
                >
                  <Image 
                    src="/icons/logout-icon.svg" 
                    alt="Logout" 
                    width={14} 
                    height={14} 
                    className="sm:w-4 sm:h-4 opacity-70"
                  />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;