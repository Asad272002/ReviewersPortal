'use client';

import Image from 'next/image';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title?: string;
}

const Header = ({ title = 'Dashboard' }: HeaderProps) => {
  const { user } = useAuth();
  
  return (
    <header className="flex justify-between items-center py-4 px-6 w-full bg-card-bg border-b border-border-color shadow-sm transition-all">
      <div className="flex items-center gap-4">
        <h1 className="font-montserrat font-medium text-3xl text-primary-light">{title}</h1>
      </div>
      
      <div className="flex items-center gap-6">
        {user && (
          <div className="flex items-center gap-3">
            <span className="font-montserrat text-text-secondary text-lg hover:text-white transition-colors duration-300 hover:scale-105 inline-block">
              {user.name}
            </span>
            <div className="h-6 w-[1px] bg-border-color"></div>
          </div>
        )}
        
        <div className="relative group">
          <div className="p-2 rounded-full hover:bg-background-light transition-all duration-300 cursor-pointer transform hover:scale-110 hover:shadow-glow">
            <Image 
              src="/icons/profile-icon.svg" 
              alt="Profile" 
              width={30} 
              height={35} 
              className="opacity-80 group-hover:opacity-100 transition-opacity duration-300"
            />
            <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-error border-2 border-background animate-pulse"></div>
          </div>
        </div>
        
        <div className="relative group">
          <div className="p-2 rounded-full hover:bg-background-light transition-all duration-300 cursor-pointer transform hover:scale-110 hover:shadow-glow">
            <Image 
              src="/icons/notification-icon.svg" 
              alt="Notifications" 
              width={40} 
              height={40} 
              className="text-primary opacity-80 group-hover:opacity-100 transition-opacity duration-300"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;