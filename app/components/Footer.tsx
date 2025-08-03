import Image from 'next/image';
import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="flex flex-col md:flex-row justify-between items-center py-6 px-8 w-full border-t border-border-color bg-background-light">
      <div className="flex items-center gap-3 mb-4 md:mb-0">
        <div className="w-6 h-6 relative flex items-center justify-center">
          <Image 
            src="/icons/help-icon.svg" 
            alt="Deep Funding" 
            width={20}
            height={20}
            className="text-text-secondary"
          />
        </div>
        <span className="font-montserrat text-sm text-text-secondary">
          © {currentYear} Deep Funding Review Circle
        </span>
      </div>
      
      <div className="flex items-center gap-6">
        <Link href="#" className="font-montserrat text-sm text-text-secondary hover:text-primary-light transition-all duration-300 hover:underline transform hover:translate-y-[-2px] inline-block">
          Terms of Service
        </Link>
        <Link href="#" className="font-montserrat text-sm text-text-secondary hover:text-primary-light transition-all duration-300 hover:underline transform hover:translate-y-[-2px] inline-block">
          Privacy Policy
        </Link>
        <Link href="#" className="font-montserrat text-sm text-text-secondary hover:text-primary-light transition-all duration-300 hover:underline transform hover:translate-y-[-2px] inline-block">
          Cookie Policy
        </Link>
      </div>
    </footer>
  );
};

export default Footer;