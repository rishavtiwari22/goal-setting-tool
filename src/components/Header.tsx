import { Stars, Sparkles } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 shrink-0 w-full border-b border-slate-200 bg-white/90 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-4 md:px-12">
        {/* Logo Left */}
        <div className="flex justify-start md:-ml-30">
          <img 
            src="/assets/image 1.svg" 
            alt="Logo" 
            className="h-7 md:h-8 w-auto object-contain cursor-pointer"
            onClick={() => (window.location.href = "https://app.zuvy.org")}
          />
        </div>

        {/* Centered Text */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
          <Stars className="text-yellow-400 fill-yellow-400 animate-pulse" size={22} />
          <h1 className="text-sm md:text-base font-bold text-slate-800 tracking-tight leading-tight whitespace-nowrap">
            Zoe: Your Learning Assistant
          </h1>
          <Sparkles className="text-blue-400" size={20} />
        </div>

        {/* Right Spacer */}
        <div className="w-8" />
      </div>
    </header>
  );
}
