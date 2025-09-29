import Image from 'next/image';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="flex flex-col md:flex-row justify-between items-center py-4 sm:py-6 px-4 sm:px-6 lg:px-8 w-full border-t border-border-color bg-background-light">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 md:mb-0">
        <div className="w-5 h-5 sm:w-6 sm:h-6 relative flex items-center justify-center">
          <Image 
            src="/icons/help-icon.svg" 
            alt="Deep Funding" 
            width={18}
            height={18}
            className="sm:w-5 sm:h-5 text-text-secondary"
          />
        </div>
        <span className="font-montserrat text-xs sm:text-sm text-text-secondary text-center md:text-left">
          © {currentYear} Deep Funding Review Circle
        </span>
      </div>
    </footer>
  );
};

export default Footer;