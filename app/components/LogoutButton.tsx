'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const LogoutButton = () => {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <button 
      onClick={handleLogout}
      className="fixed bottom-8 right-8 flex items-center gap-2 py-2 px-4 rounded-lg bg-background-light hover:bg-card-bg border border-border-color shadow-button transition-all duration-300 group transform hover:-translate-y-1 hover:shadow-lg hover-glow"
      aria-label="Logout"
    >
      <div className="w-5 h-5 relative flex items-center justify-center">
        <Image 
          src="/icons/logout-icon.svg" 
          alt="Logout" 
          width={18} 
          height={18} 
          className="text-text-secondary group-hover:text-primary-light transition-all duration-300 transform group-hover:rotate-12"
        />
      </div>
      <span className="font-montserrat text-text-secondary group-hover:text-primary-light transition-all duration-300">
        Log out
      </span>
    </button>
  );
};

export default LogoutButton;