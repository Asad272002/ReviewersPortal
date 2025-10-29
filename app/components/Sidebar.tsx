'use client';

import { useState } from 'react';
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
      className={`flex items-center gap-3 sm:gap-4 py-2.5 sm:py-3 px-3 sm:px-4 w-full rounded-lg transition-all duration-300 transform ${active 
        ? 'bg-card-bg-hover text-primary-light' 
        : 'text-text-secondary hover:bg-card-bg hover:text-white hover:translate-x-1 hover:shadow-md'}`}
    >
      <div className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center ${active ? 'text-primary-light' : 'text-text-secondary'}`}>
        <Image 
          src={`/icons/${icon}`} 
          alt={label} 
          width={18} 
          height={18} 
          className={`sm:w-5 sm:h-5 transition-all duration-300 ${active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
        />
      </div>
      <span className={`font-montserrat text-base sm:text-xl ${multiline ? 'leading-tight' : ''} transition-colors duration-300`}>
        {label}
      </span>
    </Link>
  );
};

const Sidebar = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };
  
  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card-bg border border-border-color rounded-lg shadow-lg"
      >
        <div className="w-6 h-6 flex flex-col justify-center items-center">
          <span className={`block w-5 h-0.5 bg-text-secondary transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1' : '-translate-y-1'}`}></span>
          <span className={`block w-5 h-0.5 bg-text-secondary transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
          <span className={`block w-5 h-0.5 bg-text-secondary transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1' : 'translate-y-1'}`}></span>
        </div>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMobileMenu}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative top-0 left-0 z-40 lg:z-auto
        flex flex-col gap-2 py-4 sm:py-6 px-3 sm:px-4 
        w-64 sm:w-[280px] h-full lg:h-auto lg:min-h-[calc(100vh-80px)] 
        border-r border-border-color bg-background shadow-lg
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="mb-4 sm:mb-6 px-2 sm:px-4">
          <h2 className="font-montserrat font-bold text-xl sm:text-2xl text-primary-light mb-1">Review Circle</h2>
          <p className="font-montserrat text-xs sm:text-sm text-text-secondary">Reviewer Portal</p>
        </div>
        
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
        <NavItem 
          icon="announcements-icon.svg" 
          label="Announcements" 
          href="/announcements"
          active={pathname === '/announcements'} 
          onClick={closeMobileMenu}
        />
        <NavItem 
          icon="documents-icon.svg" 
          label="Requirement Documents" 
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
      </aside>
    </>
  );
};

export default Sidebar;