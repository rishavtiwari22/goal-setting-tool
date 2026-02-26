import { Stars, Sparkles } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 shrink-0 w-full border-b border-gray-200 bg-white">
      <div className="w-full h-14 flex items-center px-4 md:px-6">
        {/* Logo — left */}
        <img 
          src="/assets/image 1.svg" 
          alt="Logo" 
          className="h-7 md:h-8 w-auto object-contain cursor-pointer shrink-0"
          onClick={() => (window.location.href = "https://app.zuvy.org")}
        />

        {/* Nav Text — centered absolutely */}
        <h1 className="absolute left-1/2 -translate-x-1/2 text-sm md:text-base font-semibold text-gray-800 whitespace-nowrap">
          Zoe: Your Learning Assistant
        </h1>
      </div>
    </header>
  );
}
