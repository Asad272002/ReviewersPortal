const HeroSection = () => {
  return (
    <div className="w-full py-8 sm:py-10 px-4 mb-8 relative overflow-hidden rounded-3xl animate-fadeIn">
      {/* Background Gradient & Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1A0A3A]/80 to-[#0C021E]/80 backdrop-blur-md border border-white/5 rounded-3xl z-0"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="font-montserrat font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-3 tracking-tight">
            Review Circle
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-blue-400 text-lg sm:text-xl lg:text-2xl mt-1 font-medium tracking-normal">
              Internal Portal
            </span>
          </h1>
          
          <p className="font-montserrat text-gray-300 text-lg sm:text-xl leading-relaxed max-w-lg">
            Your Gateway To <span className="text-white font-semibold border-b-2 border-primary/50">Proposal Excellence</span>
          </p>
        </div>

        <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm max-w-md w-full shadow-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/20 rounded-lg text-primary-light">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <p className="font-montserrat text-sm text-gray-200 leading-relaxed">
              Welcome to the Reviewers Portal. Access resources, submit reports, and collaborate efficiently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;