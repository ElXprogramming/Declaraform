import React from 'react';

// Pass setActiveTab as a prop
export default function Navbar({ setActiveTab }) {
  return (
    <nav className="fixed top-0 left-0 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800 z-50 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <a href="#hero" className="flex items-center transition-opacity hover:opacity-80">
          <img src="/logo.png" alt="Declaraform Logo" className="h-10 md:h-12 w-auto object-contain" />
        </a>

        <div className="flex items-center gap-5 md:gap-8 text-sm font-semibold text-slate-300">
          <a href="#generator" onClick={() => setActiveTab('individual')} className="hover:text-teal-400 transition-colors hidden md:block">Generator</a>
          <a href="#about" className="hover:text-teal-400 transition-colors hidden md:block">About</a>
          <a href="#contact" className="hover:text-teal-400 transition-colors hidden md:block">Contact</a>
          
          {/* Changed from inactive span to a functioning anchor tag */}
          <a 
            href="#generator" 
            onClick={() => setActiveTab('merge')}
            className="px-4 py-1.5 bg-teal-500/10 text-teal-400 rounded-full text-xs font-bold border border-teal-500/30 flex items-center gap-2 transition-colors hover:bg-teal-500/20"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]"></span>
            Merge PDF
          </a>
        </div>
      </div>
    </nav>
  );
}