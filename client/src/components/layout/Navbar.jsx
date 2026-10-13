import React, { useEffect, useState } from 'react';

const NAV_LINKS = [
  { id: 'generator', label: 'Generator', tab: 'individual' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
];

// Pass setActiveTab as a prop
export default function Navbar({ setActiveTab }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  // Compact, more solid navbar once the user scrolls away from the top.
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlight the link of the section currently in the middle of the viewport.
  useEffect(() => {
    const sections = ['hero', ...NAV_LINKS.map(l => l.id)]
      .map(id => document.getElementById(id))
      .filter(Boolean);
    if (sections.length === 0 || !('IntersectionObserver' in window)) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      // A thin band around the vertical center of the screen.
      { rootMargin: '-45% 0px -50% 0px' }
    );

    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 w-full backdrop-blur-md border-b z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-950/95 border-slate-700/80 shadow-lg shadow-black/30'
          : 'bg-slate-950/90 border-slate-800 shadow-sm'
      }`}
    >
      <div
        className={`max-w-[1400px] mx-auto px-4 md:px-8 flex justify-between items-center transition-all duration-300 ${
          isScrolled ? 'py-2' : 'py-4'
        }`}
      >
        <a href="#hero" className="flex items-center transition-opacity hover:opacity-80">
          <img
            src="/logo.png"
            alt="Declaraform Logo"
            className={`w-auto object-contain transition-all duration-300 ${
              isScrolled ? 'h-8 md:h-10' : 'h-10 md:h-12'
            }`}
          />
        </a>

        <div className="flex items-center gap-5 md:gap-8 text-sm font-semibold text-slate-300">
          {NAV_LINKS.map(link => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={link.tab ? () => setActiveTab(link.tab) : undefined}
                aria-current={isActive ? 'true' : undefined}
                className={`relative transition-colors hidden md:block hover:text-teal-400 ${
                  isActive ? 'text-teal-400' : ''
                }`}
              >
                {link.label}
                {/* Animated underline for the active section */}
                <span
                  className={`absolute left-0 -bottom-1.5 h-0.5 w-full rounded-full bg-teal-400 origin-left transition-transform duration-300 ${
                    isActive ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </a>
            );
          })}
          
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