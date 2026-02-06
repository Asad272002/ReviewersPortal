'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface NavItemProps {
  icon: string;
  label: string;
  href: string;
  active?: boolean;
  multiline?: boolean;
  onClick?: () => void;
}

const NavItem = ({ icon, label, href, active = false, multiline = false, onClick }: NavItemProps) => {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={`relative group flex items-center gap-4 py-3 px-4 w-full rounded-xl transition-all duration-300 ${
        active 
          ? 'bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]' 
          : 'text-gray-400 hover:text-white hover:bg-white/5 hover:translate-x-1'
      }`}
    >
      <div className={`relative z-10 w-6 h-6 flex items-center justify-center transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        <Image 
          src={`/icons/${icon}`} 
          alt={label} 
          width={20} 
          height={20} 
          className={`transition-all duration-300 ${active ? 'brightness-100' : 'brightness-75 group-hover:brightness-100'}`}
        />
      </div>
      <span className={`relative z-10 font-montserrat text-sm font-medium ${multiline ? 'leading-tight' : ''} tracking-wide`}>
        {label}
      </span>
      {active && (
        <div className="absolute inset-0 rounded-xl bg-white/10 animate-pulse-slow"></div>
      )}
    </Link>
  );
};

const Sidebar = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleToggle = () => {
      setIsMobileMenuOpen((prev) => !prev);
    };

    window.addEventListener('sidebar-toggle', handleToggle);

    return () => {
      window.removeEventListener('sidebar-toggle', handleToggle);
    };
  }, []);
  
  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={closeMobileMenu}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative top-0 left-0 z-40 lg:z-auto
        flex flex-col h-full lg:h-full
        w-72 sm:w-[280px]
        bg-[#0C021E] lg:bg-[#0C021E]/90 backdrop-blur-xl
        border-r border-white/10 shadow-2xl
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo / Header Area */}
        <div className="pt-8 pb-8 px-6 mb-2">
          <div className="flex flex-col gap-1">
            <h2 className="font-montserrat font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              Review Circle
            </h2>
            <div className="flex items-center gap-2">
              <div className="h-px w-8 bg-gradient-to-r from-[#6366f1] to-transparent"></div>
              <p className="font-montserrat text-xs font-medium text-[#a855f7] uppercase tracking-wider">
                {user?.role === 'admin' ? 'Admin Portal' : user?.role === 'reviewer' ? 'Reviewer Portal' : user?.role === 'team' ? 'Team Portal' : 'Portal'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <NavItem 
            icon="dashboard-icon.svg" 
            label="Dashboard" 
            href="/"
            active={pathname === '/'} 
            onClick={closeMobileMenu}
          />
        {user?.role === 'reviewer' && (
          <NavItem 
            icon="profile-icon.svg" 
            label="My Assignments" 
            href="/assignments"
            active={pathname === '/assignments'} 
            multiline={true} 
            onClick={closeMobileMenu}
          />
        )}
        {(user?.role === 'reviewer' || user?.role === 'admin') && (
          <NavItem 
            icon="documents-icon.svg" 
            label="Milestone Report Submit" 
            href="/milestone-report"
            active={pathname === '/milestone-report'} 
            multiline={true} 
            onClick={closeMobileMenu}
          />
        )}
        <NavItem 
          icon="announcements-icon.svg" 
          label="Announcements" 
          href="/announcements"
          active={pathname === '/announcements'} 
          onClick={closeMobileMenu}
        />
        <NavItem 
          icon="documents-icon.svg" 
          label="Idea Box" 
          href="/documents"
          active={pathname === '/documents'} 
          multiline={true} 
          onClick={closeMobileMenu}
        />
        <NavItem 
          icon="resources-icon.svg" 
          label="Resources" 
          href="/resources"
          active={pathname === '/resources'} 
          onClick={closeMobileMenu}
        />

        <NavItem 
          icon="vote-icon.svg" 
          label="Vote for Proposals" 
          href="/vote-proposals"
          active={pathname === '/vote-proposals'} 
          multiline={true} 
          onClick={closeMobileMenu}
        />
        {user?.role === 'reviewer' && (
          <NavItem 
            icon="vote-icon.svg" 
            label="Reviewer Test" 
            href="/reviewer-tests"
            active={pathname?.startsWith('/reviewer-tests') || false} 
            multiline={true} 
            onClick={closeMobileMenu}
          />
        )}
        <NavItem 
          icon="document-icon.svg" 
          label="Process Documentation" 
          href="/processes"
          active={pathname === '/processes'} 
          multiline={true} 
          onClick={closeMobileMenu}
        />
        <NavItem 
          icon="support-icon.svg" 
          label="Contact & Support" 
          href="/support"
          active={pathname === '/support'} 
          multiline={true} 
          onClick={closeMobileMenu}
        />
        {user?.role === 'admin' && (
          <NavItem 
            icon="admin-icon.svg" 
            label="Admin Management" 
            href="/admin-management"
            active={pathname === '/admin-management'} 
            multiline={true} 
            onClick={closeMobileMenu}
          />
        )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
