const HeroSection = () => {
  return (
    <div className="w-full py-8 px-2 mb-6 animate-fadeIn">
      <h1 className="font-montserrat font-bold text-4xl text-white mb-3 relative inline-block">
        Review Circle
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-light rounded-full"></div>
      </h1>
      <p className="font-montserrat font-medium text-2xl text-gray-200">
        Your Gateway To <span className="text-primary-light">Proposal Excellence</span>
      </p>
      <div className="mt-6 p-4 bg-[#1A0A3A] rounded-lg border border-[#9D9FA9]">
        <p className="font-montserrat text-white">
          Welcome to the Reviewers Portal. Here you can access all the resources you need to effectively review proposals.
        </p>
      </div>
    </div>
  );
};

export default HeroSection;