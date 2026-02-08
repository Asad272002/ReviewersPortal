import Image from 'next/image';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface InfoCardProps {
  title: string;
  icon?: string;
  LucideIcon?: LucideIcon;
  content: string[];
  linkText: string;
  linkHref: string;
}

const InfoCard = ({ title, icon, LucideIcon, content, linkText, linkHref }: InfoCardProps) => {
  return (
    <div className="relative group bg-[#1A0A3A]/40 backdrop-blur-md border border-[#9D9FA9]/30 rounded-2xl p-6 transition-all duration-300 hover:bg-[#2A1A4A]/60 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-purple-900/40 border border-primary/20 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-primary/5">
            {LucideIcon ? (
              <LucideIcon className="w-6 h-6 text-primary-light drop-shadow-[0_0_8px_rgba(144,80,233,0.5)]" />
            ) : icon ? (
              <Image 
                src={`/icons/${icon}`} 
                alt={title} 
                width={24} 
                height={24} 
                className="text-primary-light drop-shadow-[0_0_8px_rgba(144,80,233,0.5)]"
              />
            ) : null}
          </div>
          <h3 className="font-montserrat font-bold text-xl text-white tracking-wide group-hover:text-primary-light transition-colors">{title}</h3>
        </div>
        
        <div className="mb-6 space-y-3 flex-grow">
          {content.map((line, index) => (
            <div key={index} className="flex items-start gap-3 group/item">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0 group-hover/item:bg-primary-light group-hover/item:shadow-[0_0_8px_rgba(144,80,233,0.8)] transition-all"></div>
              <p className="font-montserrat text-sm text-gray-300 group-hover:text-white transition-colors leading-relaxed">{line}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-auto pt-4 border-t border-white/5">
          <Link 
            href={linkHref} 
            className="inline-flex items-center gap-2 font-montserrat text-sm font-semibold text-primary-light hover:text-white transition-all group/link"
          >
            <span className="relative">
              {linkText}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover/link:w-full"></span>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover/link:translate-x-1">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default InfoCard;