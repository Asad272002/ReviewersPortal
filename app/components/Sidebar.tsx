'use client';

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
}

const NavItem = ({ icon, label, href, active = false, multiline = false }: NavItemProps) => {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-4 py-3 px-4 w-full rounded-lg transition-all duration-300 transform ${active 
        ? 'bg-card-bg-hover text-primary-light' 
        : 'text-text-secondary hover:bg-card-bg hover:text-white hover:translate-x-1 hover:shadow-md'}`}
    >
      <div className={`w-6 h-6 flex items-center justify-center ${active ? 'text-primary-light' : 'text-text-secondary'}`}>
        <Image 
          src={`/icons/${icon}`} 
          alt={label} 
          width={20} 
          height={20} 
          className={`transition-all duration-300 ${active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
        />
      </div>
      <span className={`font-montserrat text-xl ${multiline ? 'leading-tight' : ''} transition-colors duration-300`}>
        {label}
      </span>
    </Link>
  );
};

const Sidebar = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  
  return (
    <aside className="flex flex-col gap-2 py-6 px-4 w-[280px] h-auto min-h-[calc(100vh-80px)] border-r border-border-color bg-background shadow-lg">
      <div className="mb-6 px-4">
        <h2 className="font-montserrat font-bold text-2xl text-primary-light mb-1">Review Circle</h2>
        <p className="font-montserrat text-sm text-text-secondary">Reviewer Portal</p>
      </div>
      
      <NavItem 
        icon="dashboard-icon.svg" 
        label="Dashboard" 
        href="/"
        active={pathname === '/'} 
      />
      <NavItem 
        icon="announcements-icon.svg" 
        label="Announcements" 
        href="/announcements"
        active={pathname === '/announcements'} 
      />
      <NavItem 
        icon="documents-icon.svg" 
        label="Requirement Documents" 
        href="/documents"
        active={pathname === '/documents'} 
        multiline={true} 
      />
      <NavItem 
        icon="resources-icon.svg" 
        label="Resources" 
        href="/resources"
        active={pathname === '/resources'} 
      />
      <NavItem 
        icon="guides-icon.svg" 
        label="Guides" 
        href="/guides"
        active={pathname === '/guides'} 
      />
      <NavItem 
        icon="vote-icon.svg" 
        label="Vote for Proposals" 
        href="/vote-proposals"
        active={pathname === '/vote-proposals'} 
        multiline={true} 
      />
      <NavItem 
        icon="document-icon.svg" 
        label="Process Documentation" 
        href="/processes"
        active={pathname === '/processes'} 
        multiline={true} 
      />
      <NavItem 
        icon="support-icon.svg" 
        label="Contact & Support" 
        href="/support"
        active={pathname === '/support'} 
        multiline={true} 
      />
      {user?.role === 'admin' && (
        <NavItem 
          icon="admin-icon.svg" 
          label="Admin Management" 
          href="/admin-management"
          active={pathname === '/admin-management'} 
          multiline={true} 
        />
      )}
      
      <div className="mt-auto pt-6 border-t border-border-color">
        <div className="px-4 py-3 bg-card-bg rounded-lg">
          <h3 className="font-montserrat font-medium text-white text-sm mb-2">Need Help?</h3>
          <p className="font-montserrat text-text-secondary text-xs mb-3">Contact support for assistance with the portal.</p>
          <Link href="/support" className="font-montserrat text-sm text-primary-light hover:text-primary hover:underline transition-colors duration-300 inline-block hover:translate-x-1 hover-scale">
            Get Support
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;