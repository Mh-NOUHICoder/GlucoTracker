import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-medical-black/80 backdrop-blur-md">
      <div className="relative flex flex-col items-center justify-center space-y-12 transition-all">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96 bg-medical-cyan/25 rounded-full blur-[80px] animate-pulse pointer-events-none"></div>
        
        {/* Logo Animation Container */}
        <div className="relative w-40 h-40 md:w-56 md:h-56 flex items-center justify-center">
          {/* Rotating borders */}
          <div className="absolute inset-0 border-2 border-medical-cyan/30 rounded-full animate-[spin_4s_linear_infinite]" />
          <div className="absolute inset-3 border-t-2 border-medical-cyan/60 rounded-full animate-[spin_3s_linear_infinite_reverse]" />
          <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-medical-cyan/15" style={{ animationDuration: '2.5s' }} />

          {/* Logo Image */}
          <div className="relative w-28 h-28 md:w-40 md:h-40 animate-pulse drop-shadow-[0_0_20px_rgba(6,182,212,0.7)]">
            <Image
              src="/glucotracker.png"
              alt="GlucoTrack Loading"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Loading Text */}
        <div className="flex flex-col items-center space-y-5 z-10 text-center">
          <div className="flex items-center space-x-3">
            <span className="text-3xl md:text-5xl tracking-widest font-bold bg-clip-text text-transparent bg-gradient-to-r from-medical-cyan via-blue-400 to-medical-cyan animate-gradient-x">
              Loading
            </span>
            <div className="flex space-x-2.5 mt-2 justify-center">
              <div className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-medical-cyan shadow-[0_0_10px_rgba(6,182,212,0.5)] animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-medical-cyan shadow-[0_0_10px_rgba(6,182,212,0.5)] animate-bounce" style={{ animationDelay: '200ms' }}></div>
              <div className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-medical-cyan shadow-[0_0_10px_rgba(6,182,212,0.5)] animate-bounce" style={{ animationDelay: '400ms' }}></div>
            </div>
          </div>
          <p className="text-base md:text-xl text-gray-400 font-light tracking-wide animate-pulse mt-6">
             Initializing secure environment...
          </p>
        </div>
      </div>
    </div>
  );
}
