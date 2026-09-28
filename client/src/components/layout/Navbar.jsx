import React from 'react';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800 z-50 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        {/* Logo acting as the brand text and Home button */}
        <a href="#hero" className="flex items-center transition-opacity hover:opacity-80">
          <img src="/logo.png" alt="Declaraform Logo" className="h-10 md:h-12 w-auto object-contain" />
        </a>

        {/* Navigation Links */}
        <div className="flex items-center gap-5 md:gap-8 text-sm font-semibold text-slate-300">
          <a href="#generator" className="hover:text-teal-400 transition-colors hidden md:block">Generator</a>
          <a href="#about" className="hover:text-teal-400 transition-colors hidden md:block">About</a>
          <a href="#contact" className="hover:text-teal-400 transition-colors hidden md:block">Contact</a>
          
          <span className="px-4 py-1.5 bg-slate-900 text-slate-400 rounded-full text-xs font-bold cursor-not-allowed border border-slate-700 flex items-center gap-2 transition-colors hover:border-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            Merge PDF (Soon)
          </span>
        </div>
      </div>
    </nav>
  );
}