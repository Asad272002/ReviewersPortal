const HeroSection = () => {
  return (
    <div className="w-full py-6 sm:py-8 px-2 mb-4 sm:mb-6 animate-fadeIn">
      <h1 className="font-montserrat font-bold text-2xl sm:text-3xl lg:text-4xl text-white mb-2 sm:mb-3 relative inline-block">
        Review Circle
        <div className="absolute bottom-0 left-0 w-full h-0.5 sm:h-1 bg-gradient-to-r from-primary to-primary-light rounded-full"></div>
      </h1>
      <p className="font-montserrat font-medium text-lg sm:text-xl lg:text-2xl text-gray-200">
        Your Gateway To <span className="text-primary-light">Proposal Excellence</span>
      </p>
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-[#1A0A3A] rounded-lg border border-[#9D9FA9]">
        <p className="font-montserrat text-sm sm:text-base text-white">
          Welcome to the Reviewers Portal. Here you can access all the resources you need to effectively review proposals.
        </p>
      </div>
    </div>
  );
};

export default HeroSection;