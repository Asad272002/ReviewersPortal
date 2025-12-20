import React from 'react';

interface AdminActionCardProps {
  title: string;
  description: string;
  icon: string; // Emoji or SVG path
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
}

const AdminActionCard: React.FC<AdminActionCardProps> = ({ 
  title, 
  description, 
  icon, 
  onClick,
  variant = 'primary' 
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300
        border border-[#9D9FA9]/30 backdrop-blur-md
        hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20
        ${variant === 'primary' ? 'bg-[#1A0A3A]/80 hover:bg-[#2A1A4A]/90' : ''}
        ${variant === 'secondary' ? 'bg-[#0C021E]/80 hover:bg-[#1A0A3A]/90' : ''}
        ${variant === 'accent' ? 'bg-gradient-to-br from-[#9050E9]/20 to-[#1A0A3A]/80 border-[#9050E9]/50' : ''}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <span className="text-3xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
            {icon}
          </span>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
        </div>
        
        <h3 className="font-montserrat font-bold text-lg text-white mb-2 group-hover:text-primary-light transition-colors">
          {title}
        </h3>
        
        <p className="font-montserrat text-sm text-gray-400 group-hover:text-gray-200 transition-colors leading-relaxed">
          {description}
        </p>
      </div>
    </button>
  );
};

export default AdminActionCard;
