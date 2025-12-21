'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { useMotion } from '../context/MotionContext';

interface HeaderProps {
  title?: string;
}

const Header = ({ title = 'Dashboard' }: HeaderProps) => {
  const { user, logout, isLoading } = useAuth();
  const { motionEnabled, toggleMotion } = useMotion();
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
    <header className="flex justify-between items-center py-3 pl-14 pr-4 sm:py-4 sm:pl-20 sm:pr-6 lg:px-8 w-full bg-[#1A0A3A]/80 backdrop-blur-md border-b border-[#9D9FA9]/30 shadow-lg sticky top-0 z-40 transition-all duration-300">
      <div className="flex items-center gap-2 sm:gap-4">
        <h1 className="font-montserrat font-bold text-xl sm:text-2xl lg:text-3xl text-white tracking-wide drop-shadow-md truncate">
          {title}
        </h1>
      </div>
      
      <div className="flex items-center gap-3 sm:gap-6">
        {isLoading ? (
          // Loading Skeleton
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-20 h-8 bg-white/10 rounded-full"></div>
            <div className="w-24 h-6 bg-white/10 rounded"></div>
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div className="w-8 h-8 bg-white/10 rounded-full"></div>
          </div>
        ) : user ? (
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Motion Toggle */}
            <button
              onClick={toggleMotion}
              className={`
                group p-2 rounded-full transition-all duration-300 border
                ${motionEnabled 
                  ? 'bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/50' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}
              `}
              title={motionEnabled ? 'Disable animated background' : 'Enable animated background'}
            >
              <div className={`
                w-5 h-5 flex items-center justify-center transition-all duration-300
                ${motionEnabled ? 'text-primary-light' : 'text-gray-400'}
              `}>
                {motionEnabled ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                    <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
                    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                  </svg>
                )}
              </div>
            </button>

            <Link 
              href="/analysis" 
              className="mr-2 sm:mr-4 font-montserrat text-white hover:text-white transition-all duration-300 flex items-center gap-2 group relative px-3 py-1.5 rounded-full hover:bg-white/10 border border-transparent hover:border-white/10"
            >
                <div className="p-1.5 rounded-full bg-primary/20 text-primary-light group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-[0_0_10px_rgba(144,80,233,0.3)] group-hover:shadow-[0_0_15px_rgba(144,80,233,0.6)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                </div>
                <span className="hidden sm:inline font-medium tracking-wide">Analysis</span>
            </Link>
            
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="font-montserrat font-semibold text-white text-sm sm:text-base tracking-wide">
                {user.name || user.username}
              </span>
              <span className="font-montserrat text-xs text-primary-light uppercase tracking-wider font-bold">
                {user.role}
              </span>
            </div>
            
            <div className="h-8 w-[1px] bg-gradient-to-b from-transparent via-[#9D9FA9]/50 to-transparent mx-1 hidden sm:block"></div>
            
            {/* Profile Menu */}
            <div className="relative" ref={profileMenuRef}>
              <div 
                className="p-1 rounded-full border-2 border-primary/30 hover:border-primary/80 cursor-pointer transform hover:scale-105 hover:shadow-[0_0_15px_rgba(144,80,233,0.4)] transition-all duration-300 bg-[#0C021E]/50 backdrop-blur-sm"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden relative">
                   <Image 
                    src="/icons/profile-icon.svg" 
                    alt="Profile" 
                    fill
                    className="object-cover opacity-90 hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>
              
              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-full mt-3 w-56 bg-[#1A0A3A]/95 backdrop-blur-xl border border-[#9D9FA9]/30 rounded-xl shadow-2xl z-50 animate-fadeIn overflow-hidden">
                  <div className="p-4 border-b border-[#9D9FA9]/20 bg-gradient-to-r from-primary/10 to-transparent">
                    <p className="font-montserrat text-white font-bold text-base truncate">{user.name || user.username}</p>
                    <p className="font-montserrat text-primary-light text-xs font-semibold uppercase tracking-wider mt-0.5">{user.role}</p>
                  </div>
                  <div className="p-2 space-y-1">
                    <Link
                      href="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left font-montserrat text-gray-200 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Image 
                          src="/icons/profile-icon.svg" 
                          alt="Profile" 
                          width={16} 
                          height={16} 
                          className="opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all"
                        />
                      </div>
                      <span className="font-medium">My Profile</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left font-montserrat text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded-lg transition-all duration-200 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                         <Image 
                          src="/icons/logout-icon.svg" 
                          alt="Logout" 
                          width={16} 
                          height={16} 
                          className="opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all"
                        />
                      </div>
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default Header;
