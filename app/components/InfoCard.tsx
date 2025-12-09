import Image from 'next/image';
import Link from 'next/link';

interface InfoCardProps {
  title: string;
  icon: string;
  content: string[];
  linkText: string;
  linkHref: string;
}

const InfoCard = ({ title, icon, content, linkText, linkHref }: InfoCardProps) => {
  return (
    <div className="bg-[#1A0A3A] hover:bg-[#2A1A4A] border border-[#9D9FA9] rounded-xl p-4 sm:p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 group cursor-pointer hover-lift">
      <div className="w-full">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-primary/20 group-hover:bg-primary/30 transition-colors">
            <Image 
              src={`/icons/${icon}`} 
              alt={title} 
              width={20} 
              height={20} 
              className="sm:w-6 sm:h-6 text-primary-light"
            />
          </div>
          <h3 className="font-montserrat font-semibold text-lg sm:text-xl text-white group-hover:text-white transition-colors">{title}</h3>
        </div>
        
        <div className="mb-4 sm:mb-6 space-y-1.5 sm:space-y-2">
          {content.map((line, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-light mt-1.5 sm:mt-2 flex-shrink-0"></div>
              <p className="font-montserrat text-sm sm:text-base text-gray-200 group-hover:text-white transition-colors">{line}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="self-end text-right">
        <Link 
          href={linkHref} 
          className="inline-flex items-center gap-1.5 sm:gap-2 font-montserrat text-sm sm:text-base text-primary-light hover:text-white transition-colors group-hover:translate-x-1 duration-300"
        >
          <span>{linkText}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-4 sm:h-4">
            <path d="M5 12h14"></path>
            <path d="m12 5 7 7-7 7"></path>
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default InfoCard;