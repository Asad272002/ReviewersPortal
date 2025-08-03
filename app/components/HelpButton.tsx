import Image from 'next/image';

const HelpButton = () => {
  return (
    <button 
      className="fixed bottom-8 left-8 w-10 h-10 rounded-full bg-primary hover:bg-primary-light flex items-center justify-center shadow-button transition-all duration-300 group transform hover:scale-110 hover:rotate-12 hover:shadow-glow"
      aria-label="Help"
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <Image 
          src="/icons/help-icon.svg" 
          alt="Help" 
          width={20} 
          height={20} 
          className="text-white transition-all duration-300 transform group-hover:scale-110 group-hover:rotate-[-12deg]"
        />
      </div>
    </button>
  );
};

export default HelpButton;